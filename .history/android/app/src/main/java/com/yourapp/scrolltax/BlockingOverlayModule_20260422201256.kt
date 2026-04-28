package com.yourapp.scrolltax

import android.content.Intent
import android.content.Context
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BlockingOverlayModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "BlockingOverlayModule"

  @ReactMethod
  fun showBlockingOverlay(packageName: String, promise: Promise) {
    try {
      val intent = Intent(reactContext, BlockingOverlayActivity::class.java)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      intent.putExtra("blockedPackage", packageName)
      reactContext.startActivity(intent)

      val result = Arguments.createMap().apply {
        putBoolean("ok", true)
      }

      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("SHOW_OVERLAY_ERROR", e)
    }
  }

  @ReactMethod
  fun hideBlockingOverlay(promise: Promise) {
    try {
      BlockingOverlayActivity.finishIfOpen()

      val result = Arguments.createMap().apply {
        putBoolean("ok", true)
      }

      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("HIDE_OVERLAY_ERROR", e)
    }
  }

  @ReactMethod
fun grantUnlockWindow(expiresAt: Double, promise: Promise) {
  try {
    val prefs = reactApplicationContext.getSharedPreferences("scrolltax", Context.MODE_PRIVATE)

    prefs.edit().putLong("unlockUntil", expiresAt.toLong()).apply()

    // 🔥 close overlay immediately if open
    BlockingOverlayActivity.finishIfOpen()

    val map = Arguments.createMap()
        map.putBoolean("ok", true)
        promise.resolve(map)
  } catch (e: Exception) {
    promise.reject("ERROR", e)
  }
}
}