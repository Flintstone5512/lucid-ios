package com.yourapp.scrolltax

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.modules.core.DeviceEventManagerModule

class AppDetectionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context?, intent: Intent?) {
    val packageName = intent?.getStringExtra("packageName") ?: return

    val reactContext = (context?.applicationContext as MainApplication)
      .reactNativeHost
      .reactInstanceManager
      .currentReactContext

    reactContext
      ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      ?.emit("SCROLLTAX_APP_DETECTED", mapOf("packageName" to packageName))
  }
}