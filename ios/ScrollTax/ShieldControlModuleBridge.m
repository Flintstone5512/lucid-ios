#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ShieldControlModule, NSObject)

RCT_EXTERN_METHOD(applyShield:(NSArray *)appTokens
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearShield:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(scheduleUnlockWindow:(double)expiresAt
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getUnlockStatus:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
