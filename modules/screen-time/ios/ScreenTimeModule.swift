import ExpoModulesCore
import FamilyControls
import ManagedSettings
import DeviceActivity
import SwiftUI

private let appGroupSuite = "group.com.yourapp.scrolltax"
private let selectionKey = "selectedAppsData"
private let unlockKey = "unlockUntil"

public class ScreenTimeModule: Module {

  private var sharedDefaults: UserDefaults? {
    UserDefaults(suiteName: appGroupSuite)
  }

  // Strong reference keeps the picker window alive until the user dismisses it.
  private var pickerWindow: UIWindow?

  public func definition() -> ModuleDefinition {
    Name("ScreenTimeModule")

    AsyncFunction("requestAuthorization") { () async -> [String: Any] in
      do {
        try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
        return ["ok": true, "status": "approved"]
      } catch {
        return ["ok": false, "status": "denied", "error": error.localizedDescription]
      }
    }

    AsyncFunction("getAuthorizationStatus") { () -> [String: Any] in
      let status: String
      switch AuthorizationCenter.shared.authorizationStatus {
      case .notDetermined: status = "notDetermined"
      case .denied:        status = "denied"
      case .approved:      status = "approved"
      @unknown default:    status = "unknown"
      }
      return ["ok": true, "status": status]
    }

    AsyncFunction("presentAppPicker") { (promise: Promise) in
      guard #available(iOS 16, *) else {
        promise.resolve(["ok": false, "error": "Requires iOS 16+"])
        return
      }

      // Pre-populate the picker with the previously saved selection so
      // the user sees their existing choices already checked.
      let storedData = self.sharedDefaults?.data(forKey: selectionKey)
                    ?? UserDefaults.standard.data(forKey: selectionKey)
      let initialSelection = storedData.flatMap {
        try? PropertyListDecoder().decode(FamilyActivitySelection.self, from: $0)
      } ?? FamilyActivitySelection()

      DispatchQueue.main.async { [weak self] in
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene else {
          promise.resolve(["ok": false, "error": "No window scene"])
          return
        }

        func dismiss(_ window: UIWindow) {
          window.isHidden = true
          self?.pickerWindow = nil
        }

        let window = UIWindow(windowScene: scene)
        window.windowLevel = UIWindow.Level.alert

        let pickerHost = STPickerHost(
          initialSelection: initialSelection,
          onSave: { [weak self] selection in
            dismiss(window)
            let tokens = selection.applicationTokens
            let categoryTokens = selection.categoryTokens
            let store = ManagedSettingsStore()
            if !tokens.isEmpty {
              store.shield.applications = tokens
            }
            if !categoryTokens.isEmpty {
              store.shield.applicationCategories = .specific(categoryTokens)
            }
            UserDefaults.standard.set(true, forKey: "lucid_has_selection")
            if let data = try? PropertyListEncoder().encode(selection) {
              self?.sharedDefaults?.set(data, forKey: selectionKey)
              UserDefaults.standard.set(data, forKey: selectionKey)
            }
            UserDefaults.standard.synchronize()
            self?.sharedDefaults?.synchronize()
            let total = tokens.count + categoryTokens.count
            promise.resolve(["ok": true, "tokenCount": total])
          },
          onCancel: {
            dismiss(window)
            promise.resolve(["ok": false, "cancelled": true])
          }
        )

        window.rootViewController = UIHostingController(rootView: pickerHost)
        window.makeKeyAndVisible()
        self?.pickerWindow = window
      }
    }

    AsyncFunction("hasSelection") { () -> [String: Any] in
      let has = UserDefaults.standard.bool(forKey: "lucid_has_selection")
             || (self.sharedDefaults?.data(forKey: selectionKey) != nil)
             || (UserDefaults.standard.data(forKey: selectionKey) != nil)
      return ["ok": true, "hasSelection": has]
    }

