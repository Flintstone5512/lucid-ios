import ManagedSettings
import ManagedSettingsUI
import UIKit

@available(iOS 16, *)
class ShieldConfigurationExtension: ShieldConfigurationDataSource {

    private let bgColor = UIColor(red: 0.04, green: 0.08, blue: 0.16, alpha: 1.0)
    private let accentColor = UIColor(red: 0.85, green: 0.40, blue: 0.20, alpha: 1.0)
    private let dimColor = UIColor(white: 0.65, alpha: 1.0)

    override func configuration(shielding application: Application) -> ShieldConfiguration {
        let name = application.localizedDisplayName ?? "this app"
        return makeConfig(subtitle: "Study flashcards to earn your scroll time for \(name).")
    }

    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        return makeConfig(subtitle: "Study flashcards to earn your scroll time.")
    }

    private func makeConfig(subtitle: String) -> ShieldConfiguration {
        return ShieldConfiguration(
            backgroundBlurStyle: .systemUltraThinMaterialDark,
            backgroundColor: bgColor,
            icon: UIImage(systemName: "brain.head.profile"),
            title: ShieldConfiguration.Label(text: "Time to Focus", color: .white),
            subtitle: ShieldConfiguration.Label(text: subtitle, color: dimColor),
            primaryButtonLabel: ShieldConfiguration.Label(text: "Go Study", color: bgColor),
            primaryButtonBackgroundColor: accentColor,
            secondaryButtonLabel: ShieldConfiguration.Label(text: "Not Now", color: dimColor)
        )
    }
}
