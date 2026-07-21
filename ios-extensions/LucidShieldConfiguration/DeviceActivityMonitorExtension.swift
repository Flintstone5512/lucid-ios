import DeviceActivity
import FamilyControls
import Foundation
import ManagedSettings

@available(iOS 16, *)
final class DeviceActivityMonitorExtension: DeviceActivityMonitor {

    private let store = ManagedSettingsStore()
    private let appGroupSuite = "group.com.yourapp.scrolltax"

    override func intervalDidStart(for activity: DeviceActivityName) {
        applyShield()
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        // Intentionally empty — blocking is controlled by the main app (clearShield on study complete).
        // Never auto-clear here; that would lift the block every day at 23:59.
    }

    override func eventDidReachThreshold(
        _ event: DeviceActivityEvent.Name,
        activity: DeviceActivityName
    ) {
        applyShield()
    }

    private func applyShield() {
        guard let defaults = UserDefaults(suiteName: appGroupSuite),
              let data = defaults.data(forKey: "selectedAppsData") else { return }
        guard let selection = try? PropertyListDecoder().decode(
            FamilyActivitySelection.self, from: data
        ) else { return }
        let tokens = selection.applicationTokens
        if !tokens.isEmpty {
            store.shield.applications = tokens
        }
        let categoryTokens = selection.categoryTokens
        if !categoryTokens.isEmpty {
            store.shield.applicationCategories = .specific(categoryTokens)
        }
    }
}
