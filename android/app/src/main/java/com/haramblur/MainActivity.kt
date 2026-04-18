package com.haramblur

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.haramblur.ui.SettingsActivity

class MainActivity : AppCompatActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_main)

    val statusText: TextView = findViewById(R.id.statusText)
    val toggleButton: Button = findViewById(R.id.toggleProtectionButton)
    val settingsButton: Button = findViewById(R.id.openSettingsButton)

    toggleButton.setOnClickListener {
      startService(Intent(this, OverlayService::class.java))
      statusText.text = getString(R.string.protection_enabled)
    }

    settingsButton.setOnClickListener {
      startActivity(Intent(this, SettingsActivity::class.java))
    }
  }
}
