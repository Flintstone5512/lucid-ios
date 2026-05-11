package com.yourapp.scrolltax

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import android.content.Intent
import android.os.SystemClock
import android.content.Context

class ScrollAccessibilityService : AccessibilityService() {

  private val trackedPackages = setOf(
    "com.instagram.android",
    "com.zhiliaoapp.musically", // TikTok
    "com.google.android.youtube",
    "com.twitter.android",
    "com.facebook.katana"
  )

  private var lastOverlayTime = 0L
  private val cooldown = 2000 // 🔥 prevent rapid spam triggers

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null) return

    val packageName = event.packageName?.toString() ?: return

    // 🔥 Only track target apps
    if (!trackedPackages.contains(packageName)) return

    val now = SystemClock.elapsedRealtime()

    // 🔥 Cooldown protection
    if (now - lastOverlayTime < cooldown) return
    lastOverlayTime = now

    // 🔥 If user is currently unlocked → do nothing
    if (isUnlocked()) return

    // =========================
    // 🔥 CRITICAL FIX: SAVE LAST BLOCKED APP
    // =========================
    val prefs = getSharedPreferences("scrolltax", Context.MODE_PRIVATE)

    prefs.edit()
      .putString("lastBlockedPackage", packageName)
      .apply()

    // 🔍 Debug (optional but recommended)
    android.util.Log.d("LUCID", "Blocking package: $packageName")

    // =========================
    // 🔥 LAUNCH OVERLAY
    // =========================
    val intent = Intent(this, BlockingOverlayActivity::class.java)
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    intent.putExtra("blockedPackage", packageName)

    startActivity(intent)
  }

  /* =========================
     🔥 UNLOCK CHECK
  ========================= */
  private fun isUnlocked(): Boolean {
    val prefs = getSharedPreferences("scrolltax", Context.MODE_PRIVATE)
    val expiresAt = prefs.getLong("unlockUntil", 0L)

    return System.currentTimeMillis() < expiresAt
  }

  override fun onInterrupt() {
    // No-op
  }
}