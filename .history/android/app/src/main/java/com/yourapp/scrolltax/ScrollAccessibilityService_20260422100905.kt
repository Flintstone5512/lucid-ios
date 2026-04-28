package com.yourcompany.scrolltax

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import android.content.Intent

class ScrollAccessibilityService : AccessibilityService() {

  private val blockedPackages = setOf(
    "com.instagram.android",
    "com.zhiliaoapp.musically",
    "com.twitter.android",
    "com.google.android.youtube"
  )

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null) return

    val packageName = event.packageName?.toString() ?: return
    if (!blockedPackages.contains(packageName)) return

    // 🔥 CALL REACT SIDE INSTEAD OF AUTO BLOCK
    val intent = Intent("SCROLLTAX_APP_DETECTED")
    intent.putExtra("packageName", packageName)
    sendBroadcast(intent)
}