import ManagedSettings

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
        completionHandler(.defer)  // brings main app to foreground
    }
}
