package com.yourapp.scrolltax

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Process
import android.provider.Settings
import com.facebook.react.bridge.*

class UsageAccessModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "UsageAccessModule"

  @ReactMethod
  fun hasUsageAccess(promise: Promise) {
    try {
      val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
      val mode = appOps.checkOpNoThrow(
        "android:get_usage_stats",
        Process.myUid(),
        reactContext.packageName
      )
      promise.resolve(mapOf("ok" to true, "granted" to (mode == AppOpsManager.MODE_ALLOWED)))
    } catch (e: Exception) {
      promise.reject("USAGE_ACCESS_ERROR", e)
    }
  }

  @ReactMethod
  fun openUsageAccessSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
      promise.resolve(mapOf("ok" to true))
    } catch (e: Exception) {
      promise.reject("USAGE_SETTINGS_ERROR", e)
    }
  }

  @ReactMethod
  fun getForegroundApp(promise: Promise) {
    try {
      val usageStatsManager =
        reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

      val endTime = System.currentTimeMillis()
      val beginTime = endTime - 15_000

      val usageStats = usageStatsManager.queryUsageStats(
        UsageStatsManager.INTERVAL_DAILY,
        beginTime,
        endTime
      )

      val topApp = usageStats
        ?.filter { it.lastTimeUsed > 0 }
        ?.maxByOrNull { it.lastTimeUsed }
        ?.packageName

      promise.resolve(
        mapOf(
          "ok" to true,
          "packageName" to topApp
        )
      )
    } catch (e: Exception) {
      promise.reject("FOREGROUND_APP_ERROR", e)
    }
  }
}