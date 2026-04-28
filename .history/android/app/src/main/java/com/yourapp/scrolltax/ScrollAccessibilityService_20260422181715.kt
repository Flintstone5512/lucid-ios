package com.yourapp.scrolltax

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import android.content.Intent

class ScrollAccessibilityService : AccessibilityService() {

  private val trackedPackages = setOf(
    "com.instagram.android",
    "com.zhiliaoapp.musically",   // TikTok
    "com.google.android.youtube",
    "com.twitter.android",
    "com.facebook.katana"        // ✅ FACEBOOK ADDED
  )

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null) return

    val packageName = event.packageName?.toString() ?: return
    if (!trackedPackages.contains(packageName)) return

    // 🔥 DO NOT BLOCK HERE — SEND EVENT
    val intent = Intent("SCROLLTAX_APP_DETECTED")
    intent.putExtra("packageName", packageName)
    val intent = Intent(this, BlockingOverlayActivity::class.java)
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    intent.putExtra("blockedPackage", packageName)
    startActivity(intent)
  }

  override fun onInterrupt() {}
}