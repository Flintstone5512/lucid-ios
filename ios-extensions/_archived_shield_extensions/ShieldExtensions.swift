// ============================================================
// ARCHIVED — NOT INCLUDED IN BUILD
//
// Apple App Store validation rejects the extension point
// identifiers required for ShieldConfiguration and ShieldAction
// extensions in third-party apps (error 90349):
//
//   com.apple.deviceactivity.shield.configuration  ❌
//   com.apple.deviceactivity.shield.action         ❌
//
// These extensions are preserved here so they can be wired back
// in if Apple ever opens these entitlements to third-party apps
// (similar to how Opal/BeReal have special agreements).
//
// To re-enable: add LucidShieldUI and LucidShieldAction back to
// the EXTENSIONS array in plugins/withShieldExtensions.js and
// split this file back into their respective extension targets.
// ============================================================


// MARK: - ShieldConfiguration (LucidShieldUI target)
// Extension point: com.apple.deviceactivity.shield.configuration
// Shows a custom lock screen when a blocked app is opened.
// Reads cardsRequired and unlockMinutes from shared UserDefaults
// to display personalised copy ("Answer 5 cards to unlock for 30 min").

import ManagedSettings
import ManagedSettingsUI
import UIKit

@available(iOS 16, *)
final class LucidShieldConfigurationExtension: ShieldConfigurationDataSource {

    private let appGroupSuite = "group.com.yourapp.scrolltax"

    private func buildConfig() -> ShieldConfiguration {
        let defaults = UserDefaults(suiteName: appGroupSuite)
        let cards = defaults?.integer(forKey: "cardsRequired") ?? 5
        let minutes = defaults?.integer(forKey: "unlockMinutes") ?? 30

        let darkBlue = UIColor(red: 14/255, green: 20/255, blue: 36/255, alpha: 1)
        let orange   = UIColor(red: 232/255, green: 127/255, blue: 33/255, alpha: 1)
        let muted    = UIColor(red: 169/255, green: 189/255, blue: 219/255, alpha: 1)

        let subtitle = "Answer \(cards) card\(cards == 1 ? "" : "s") to unlock for \(minutes) min"

        return ShieldConfiguration(
            backgroundBlurStyle: .systemUltraThinMaterialDark,
            backgroundColor: darkBlue,
            icon: nil,
            title: ShieldConfiguration.Label(text: "Time to Study", color: .white),
            subtitle: ShieldConfiguration.Label(text: subtitle, color: muted),
            primaryButtonLabel: ShieldConfiguration.Label(text: "Start Study Session", color: .white),
            primaryButtonBackgroundColor: orange
        )
    }

    override func configuration(shielding application: Application) -> ShieldConfiguration {
        buildConfig()
    }

    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        buildConfig()
    }
}


// MARK: - ShieldAction (LucidShieldAction target)
// Extension point: com.apple.deviceactivity.shield.action
// Handles the "Start Study Session" button tap on the shield overlay.
// Sets pendingStudySession = true in shared UserDefaults, then returns
// .defer which causes iOS to bring the main app to the foreground.

@available(iOS 16, *)
final class LucidShieldActionExtension: ShieldActionDelegate {

    private let appGroupSuite = "group.com.yourapp.scrolltax"

    override func handle(action: ShieldAction,
                         for application: ApplicationToken,
                         completionHandler: @escaping (ShieldActionResponse) -> Void) {
        triggerStudySession(completionHandler: completionHandler)
    }

    override func handle(action: ShieldAction,
                         for category: ActivityCategoryToken,
                         completionHandler: @escaping (ShieldActionResponse) -> Void) {
        triggerStudySession(completionHandler: completionHandler)
    }

    override func handle(action: ShieldAction,
                         for webDomain: WebDomainToken,
                         completionHandler: @escaping (ShieldActionResponse) -> Void) {
        triggerStudySession(completionHandler: completionHandler)
    }

    private func triggerStudySession(completionHandler: @escaping (ShieldActionResponse) -> Void) {
        let defaults = UserDefaults(suiteName: appGroupSuite)
        defaults?.set(true, forKey: "pendingStudySession")
        defaults?.synchronize()
        completionHandler(.defer)
    }
}
