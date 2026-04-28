package com.yourapp.scrolltax

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import android.content.Intent
import android.os.SystemClock

class ScrollAccessibilityService : AccessibilityService() {

  private val trackedPackages = setOf(
    "com.instagram.android",
    "com.zhiliaoapp.musically",
    "com.google.android.youtube",
    "com.twitter.android",
    "com.facebook.katana"
  )

  private var lastOverlayTime = 0L
  private val cooldown = 2000 // 2 seconds to prevent spam

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null) return

    val packageName = event.packageName?.toString() ?: return
    if (!trackedPackages.contains(packageName)) return

    val now = SystemClock.elapsedRealtime()

    // 🔥 prevent overlay spam
    if (now - lastOverlayTime < cooldown) return

    lastOverlayTime = now

    // 🔥 TODO: check unlock state here (step 2)
    val isUnlocked = false

    if (isUnlocked) return

    val intent = Intent(this, BlockingOverlayActivity::class.java)
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    intent.putExtra("blockedPackage", packageName)
    startActivity(intent)
  }

  override fun onInterrupt() {}
}