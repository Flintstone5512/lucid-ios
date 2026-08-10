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
        // Usage limit hit — clear any active unlock window so forceApplyShield
        // overrides it, then prompt the study session.
        let defaults = UserDefaults(suiteName: appGroupSuite)
        defaults?.removeObject(forKey: "unlockUntil")
        defaults?.synchronize()

        forceApplyShield()
        triggerStudySession()
    }

    // MARK: - Shield

    // Respects the unlock window — used by intervalDidStart (schedule reset).
    private func applyShield() {
        guard let defaults = UserDefaults(suiteName: appGroupSuite) else { return }

        // Don't re-shield if the user is in an active unlock window.
        let unlockUntil = defaults.double(forKey: "unlockUntil")
        if Date().timeIntervalSince1970 * 1000 < unlockUntil { return }

        guard let data = defaults.data(forKey: "selectedAppsData"),
              let selection = try? PropertyListDecoder().decode(
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

    // Ignores unlock window — used by eventDidReachThreshold to override
    // an active unlock when the usage limit is hit.
    private func forceApplyShield() {
        guard let defaults = UserDefaults(suiteName: appGroupSuite),
              let data = defaults.data(forKey: "selectedAppsData"),
              let selection = try? PropertyListDecoder().decode(
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
        // Do NOT set interruptionLevel — .timeSensitive requires a separate Apple
        // entitlement and causes the request to be silently rejected without it.

        let request = UNNotificationRequest(
            identifier: "lucid-session-threshold",
            content: content,
            trigger: nil // deliver immediately
        )
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                // Persist the error so it can be read from the main app for debugging.
                UserDefaults(suiteName: self.appGroupSuite)?.set(
                    error.localizedDescription, forKey: "lastNotifError"
                )
            }
        }
    }
}
