import DeviceActivity
import FamilyControls
import Foundation
import ManagedSettings
import UserNotifications

@available(iOS 16, *)
final class DeviceActivityMonitorExtension: DeviceActivityMonitor {

    private let store = ManagedSettingsStore()
    private let appGroupSuite = "group.com.yourapp.scrolltax"

    override func intervalDidStart(for activity: DeviceActivityName) {
        // Reapply shield when the daily monitoring interval restarts (e.g. after device reboot).
        // Do NOT send a notification here — the user hasn't hit their limit yet.
        applyShield()
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        // Intentionally empty — blocking is controlled by the main app.
        // Never auto-clear here; that would lift the block at interval end.
    }

    override func eventDidReachThreshold(
        _ event: DeviceActivityEvent.Name,
        activity: DeviceActivityName
    ) {
        // User has hit their usage limit — shield them and prompt the study session.
        applyShield()
        triggerStudySession()
    }

    // MARK: - Shield

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

    // MARK: - Study session trigger

    private func triggerStudySession() {
        let defaults = UserDefaults(suiteName: appGroupSuite)

        // Set the flag that _layout.tsx checks on every foreground — this is
        // the fallback path for users who open Lucid without tapping the notification.
        defaults?.set(true, forKey: "pendingStudySession")
        defaults?.synchronize()

        // Immediate local notification so the user knows what happened while
        // they were scrolling and can tap straight into the session screen.
        let content = UNMutableNotificationContent()
        content.title = "Time's up 🧠"
        content.body = "Complete a quick study session to unlock your apps."
        content.sound = .default
        if #available(iOS 15.0, *) {
            content.interruptionLevel = .timeSensitive
        }

        let request = UNNotificationRequest(
            identifier: "lucid-session-threshold",
            content: content,
            trigger: nil // deliver immediately
        )
        UNUserNotificationCenter.current().add(request)
    }
}
