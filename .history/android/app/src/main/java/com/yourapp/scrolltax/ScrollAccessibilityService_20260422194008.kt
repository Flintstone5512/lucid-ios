package com.yourapp.scrolltax

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import android.content.Intent
import android.os.SystemClock
import android.content.Context

class ScrollAccessibilityService : AccessibilityService() {

  private val trackedPackages = setOf(
    "com.instagram.android",
    "com.zhiliaoapp.musically",
    "com.google.android.youtube",
    "com.twitter.android",
    "com.facebook.katana"
  )

  private var lastOverlayTime = 0L
  private val cooldown = 2000 // prevent spam

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null) return

    val packageName = event.packageName?.toString() ?: return
    if (!trackedPackages.contains(packageName)) return

    val now = SystemClock.elapsedRealtime()

    // 🔥 prevent spam
    if (now - lastOverlayTime < cooldown) return
    lastOverlayTime = now

    // 🔥 CHECK UNLOCK STATE
    if (isUnlocked()) return

    // 🔥 LAUNCH OVERLAY
    val intent = Intent(this, BlockingOverlayActivity::class.java)
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    intent.putExtra("blockedPackage", packageName)
    startActivity(intent)
  }

  private fun isUnlocked(): Boolean {
    val prefs = getSharedPreferences("scrolltax", Context.MODE_PRIVATE)
    val expiresAt = prefs.getLong("unlockUntil", 0L)

    return System.currentTimeMillis() < expiresAt
  }

  override fun onInterrupt() {}
}