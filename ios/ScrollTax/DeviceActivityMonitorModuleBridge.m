#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(DeviceActivityMonitorModule, NSObject)

RCT_EXTERN_METHOD(startMonitoringBlockedApps:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopMonitoring:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
