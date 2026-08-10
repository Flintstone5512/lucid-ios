import Foundation
import React
import FamilyControls

@objc(ScreenTimeAuthorizationModule)
class ScreenTimeAuthorizationModule: NSObject, RCTBridgeModule {

  static func moduleName() -> String! { "ScreenTimeAuthorizationModule" }
  static func requiresMainQueueSetup() -> Bool { false }

  @objc func requestAuthorization(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      do {
        try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
        resolve(["ok": true, "status": "approved"])
      } catch {
        resolve(["ok": false, "status": "denied", "error": error.localizedDescription])
      }
    }
  }

  @objc func getAuthorizationStatus(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let status: String
    switch AuthorizationCenter.shared.authorizationStatus {
    case .notDetermined: status = "notDetermined"
    case .denied: status = "denied"
    case .approved: status = "approved"
    @unknown default: status = "unknown"
    }
    resolve(["ok": true, "status": status])
  }
}
