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
        store.shield.applications = nil
        store.shield.webDomains = nil
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
        guard !tokens.isEmpty else { return }
        store.shield.applications = tokens
    }
}
