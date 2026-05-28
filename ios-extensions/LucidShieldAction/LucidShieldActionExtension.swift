import ManagedSettings
import UserNotifications

@available(iOS 16, *)
final class LucidShieldActionExtension: ShieldActionDelegate {

    private let appGroupSuite = "group.com.yourapp.scrolltax"

    override func handle(action: ShieldAction,
                         for application: Application,
                         completionHandler: @escaping (ShieldActionResponse) -> Void) {
        triggerStudySession(completionHandler: completionHandler)
    }

    override func handle(action: ShieldAction,
                         for application: Application,
                         in category: ActivityCategory,
                         completionHandler: @escaping (ShieldActionResponse) -> Void) {
        triggerStudySession(completionHandler: completionHandler)
    }

    private func triggerStudySession(completionHandler: @escaping (ShieldActionResponse) -> Void) {
        // Signal main app to navigate to session
        let defaults = UserDefaults(suiteName: appGroupSuite)
        defaults?.set(true, forKey: "pendingSession")
        defaults?.synchronize()

        // Post a notification so the user can tap to open Lucid
        let content = UNMutableNotificationContent()
        content.title = "Time to Study"
        content.body = "Tap here to start your flashcard session and earn your unlock."
        content.sound = .default

        if #available(iOS 15.0, *) {
            content.interruptionLevel = .active
        }

        let request = UNNotificationRequest(
            identifier: "lucid-study-\(Int(Date().timeIntervalSince1970))",
            content: content,
            trigger: nil
        )

        UNUserNotificationCenter.current().add(request) { _ in
            completionHandler(.close)
        }
    }
}
