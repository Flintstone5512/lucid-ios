package com.yourapp.scrolltax

import android.content.Intent
import com.facebook.react.bridge.*

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

    promise.resolve(mapOf("ok" to true))
  } catch (e: Exception) {
    promise.reject("SHOW_OVERLAY_ERROR", e)
  }
}

  @ReactMethod
  fun hideBlockingOverlay(promise: Promise) {
    try {
      BlockingOverlayActivity.finishIfOpen()
      promise.resolve(mapOf("ok" to true))
    } catch (e: Exception) {
      promise.reject("HIDE_OVERLAY_ERROR", e)
    }
  }
}