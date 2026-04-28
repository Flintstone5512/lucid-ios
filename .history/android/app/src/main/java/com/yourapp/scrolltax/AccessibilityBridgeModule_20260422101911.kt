package com.yourapp.scrolltax


import android.content.Intent
import android.provider.Settings
import android.text.TextUtils
import com.facebook.react.bridge.*

class AccessibilityBridgeModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AccessibilityBridgeModule"

  @ReactMethod
  fun isAccessibilityEnabled(promise: Promise) {
    try {
      val serviceId = "${reactContext.packageName}/${ScrollAccessibilityService::class.java.name}"
      val enabledServices = Settings.Secure.getString(
        reactContext.contentResolver,
        Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
      ) ?: ""

      val enabled = enabledServices.contains(serviceId, ignoreCase = true)

      promise.resolve(
        mapOf(
          "ok" to true,
          "enabled" to enabled
        )
      )
    } catch (e: Exception) {
      promise.reject("ACCESSIBILITY_STATUS_ERROR", e)
    }
  }

  @ReactMethod
  fun openAccessibilitySettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
      promise.resolve(mapOf("ok" to true))
    } catch (e: Exception) {
      promise.reject("ACCESSIBILITY_SETTINGS_ERROR", e)
    }
  }
}