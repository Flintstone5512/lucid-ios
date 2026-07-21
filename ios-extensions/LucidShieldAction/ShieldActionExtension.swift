import Foundation
import ManagedSettings

@available(iOS 16, *)
class ShieldActionExtension: ShieldActionDelegate {

    private let appGroupSuite = "group.com.yourapp.scrolltax"

    override func handle(action: ShieldAction, for application: ApplicationToken,
                         completionHandler: @escaping (ShieldActionResponse) -> Void) {
        respond(to: action, completionHandler: completionHandler)
    }

    override func handle(action: ShieldAction, for webDomain: WebDomainToken,
                         completionHandler: @escaping (ShieldActionResponse) -> Void) {
        respond(to: action, completionHandler: completionHandler)
    }

    private func respond(to action: ShieldAction,
                         completionHandler: @escaping (ShieldActionResponse) -> Void) {
        switch action {
        case .primaryButtonPressed:
            let defaults = UserDefaults(suiteName: appGroupSuite) ?? UserDefaults.standard
            defaults.set(true, forKey: "pendingStudySession")
            defaults.synchronize()
            completionHandler(.defer)  // brings main app to foreground
        case .secondaryButtonPressed:
            completionHandler(.close)
        @unknown default:
            completionHandler(.close)
        }
    }
}
