package com.yourapp.scrolltax

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

// ✅ ONLY IMPORT REAL MODULES
import com.yourapp.scrolltax.BlockingOverlayModule
import com.yourapp.scrolltax.AccessibilityBridgeModule
import com.yourapp.scrolltax.UsageAccessModule
import com.yourapp.scrolltax.OverlayPermissionModule

class ScrollTaxPackage : ReactPackage {

  override fun createNativeModules(
    reactContext: ReactApplicationContext
  ): List<NativeModule> {
    return listOf(
      BlockingOverlayModule(reactContext),
      AccessibilityBridgeModule(reactContext),
      UsageAccessModule(reactContext),
      OverlayPermissionModule(reactContext)
    )
  }

  override fun createViewManagers(
    reactContext: ReactApplicationContext
  ): List<ViewManager<*, *>> {
    return emptyList()
  }
}