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

    override func configuration(shielding application: ApplicationToken) -> ShieldConfiguration {
        buildConfig()
    }

    override func configuration(shielding category: ActivityCategoryToken) -> ShieldConfiguration {
        buildConfig()
    }

    override func configuration(shielding webDomain: WebDomainToken) -> ShieldConfiguration {
        buildConfig()
    }
}
