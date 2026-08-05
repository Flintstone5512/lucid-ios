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
    "com.ss.android.ugc.trill", // TikTok (alt)
    "com.google.android.youtube",
    "com.twitter.android",
    "com.facebook.katana",
    "com.snapchat.android"
  )

  private var lastOverlayTime = 0L
  private val cooldown = 2000

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null) return

    val packageName = event.packageName?.toString() ?: return

    if (!trackedPackages.contains(packageName)) return

    val now = SystemClock.elapsedRealtime()

    if (now - lastOverlayTime < cooldown) return
    lastOverlayTime = now

    // Parents must explicitly enable self-blocking to be blocked on their own device
    if (isParentWithoutSelfBlock()) return

    if (isUnlocked()) return

    val prefs = getSharedPreferences("scrolltax", Context.MODE_PRIVATE)
    prefs.edit().putString("lastBlockedPackage", packageName).apply()

    android.util.Log.d("LUCID", "Blocking package: $packageName")

    val intent = Intent(this, BlockingOverlayActivity::class.java)
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    intent.putExtra("blockedPackage", packageName)
    startActivity(intent)
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
}
