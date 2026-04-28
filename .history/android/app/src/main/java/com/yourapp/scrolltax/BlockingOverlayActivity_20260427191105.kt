package com.yourapp.scrolltax

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.WindowManager
import android.widget.*

class BlockingOverlayActivity : Activity() {

  companion object {
    private var instance: BlockingOverlayActivity? = null
    var isShowing: Boolean = false

    fun finishIfOpen() {
      instance?.finish()
    }
  }

  private var isProcessing = false

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    if (isShowing) {
      finish()
      return
    }

    isShowing = true
    instance = this

    window.setLayout(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.MATCH_PARENT
    )

    window.addFlags(
      WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
      WindowManager.LayoutParams.FLAG_FULLSCREEN
    )

    val packageName =
      intent.getStringExtra("blockedPackage") ?: ""

    val appName = getAppName(packageName)

    /* =========================
       🔥 ROOT LAYOUT
    ========================= */
    val layout = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setPadding(60, 120, 60, 120)
      setBackgroundColor(Color.parseColor("#0E1424"))
    }

    /* =========================
       🔥 TITLE
    ========================= */
    val title = TextView(this).apply {
      text = "Earn Your Scroll"
      textSize = 30f
      setTextColor(Color.WHITE)
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
    }

    /* =========================
       🔥 SUBTITLE
    ========================= */
    val subtitle = TextView(this).apply {
      text = "Before opening $appName,\ncomplete a quick session."
      textSize = 18f
      setTextColor(Color.parseColor("#A9BDDB"))
      gravity = Gravity.CENTER
      setPadding(0, 24, 0, 40)
    }

    /* =========================
       🔥 PROGRESS
    ========================= */
    val progress = ProgressBar(this).apply {
      visibility = ProgressBar.GONE
    }

    /* =========================
       🔥 BUTTON
    ========================= */
    val startBtn = Button(this).apply {
      text = "Start Session"
      setBackgroundColor(Color.parseColor("#D86732"))
      setTextColor(Color.WHITE)

      setOnClickListener {
        if (isProcessing) return@setOnClickListener

        isProcessing = true
        text = "Starting..."
        isEnabled = false
        progress.visibility = ProgressBar.VISIBLE

        openLucidSession(layout)
      }
    }

    layout.addView(title)
    layout.addView(subtitle)
    layout.addView(progress)
    layout.addView(startBtn)

    setContentView(layout)
  }

  /* =========================
     🔥 APP NAME RESOLVER
  ========================= */
  private fun getAppName(packageName: String): String {
    return try {
      val pm: PackageManager = packageManager
      val appInfo = pm.getApplicationInfo(packageName, 0)
      pm.getApplicationLabel(appInfo).toString()
    } catch (e: Exception) {
      "this app"
    }
  }

  /* =========================
     🔥 OPEN SESSION
  ========================= */
  private fun openLucidSession(layout: LinearLayout) {
    try {
      val intent = Intent(
        Intent.ACTION_VIEW,
        Uri.parse("scrolltax://session")
      ).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }

      startActivity(intent)

      layout.animate()
        .alpha(0f)
        .setDuration(250)
        .withEndAction {
          finish()
        }
        .start()

    } catch (_: Exception) {
      finish()
    }
  }

  override fun onDestroy() {
    super.onDestroy()
    isShowing = false
    if (instance === this) instance = null
  }
}