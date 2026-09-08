package com.yourapp.scrolltax

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.modules.core.DeviceEventManagerModule

class AppDetectionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context?, intent: Intent?) {
    val packageName = intent?.getStringExtra("packageName") ?: return

    val app = context?.applicationContext as MainApplication

    val reactContext = app
      .reactNativeHost
      .reactInstanceManager
      .currentReactContext

    if (reactContext == null) {
      // 🔥 Avoid crash if React not ready
      return
    }

    val params = com.facebook.react.bridge.Arguments.createMap().apply {
      putString("packageName", packageName)
    }

    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("SCROLLTAX_APP_DETECTED", params)
  }
}