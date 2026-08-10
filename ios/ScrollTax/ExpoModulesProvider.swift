import ExpoModulesCore

@objc(ExpoModulesProvider)
public class ExpoModulesProvider: ModulesProvider {
  public override func getModuleClasses() -> [AnyModule.Type] {
    return [ScreenTimeModule.self]
  }

  public override func getAppDelegateSubscribers() -> [ExpoAppDelegateSubscriber.Type] {
    return []
  }

  public override func getReactDelegateHandlers() -> [ExpoReactDelegateHandlerTupleType] {
    return []
  }

  public override func getAppCodeSignEntitlements() -> AppCodeSignEntitlements {
    return AppCodeSignEntitlements.from(json: #"{}"#)
  }
}
