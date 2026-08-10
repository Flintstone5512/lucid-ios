import Foundation
import React
import DeviceActivity
import ManagedSettings

@objc(DeviceActivityMonitorModule)
class DeviceActivityMonitorModule: NSObject, RCTBridgeModule {

  static func moduleName() -> String! { "DeviceActivityMonitorModule" }
  static func requiresMainQueueSetup() -> Bool { false }

  // Sets up a DeviceActivity schedule so the system can fire monitoring events.
  // Full background callbacks require a DeviceActivityMonitor app extension target.
  @objc func startMonitoringBlockedApps(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let center = DeviceActivityCenter()

    // Stop first so we always restart with a fresh schedule anchored to NOW.
    // This makes intervalDidStart fire ~1 minute after this call (the extension
    // then reapplies the shield from shared UserDefaults as a backup), instead
    // of waiting until midnight like the old 00:00 start would.
    center.stopMonitoring([.daily])

    let cal = Calendar.current
    let startDate = cal.date(byAdding: .minute, value: 1, to: Date())!
    let endDate   = cal.date(byAdding: .hour,   value: 23, to: startDate)!

    let schedule = DeviceActivitySchedule(
      intervalStart: cal.dateComponents([.hour, .minute], from: startDate),
      intervalEnd:   cal.dateComponents([.hour, .minute], from: endDate),
      repeats: true
    )

    do {
      try center.startMonitoring(.daily, during: schedule)
      resolve(["ok": true])
    } catch {
      resolve(["ok": true, "info": error.localizedDescription])
    }
  }

  @objc func stopMonitoring(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let center = DeviceActivityCenter()
    center.stopMonitoring()
    resolve(["ok": true])
  }
}

extension DeviceActivityName {
  static let daily = Self("daily")
}
