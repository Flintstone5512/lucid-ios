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

    // MARK: - Authorization

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

    // MARK: - App Picker

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

        let pickerView = LocalScreenTimePickerView(
          onSave: { [weak self] selection in
            if let data = try? PropertyListEncoder().encode(selection) {
              self?.sharedDefaults?.set(data, forKey: selectionKey)
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

    // MARK: - Shield

    AsyncFunction("applyShield") { () -> [String: Any] in
      if #available(iOS 16, *) {
        let store = ManagedSettingsStore()
        if let data = self.sharedDefaults?.data(forKey: selectionKey),
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
      self.sharedDefaults?.set(expiresAt, forKey: unlockKey)
      let store = ManagedSettingsStore()
      store.shield.applications = nil
      store.shield.applicationCategories = nil
      return ["ok": true, "expiresAt": expiresAt]
    }
  }
}

// MARK: - FamilyActivityPicker SwiftUI View

@available(iOS 16, *)
private struct LocalScreenTimePickerView: View {
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
