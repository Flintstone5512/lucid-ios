import Foundation
import React
import ManagedSettings
import FamilyControls

@objc(ShieldControlModule)
class ShieldControlModule: NSObject, RCTBridgeModule {

  static func moduleName() -> String! { "ShieldControlModule" }
  static func requiresMainQueueSetup() -> Bool { false }

  @objc func applyShield(
    _ appTokens: NSArray,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    ScreenTimeService.shared.applyShield()
    resolve(["ok": true])
  }

  @objc func clearShield(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    ScreenTimeService.shared.clearShield()
    resolve(["ok": true])
  }

  @objc func scheduleUnlockWindow(
    _ expiresAt: Double,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    ScreenTimeService.shared.grantUnlock(until: expiresAt)
    resolve(["ok": true])
  }

  @objc func getUnlockStatus(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(ScreenTimeService.shared.unlockStatus())
  }
}