    AsyncFunction("getShieldStatus") { () -> [String: Any] in
      if #available(iOS 16, *) {
        let store = ManagedSettingsStore()
        let appsShielded = (store.shield.applications).map { !$0.isEmpty } ?? false
        let catsShielded: Bool
        switch store.shield.applicationCategories {
        case .none:                        catsShielded = false
        case .some(.all):                  catsShielded = true
        case .some(.specific(let t, _)):   catsShielded = !t.isEmpty
        }
        return ["ok": true, "isShielded": appsShielded || catsShielded]
      }
      return ["ok": false, "isShielded": false]
    }

    AsyncFunction("applyShield") { () -> [String: Any] in
      if #available(iOS 16, *) {
        let store = ManagedSettingsStore()
        let data = self.sharedDefaults?.data(forKey: selectionKey)
               ?? UserDefaults.standard.data(forKey: selectionKey)
        if let data = data,
           let selection = try? PropertyListDecoder().decode(FamilyActivitySelection.self, from: data) {
          let tokens = selection.applicationTokens
          let categoryTokens = selection.categoryTokens
          // Only write when non-empty — an empty write clears the shield.
          if !tokens.isEmpty {
            store.shield.applications = tokens
          }
          if !categoryTokens.isEmpty {
            store.shield.applicationCategories = .specific(categoryTokens)
          }
        }
      }
      return ["ok": true]
    }

    AsyncFunction("clearShield") { () -> [String: Any] in
      let store = ManagedSettingsStore()
      store.shield.applications = nil
      store.shield.applicationCategories = nil
      return ["ok": true]
    }

    AsyncFunction("unlockForMinutes") { (minutes: Double) -> [String: Any] in
      let expiresAt = Date().timeIntervalSince1970 * 1000 + (minutes * 60 * 1000)
      self.sharedDefaults?.set(expiresAt, forKey: unlockKey)
      let store = ManagedSettingsStore()
      store.shield.applications = nil
      store.shield.applicationCategories = nil
      return ["ok": true, "expiresAt": expiresAt]
    }

    AsyncFunction("syncSettings") { (cardsRequired: Int, unlockMinutes: Int, focusMode: String) -> [String: Any] in
      self.sharedDefaults?.set(cardsRequired, forKey: "cardsRequired")
      self.sharedDefaults?.set(unlockMinutes, forKey: "unlockMinutes")
      self.sharedDefaults?.set(focusMode, forKey: "focusMode")
      self.sharedDefaults?.synchronize()
      return ["ok": true]
    }

    AsyncFunction("checkAndClearPendingSession") { () -> [String: Any] in
      let defaults = self.sharedDefaults ?? UserDefaults.standard
      let pending = defaults.bool(forKey: "pendingStudySession")
      if pending {
        defaults.set(false, forKey: "pendingStudySession")
        defaults.synchronize()
      }
      return ["ok": true, "pending": pending]
    }

    // Sets up a DeviceActivity schedule so the monitor extension reapplies the
    // shield on device restart. Starts the interval ~1 minute from now so
    // intervalDidStart fires immediately rather than waiting until midnight.
    AsyncFunction("startMonitoringBlockedApps") { () -> [String: Any] in
      if #available(iOS 16, *) {
        let center = DeviceActivityCenter()
        // Reset the schedule so it always anchors to the current time.
        center.stopMonitoring([.daily])

        let cal = Calendar.current
        let startDate = cal.date(byAdding: .minute, value: 1, to: Date())!
        let endDate   = cal.date(byAdding: .hour,   value: 23, to: startDate)!

        let schedule = DeviceActivitySchedule(
          intervalStart: cal.dateComponents([.hour, .minute], from: startDate),
          intervalEnd:   cal.dateComponents([.hour, .minute], from: endDate),
          repeats: true
        )
        do {
          try center.startMonitoring(.daily, during: schedule)
        } catch {
          // Ignore — not a hard failure
        }
      }
      return ["ok": true]
    }

    AsyncFunction("stopMonitoring") { () -> [String: Any] in
      if #available(iOS 16, *) {
        DeviceActivityCenter().stopMonitoring()
      }
      return ["ok": true]
    }
  }
}

extension DeviceActivityName {
  static let daily = Self("daily")
}

@available(iOS 16, *)
private struct STPickerHost: View {
  let onSave: (FamilyActivitySelection) -> Void
  let onCancel: () -> Void
  @State private var selection: FamilyActivitySelection

  init(initialSelection: FamilyActivitySelection,
       onSave: @escaping (FamilyActivitySelection) -> Void,
       onCancel: @escaping () -> Void) {
    self.onSave = onSave
    self.onCancel = onCancel
    _selection = State(initialValue: initialSelection)
  }

  var body: some View {
    NavigationView {
      FamilyActivityPicker(selection: $selection)
        .navigationTitle("Choose Apps to Block")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .cancellationAction) {
            Button("Cancel") { onCancel() }
          }
          ToolbarItem(placement: .confirmationAction) {
            Button("Save") { onSave(selection) }
          }
        }
    }
    .navigationViewStyle(.stack)
  }
}
