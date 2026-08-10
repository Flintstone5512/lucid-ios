#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(FamilyActivityPickerModule, NSObject)

RCT_EXTERN_METHOD(presentAppPicker:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(saveSelectedApps:(NSArray *)tokens
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getSelectedApps:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
