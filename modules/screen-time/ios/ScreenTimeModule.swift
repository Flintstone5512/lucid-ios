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

      DispatchQueue.main.async {
        guard
          let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
          let root = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController
        else {
          promise.resolve(["ok": false, "error": "Cannot find root view controller"])
          return
        }

        let pickerView = STPickerView(
          onSave: { selection in
            if let data = try? PropertyListEncoder().encode(selection) {
              UserDefaults(suiteName: appGroupSuite)?.set(data, forKey: selectionKey)
            }
            promise.resolve(["ok": true])
          },
          onCancel: {
            promise.resolve(["ok": false, "cancelled": true])
          }
        )

        let vc = UIHostingController(rootView: pickerView)
        vc.modalPresentationStyle = .pageSheet
        root.present(vc, animated: true)
      }
    }

    AsyncFunction("applyShield") { () -> [String: Any] in
      if #available(iOS 16, *) {
        let store = ManagedSettingsStore()
        if let data = UserDefaults(suiteName: appGroupSuite)?.data(forKey: selectionKey),
           let selection = try? PropertyListDecoder().decode(FamilyActivitySelection.self, from: data) {
          store.shield.applications = selection.applicationTokens
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
      UserDefaults(suiteName: appGroupSuite)?.set(expiresAt, forKey: unlockKey)
      let store = ManagedSettingsStore()
      store.shield.applications = nil
      store.shield.applicationCategories = nil
      return ["ok": true, "expiresAt": expiresAt]
    }

    AsyncFunction("syncSettings") { (cardsRequired: Int, unlockMinutes: Int, focusMode: String) -> [String: Any] in
      let defaults = UserDefaults(suiteName: appGroupSuite)
      defaults?.set(cardsRequired, forKey: "cardsRequired")
      defaults?.set(unlockMinutes, forKey: "unlockMinutes")
      defaults?.set(focusMode, forKey: "focusMode")
      defaults?.synchronize()
      return ["ok": true]
    }

    AsyncFunction("checkAndClearPendingSession") { () -> [String: Any] in
      let defaults = UserDefaults(suiteName: appGroupSuite)
      let pending = defaults?.bool(forKey: "pendingSession") ?? false
      if pending {
        defaults?.removeObject(forKey: "pendingSession")
        defaults?.synchronize()
      }
      return ["ok": true, "pending": pending]
    }
  }
}

@available(iOS 16, *)
private struct STPickerView: View {
  @State private var selection = FamilyActivitySelection()
  let onSave: (FamilyActivitySelection) -> Void
  let onCancel: () -> Void

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
  }
}
