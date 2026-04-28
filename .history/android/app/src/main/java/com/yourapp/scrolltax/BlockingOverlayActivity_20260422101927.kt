package com.yourapp.scrolltax

import android.app.Activity
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class BlockingOverlayActivity : Activity() {

  companion object {
    private var instance: BlockingOverlayActivity? = null

    fun finishIfOpen() {
      instance?.finish()
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    instance = this

    val blockedPackage = intent.getStringExtra("blockedPackage") ?: "a blocked app"

    val layout = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(60, 120, 60, 120)
    }

    val title = TextView(this).apply {
      text = "Earn your scroll"
      textSize = 28f
    }

    val subtitle = TextView(this).apply {
      text = "You tried to open $blockedPackage. Complete your cards to continue."
      textSize = 18f
    }

    val openAppButton = Button(this).apply {
      text = "Open ScrollTax"
      setOnClickListener {
        finish()
      }
    }

    layout.addView(title)
    layout.addView(subtitle)
    layout.addView(openAppButton)

    setContentView(layout)
  }

  override fun onDestroy() {
    super.onDestroy()
    if (instance === this) {
      instance = null
    }
  }
}