package com.yourapp.scrolltax

import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.*

class BlockingOverlayModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "BlockingOverlayModule"

  /* =========================
     SETTINGS
  ========================= */
  @ReactMethod
  fun setEnforcementSettings(settings: ReadableMap, promise: Promise) {
    try {
      val prefs =
        reactApplicationContext.getSharedPreferences("scrolltax", Context.MODE_PRIVATE)
      val editor = prefs.edit()

      val role = if (settings.hasKey("role") && !settings.isNull("role")) {
        settings.getString("role")
      } else "solo"

      val enforcementMode =
        if (settings.hasKey("enforcementMode") && !settings.isNull("enforcementMode")) {
          settings.getString("enforcementMode")
        } else "self"

      val focusMode =
        if (settings.hasKey("focusMode") && !settings.isNull("focusMode")) {
          settings.getString("focusMode")
        } else "soft"

      editor.putString("role", role)
      editor.putString("enforcementMode", enforcementMode)
      editor.putString("focusMode", focusMode)

      editor.apply()

      val result = Arguments.createMap()
      result.putBoolean("ok", true)

      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("SETTINGS_ERROR", e)
    }
  }

  @ReactMethod
  fun setEnforcementDecision(settings: ReadableMap, promise: Promise) {
    val block = settings.getBoolean("block")

    val prefs = reactApplicationContext
      .getSharedPreferences("scrolltax", Context.MODE_PRIVATE)

    prefs.edit()
      .putBoolean("lastBlockDecision", block)
      .apply()

    promise.resolve(true)
  }

  /* =========================
     🔥 CLOSE OVERLAY (CRITICAL)
  ========================= */
  @ReactMethod
  fun closeOverlay(promise: Promise) {
    try {
      BlockingOverlayActivity.finishIfOpen()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("CLOSE_OVERLAY_ERROR", e)
    }
  }

  /* =========================
     🔥 GRANT UNLOCK WINDOW
  ========================= */
  @ReactMethod
  fun grantUnlockWindow(epochMs: Double, promise: Promise) {
    try {
      val prefs = reactApplicationContext
        .getSharedPreferences("scrolltax", Context.MODE_PRIVATE)

      prefs.edit()
        .putLong("unlockUntil", epochMs.toLong())
        .apply()

      val result = Arguments.createMap()
      result.putBoolean("ok", true)
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("GRANT_UNLOCK_ERROR", e)
    }
  }

  /* =========================
     🔥 HIDE BLOCKING OVERLAY
  ========================= */
  @ReactMethod
  fun hideBlockingOverlay(promise: Promise) {
    try {
      BlockingOverlayActivity.finishIfOpen()
      val result = Arguments.createMap()
      result.putBoolean("ok", true)
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("HIDE_OVERLAY_ERROR", e)
    }
  }

  /* =========================
     🔥 SHOW BLOCKING OVERLAY
  ========================= */
  @ReactMethod
  fun showBlockingOverlay(packageName: String, promise: Promise) {
    try {
      val prefs = reactApplicationContext
        .getSharedPreferences("scrolltax", Context.MODE_PRIVATE)

      prefs.edit()
        .putString("lastBlockedPackage", packageName)
        .apply()

      val intent = Intent(reactApplicationContext, BlockingOverlayActivity::class.java)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      intent.putExtra("blockedPackage", packageName)
      reactApplicationContext.startActivity(intent)

      val result = Arguments.createMap()
      result.putBoolean("ok", true)
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("SHOW_OVERLAY_ERROR", e)
    }
  }

  /* =========================
     🔥 GET UNLOCK STATUS
  ========================= */
  @ReactMethod
  fun getUnlockStatus(promise: Promise) {
    try {
      val prefs = reactApplicationContext
        .getSharedPreferences("scrolltax", Context.MODE_PRIVATE)

      val expiresAt = prefs.getLong("unlockUntil", 0L)
      val unlocked = System.currentTimeMillis() < expiresAt

      val result = Arguments.createMap()
      result.putBoolean("unlocked", unlocked)
      result.putDouble("expiresAt", expiresAt.toDouble())
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("GET_UNLOCK_ERROR", e)
    }
  }

  /* =========================
     🔥 REOPEN BLOCKED APP
  ========================= */
  @ReactMethod
  fun setParentSelfBlocking(enabled: Boolean, promise: Promise) {
    try {
      val prefs = reactApplicationContext
        .getSharedPreferences("scrolltax", Context.MODE_PRIVATE)
      prefs.edit().putBoolean("parentSelfBlocking", enabled).apply()
      val result = Arguments.createMap()
      result.putBoolean("ok", true)
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("PARENT_SELF_BLOCK_ERROR", e)
    }
  }

  @ReactMethod
  fun getParentSelfBlocking(promise: Promise) {
    try {
      val prefs = reactApplicationContext
        .getSharedPreferences("scrolltax", Context.MODE_PRIVATE)
      val result = Arguments.createMap()
      result.putBoolean("ok", true)
      result.putBoolean("enabled", prefs.getBoolean("parentSelfBlocking", false))
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("PARENT_SELF_BLOCK_ERROR", e)
    }
  }

  @ReactMethod
  fun openLastBlockedApp(promise: Promise) {
    try {
      val prefs = reactApplicationContext
        .getSharedPreferences("scrolltax", Context.MODE_PRIVATE)

      val packageName = prefs.getString("lastBlockedPackage", null)

      if (packageName.isNullOrBlank()) {
        val result = Arguments.createMap()
        result.putBoolean("ok", false)
        result.putString("reason", "No package")
        promise.resolve(result)
        return
      }

      val launchIntent =
        reactApplicationContext.packageManager.getLaunchIntentForPackage(packageName)

      if (launchIntent == null) {
        val result = Arguments.createMap()
        result.putBoolean("ok", false)
        result.putString("reason", "No intent")
        promise.resolve(result)
        return
      }

      launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)

      reactApplicationContext.startActivity(launchIntent)

      // 🔥 FORCE CLOSE OVERLAY AFTER LAUNCH
      BlockingOverlayActivity.finishIfOpen()

      val result = Arguments.createMap()
      result.putBoolean("ok", true)

      promise.resolve(result)

    } catch (e: Exception) {
      promise.reject("OPEN_APP_ERROR", e)
    }
  }
}