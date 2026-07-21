import DeviceActivity
import Foundation
import ManagedSettings
import UserNotifications

@available(iOS 16, *)
final class DeviceActivityMonitorExtension: DeviceActivityMonitor {

    private let appGroupSuite = "group.com.yourapp.scrolltax"

    override func eventDidReachThreshold(
        _ event: DeviceActivityEvent.Name,
        activity: DeviceActivityName
    ) {
        let defaults = UserDefaults(suiteName: appGroupSuite)
        defaults?.set(true, forKey: "pendingStudySession")
        defaults?.synchronize()

        let content = UNMutableNotificationContent()
        content.title = "Time to Study"
        content.body = "Tap here to start your flashcard session and earn your unlock."
        content.sound = .default

        if #available(iOS 15.0, *) {
            content.interruptionLevel = .active
        }

        let request = UNNotificationRequest(
            identifier: "lucid-study-\(event.rawValue)",
            content: content,
            trigger: nil
        )

        UNUserNotificationCenter.current().add(request)
    }
}
