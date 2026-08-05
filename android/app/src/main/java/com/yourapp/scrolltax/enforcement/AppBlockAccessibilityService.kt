package com.yourapp.scrolltax.enforcement

import android.accessibilityservice.AccessibilityService
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.accessibility.AccessibilityEvent
import com.yourapp.scrolltax.BlockingOverlayActivity

/**
 * Secondary enforcement service that acts as a strict-mode backup blocker.
 *
 * The primary ScrollAccessibilityService handles event-driven blocking via
 * window state changes. This service adds a polling layer using UsageStatsManager
 * so that apps which suppress window events are still caught. It only activates
 * when focusMode == "strict" in SharedPreferences.
 */
class AppBlockAccessibilityService : AccessibilityService() {

  private val trackedPackages = setOf(
    "com.instagram.android",
    "com.zhiliaoapp.musically",
    "com.ss.android.ugc.trill",
    "com.google.android.youtube",
    "com.twitter.android",
    "com.facebook.katana",
    "com.snapchat.android"
  )

  private val handler = Handler(Looper.getMainLooper())
  private var isPolling = false
  private var lastBlockTime = 0L
  private val pollInterval = 1500L
  private val cooldown = 3000L

  private val pollRunnable = object : Runnable {
    override fun run() {
      if (!isPolling) return
      checkForegroundViaUsageStats()
      handler.postDelayed(this, pollInterval)
    }
  }

  override fun onServiceConnected() {
    super.onServiceConnected()
    isPolling = true
    handler.post(pollRunnable)
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null) return
    if (!isStrictMode()) return
    if (isParentWithoutSelfBlock()) return

    val pkg = event.packageName?.toString() ?: return
    if (!trackedPackages.contains(pkg)) return
    if (isUnlocked()) return

    val now = SystemClock.elapsedRealtime()
    if (now - lastBlockTime < cooldown) return
    lastBlockTime = now

    triggerBlock(pkg)
  }

  private fun checkForegroundViaUsageStats() {
    if (!isStrictMode()) return
    if (isParentWithoutSelfBlock()) return
    if (isUnlocked()) return

    val foregroundPkg = getForegroundApp() ?: return
    if (!trackedPackages.contains(foregroundPkg)) return

    val now = SystemClock.elapsedRealtime()
    if (now - lastBlockTime < cooldown) return
    lastBlockTime = now

    triggerBlock(foregroundPkg)
  }

  private fun triggerBlock(packageName: String) {
    val prefs = getSharedPreferences("scrolltax", Context.MODE_PRIVATE)
    prefs.edit().putString("lastBlockedPackage", packageName).apply()

    android.util.Log.d("LUCID_ENFORCE", "Enforcement blocking: $packageName")

    val intent = Intent(this, BlockingOverlayActivity::class.java)
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    intent.putExtra("blockedPackage", packageName)
    startActivity(intent)
  }

  private fun getForegroundApp(): String? {
    return try {
      val usm = getSystemService(USAGE_STATS_SERVICE) as UsageStatsManager
      val now = System.currentTimeMillis()
      val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, now - 10_000, now)
      stats
        ?.filter { it.lastTimeUsed > 0 }
        ?.maxByOrNull { it.lastTimeUsed }
        ?.packageName
    } catch (e: Exception) {
      null
    }
  }

  private fun isStrictMode(): Boolean {
    val prefs = getSharedPreferences("scrolltax", Context.MODE_PRIVATE)
    return prefs.getString("focusMode", "soft") == "strict"
  }

  private fun isParentWithoutSelfBlock(): Boolean {
    val prefs = getSharedPreferences("scrolltax", Context.MODE_PRIVATE)
    val role = prefs.getString("role", "solo") ?: "solo"
    if (role != "parent") return false
    return !prefs.getBoolean("parentSelfBlocking", false)
  }

  private fun isUnlocked(): Boolean {
    val prefs = getSharedPreferences("scrolltax", Context.MODE_PRIVATE)
    return System.currentTimeMillis() < prefs.getLong("unlockUntil", 0L)
  }

  override fun onInterrupt() {}

  override fun onDestroy() {
    isPolling = false
    handler.removeCallbacks(pollRunnable)
    super.onDestroy()
  }
}
