import Foundation
import React
import FamilyControls
import ManagedSettings
import SwiftUI

// Consolidated module used by services/iosScreenTime.ts
@objc(LucidScreenTimeModule)
class LucidScreenTimeModule: NSObject, RCTBridgeModule {

  static func moduleName() -> String! { "LucidScreenTimeModule" }
  static func requiresMainQueueSetup() -> Bool { false }

  @objc func requestAuthorization(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    Task {
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

  @objc func presentAppPicker(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16, *) else {
      resolve(["ok": false, "error": "App picker requires iOS 16 or later"])
      return
    }

    DispatchQueue.main.async {
      guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
            let root = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController else {
        reject("NO_ROOT_VC", "Cannot find root view controller", nil)
        return
      }

      let pickerView = ScreenTimePickerView(
        onSave: { selection in
          do {
            try ScreenTimeService.shared.saveSelection(selection)
            resolve(["ok": true])
          } catch {
            resolve(["ok": false, "error": error.localizedDescription])
          }
        },
        onCancel: {
          resolve(["ok": false, "cancelled": true])
        }
      )

      let vc = UIHostingController(rootView: pickerView)
      vc.modalPresentationStyle = .pageSheet
      root.present(vc, animated: true)
    }
  }

  @objc func applyShield(
    _ resolve: @escaping RCTPromiseResolveBlock,
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

  @objc func unlockForMinutes(
    _ minutes: Double,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let expiresAt = Date().timeIntervalSince1970 * 1000 + (minutes * 60 * 1000)
    ScreenTimeService.shared.grantUnlock(until: expiresAt)
    resolve(["ok": true, "expiresAt": expiresAt])
  }
}
