package com.haramblur

import android.app.Activity
import android.content.Intent
import android.content.SharedPreferences
import android.content.res.ColorStateList
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.graphics.ColorUtils
import androidx.lifecycle.lifecycleScope
import com.google.android.material.snackbar.Snackbar
import com.haramblur.databinding.ActivityMainBinding
import com.haramblur.network.DetectionClient
import com.haramblur.ui.SettingsActivity
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
  private lateinit var binding: ActivityMainBinding
  private lateinit var permHelper: PermissionHelper
  private lateinit var prefs: SharedPreferences
  private lateinit var client: DetectionClient

  private var isProtectionActive = false
  private var backendStatusJob: Job? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    binding = ActivityMainBinding.inflate(layoutInflater)
    setContentView(binding.root)

    prefs = getSharedPreferences("haramblur", MODE_PRIVATE)
    permHelper = PermissionHelper(this)
    client = DetectionClient(getBackendUrl())

    isProtectionActive = prefs.getBoolean("protection_active", false)
    updateToggleUI()

    if (intent?.getBooleanExtra("restarted_after_boot", false) == true) {
      showSnackbar("Tap the button to re-enable protection after reboot")
    }
    maybePromptBatteryOptimization()

    binding.btnToggle.setOnClickListener {
      if (isProtectionActive) {
        stopProtection()
      } else {
        startProtectionFlow()
      }
    }

    binding.btnSettings.setOnClickListener {
      startActivity(Intent(this, SettingsActivity::class.java))
    }

    binding.btnTest.setOnClickListener {
      val testUrl = getBackendUrl().replace(":3001", ":5173")
      startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(testUrl)))
    }

    checkBackendStatus()
  }

  private fun startProtectionFlow() {
    if (!permHelper.hasOverlayPermission()) {
      AlertDialog.Builder(this)
        .setTitle(getString(R.string.permission_overlay_title))
        .setMessage(getString(R.string.permission_overlay_msg))
        .setPositiveButton(getString(R.string.open_settings)) { _, _ ->
          permHelper.requestOverlayPermission(this)
        }
        .setNegativeButton("Cancel", null)
        .show()
      return
    }

    @Suppress("DEPRECATION")
    startActivityForResult(
      permHelper.getScreenCaptureIntent(),
      PermissionHelper.REQUEST_MEDIA_PROJECTION,
    )
  }

  @Deprecated("Deprecated in Java")
  override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
    super.onActivityResult(requestCode, resultCode, data)
    when (requestCode) {
      PermissionHelper.REQUEST_OVERLAY_PERMISSION -> {
        if (permHelper.hasOverlayPermission()) {
          startProtectionFlow()
        }
      }

      PermissionHelper.REQUEST_MEDIA_PROJECTION -> {
        if (resultCode == Activity.RESULT_OK && data != null) {
          launchOverlayService(resultCode, data)
        } else {
          showSnackbar("Screen capture permission denied")
        }
      }
    }
  }

  private fun launchOverlayService(resultCode: Int, data: Intent) {
    val serviceIntent = Intent(this, OverlayService::class.java).apply {
      putExtra("backendUrl", getBackendUrl())
      putExtra("blurMode", prefs.getString("blurMode", "women_only"))
      putExtra("blurIntensity", prefs.getInt("blurIntensity", 85))
      putExtra("nsfwThreshold", prefs.getFloat("nsfwThreshold", 0.5f))
      putExtra("genderThreshold", prefs.getFloat("genderThreshold", 0.6f))
      putExtra("mediaProjectionResultCode", resultCode)
      putExtra("mediaProjectionData", data)
    }
    startForegroundService(serviceIntent)
    isProtectionActive = true
    prefs.edit().putBoolean("protection_active", true).apply()
    updateToggleUI()
    showSnackbar("Protection enabled. You can now use other apps safely.")
  }

  private fun stopProtection() {
    stopService(Intent(this, OverlayService::class.java))
    isProtectionActive = false
    prefs.edit().putBoolean("protection_active", false).apply()
    updateToggleUI()
    showSnackbar("Protection disabled")
  }

  private fun updateToggleUI() {
    val iconOn = ContextCompat.getColorStateList(this, R.color.accent_emerald)
    val iconOff = ContextCompat.getColorStateList(this, R.color.text_muted)
    val strokeOn = ContextCompat.getColorStateList(this, R.color.accent_emerald)
    val strokeOff = ContextCompat.getColorStateList(this, R.color.text_muted)

    if (isProtectionActive) {
      binding.tvToggleStatus.text = "Protection ACTIVE"
      binding.tvToggleSubtitle.text = "Monitoring your screen"
      binding.btnToggle.iconTint = iconOn
      binding.btnToggle.strokeColor = strokeOn

      val emerald = ContextCompat.getColor(this, R.color.accent_emerald)
      binding.btnToggle.backgroundTintList =
        ColorStateList.valueOf(ColorUtils.setAlphaComponent(emerald, 26))

      binding.ivStatusDot.setBackgroundResource(R.drawable.circle_pink)
    } else {
      binding.tvToggleStatus.text = "Protection OFF"
      binding.tvToggleSubtitle.text = "Tap to enable"
      binding.btnToggle.iconTint = iconOff
      binding.btnToggle.strokeColor = strokeOff
      binding.btnToggle.backgroundTintList =
        ColorStateList.valueOf(ContextCompat.getColor(this, android.R.color.transparent))
      binding.ivStatusDot.setBackgroundResource(R.drawable.circle_gray)
    }
    updateBlurModeLabel()
  }

  private fun updateBlurModeLabel() {
    val blurMode = prefs.getString("blurMode", "women_only")
    binding.tvBlurMode.text = when (blurMode) {
      "women_only" -> "Blurring: Women's faces"
      "all_faces" -> "Blurring: All faces"
      "men_only" -> "Blurring: Men's faces"
      else -> "Mode: Off"
    }
  }

  private fun checkBackendStatus() {
    backendStatusJob?.cancel()
    backendStatusJob = lifecycleScope.launch {
      while (isActive) {
        val ok = client.checkHealth()
        if (ok) {
          binding.tvBackendStatus.text = "Backend Ready"
          binding.ivBackendDot.setBackgroundResource(R.drawable.circle_green)
        } else {
          binding.tvBackendStatus.text = "Backend Offline"
          binding.ivBackendDot.setBackgroundResource(R.drawable.circle_red)
          Log.w("HaramBlur", "Backend health check failed for ${getBackendUrl()}")
        }
        delay(10_000)
      }
    }
  }

  private fun maybePromptBatteryOptimization() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      return
    }

    val pm = getSystemService(POWER_SERVICE) as PowerManager
    if (pm.isIgnoringBatteryOptimizations(packageName)) {
      return
    }

    if (prefs.getBoolean("asked_battery_opt", false)) {
      return
    }

    prefs.edit().putBoolean("asked_battery_opt", true).apply()
    AlertDialog.Builder(this)
      .setTitle("Disable Battery Optimization")
      .setMessage(
        "To keep HaramBlur running reliably in the background, " +
          "please disable battery optimization for this app.",
      )
      .setPositiveButton("Open Settings") { _, _ ->
        val intent = Intent(
          Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
          Uri.parse("package:$packageName"),
        )
        startActivity(intent)
      }
      .setNegativeButton("Later", null)
      .show()
  }

  private fun getBackendUrl(): String {
    return prefs.getString("backendUrl", "http://10.0.2.2:3001") ?: "http://10.0.2.2:3001"
  }

  private fun showSnackbar(message: String) {
    Snackbar.make(binding.root, message, Snackbar.LENGTH_LONG).show()
  }

  override fun onResume() {
    super.onResume()
    updateBlurModeLabel()
    client.updateBaseUrl(getBackendUrl())
    checkBackendStatus()
  }

  override fun onDestroy() {
    super.onDestroy()
    backendStatusJob?.cancel()
  }
}
