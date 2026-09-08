package com.yourapp.scrolltax

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.*
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.WindowManager
import android.view.animation.AlphaAnimation
import android.view.animation.Animation
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
    val appIcon = getAppIcon(packageName)

    /* =========================
       🔥 ROOT
    ========================= */
    val layout = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setPadding(60, 120, 60, 120)
      setBackgroundColor(Color.parseColor("#0E1424"))
    }

    /* =========================
       🔥 ICON + GLOW
    ========================= */
    val iconContainer = FrameLayout(this)

    val glow = ImageView(this).apply {
      setImageBitmap(createGlowBitmap())
      alpha = 0.6f
    }

    val icon = ImageView(this).apply {
      setImageDrawable(appIcon)
      layoutParams = FrameLayout.LayoutParams(160, 160, Gravity.CENTER)
    }

    iconContainer.addView(glow)
    iconContainer.addView(icon)

    /* =========================
       🔥 TITLE
    ========================= */
    val title = TextView(this).apply {
      text = "Earn Your Scroll"
      textSize = 30f
      setTextColor(Color.WHITE)
      setTypeface(null, Typeface.BOLD)
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
       🔥 BUTTON (PULSE)
    ========================= */
    val startBtn = Button(this).apply {
      text = "Start Session"
      setBackgroundColor(Color.parseColor("#D86732"))
      setTextColor(Color.WHITE)

      // 🔥 PULSE ANIMATION
      val pulse = AlphaAnimation(0.8f, 1f).apply {
        duration = 800
        repeatMode = Animation.REVERSE
        repeatCount = Animation.INFINITE
      }
      startAnimation(pulse)

      setOnClickListener {
        if (isProcessing) return@setOnClickListener

        isProcessing = true
        text = "Starting..."
        isEnabled = false
        progress.visibility = ProgressBar.VISIBLE

        clearAnimation()

        openLucidSession(layout)
      }
    }

    layout.addView(iconContainer)
    layout.addView(title)
    layout.addView(subtitle)
    layout.addView(progress)
    layout.addView(startBtn)

    setContentView(layout)
  }

  /* =========================
     🔥 GET APP NAME
  ========================= */
  private fun getAppName(packageName: String): String {
    return try {
      val pm = packageManager
      val appInfo = pm.getApplicationInfo(packageName, 0)
      pm.getApplicationLabel(appInfo).toString()
    } catch (e: Exception) {
      "this app"
    }
  }

  /* =========================
     🔥 GET APP ICON
  ========================= */
  private fun getAppIcon(packageName: String): Drawable? {
    return try {
      val pm = packageManager
      pm.getApplicationIcon(packageName)
    } catch (e: Exception) {
      null
    }
  }

  /* =========================
     🔥 GLOW EFFECT
  ========================= */
  private fun createGlowBitmap(): Bitmap {
    val size = 220
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)

    val paint = Paint().apply {
      color = Color.parseColor("#D86732")
      maskFilter = BlurMaskFilter(50f, BlurMaskFilter.Blur.NORMAL)
    }

    canvas.drawCircle(size / 2f, size / 2f, 70f, paint)

    return bitmap
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