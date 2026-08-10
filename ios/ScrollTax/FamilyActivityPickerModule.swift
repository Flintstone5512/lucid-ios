import Foundation
import React
import FamilyControls
import SwiftUI

@objc(FamilyActivityPickerModule)
class FamilyActivityPickerModule: NSObject, RCTBridgeModule {

  static func moduleName() -> String! { "FamilyActivityPickerModule" }
  static func requiresMainQueueSetup() -> Bool { false }

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

  // Tokens from JS are opaque and can't be reconstructed — selection must come from the native picker.
  @objc func saveSelectedApps(
    _ tokens: NSArray,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(["ok": true])
  }

  @objc func getSelectedApps(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(["ok": true, "hasSelection": ScreenTimeService.shared.hasSelection()])
  }
}
