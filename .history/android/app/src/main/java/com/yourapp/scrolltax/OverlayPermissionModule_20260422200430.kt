package com.yourapp.scrolltax

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*

class OverlayPermissionModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "OverlayPermissionModule"

  @ReactMethod
  fun hasOverlayPermission(promise: Promise) {
    try {
      val granted =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          Settings.canDrawOverlays(reactContext)
        } else {
          true
        }

      val map = Arguments.createMap()
      map.putBoolean("ok", true)
      map.putBoolean("granted", granted)

      promise.resolve(map) // ✅ FIXED
    } catch (e: Exception) {
      promise.reject("OVERLAY_PERMISSION_ERROR", e)
    }
  }

  @ReactMethod
  fun openOverlaySettings(promise: Promise) {
    try {
      val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:${reactContext.packageName}")
      )
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)

      val map = Arguments.createMap()
      map.putBoolean("ok", true)

      promise.resolve(map) // ✅ FIXED
    } catch (e: Exception) {
      promise.reject("OVERLAY_SETTINGS_ERROR", e)
    }
  }
}