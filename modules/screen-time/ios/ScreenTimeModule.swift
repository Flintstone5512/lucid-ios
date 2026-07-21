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

        var initialSelection = FamilyActivitySelection()
        if let data = UserDefaults(suiteName: appGroupSuite)?.data(forKey: selectionKey),
           let saved = try? PropertyListDecoder().decode(FamilyActivitySelection.self, from: data) {
          initialSelection = saved
        }

        let coordinator = FamilyPickerCoordinator(selection: initialSelection)
        let vc = UIHostingController(rootView: FamilyPickerContainer(coordinator: coordinator))
        vc.view.backgroundColor = .clear
        vc.modalPresentationStyle = .overCurrentContext

        coordinator.onComplete = { [weak vc] finalSelection in
          if let data = try? PropertyListEncoder().encode(finalSelection) {
            UserDefaults(suiteName: appGroupSuite)?.set(data, forKey: selectionKey)
          }
          promise.resolve(["ok": true])
          vc?.dismiss(animated: true)
        }

        root.present(vc, animated: false)
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
private class FamilyPickerCoordinator: ObservableObject {
  @Published var isPresented = true
  @Published var selection: FamilyActivitySelection
  var onComplete: ((FamilyActivitySelection) -> Void)?

  init(selection: FamilyActivitySelection) {
    self.selection = selection
  }
}

@available(iOS 16, *)
private struct FamilyPickerContainer: View {
  @ObservedObject var coordinator: FamilyPickerCoordinator

  var body: some View {
    Color.clear
      .ignoresSafeArea()
      .familyActivityPicker(
        isPresented: $coordinator.isPresented,
        selection: $coordinator.selection
      )
      .onChange(of: coordinator.isPresented) { newValue in
        if !newValue {
          coordinator.onComplete?(coordinator.selection)
        }
      }
  }
}
