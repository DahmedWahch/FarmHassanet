package com.haramblur.ui

import android.content.SharedPreferences
import android.os.Bundle
import android.util.Log
import android.view.MenuItem
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.android.material.snackbar.Snackbar
import com.haramblur.R
import com.haramblur.data.AppSettings
import com.haramblur.databinding.ActivitySettingsBinding
import com.haramblur.network.DetectionClient
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class SettingsActivity : AppCompatActivity() {

  private lateinit var binding: ActivitySettingsBinding
  private lateinit var prefs: SharedPreferences
  private lateinit var client: DetectionClient

  // Local in-memory settings (updated immediately on any change)
  private var localSettings = AppSettings()
  private var autoSaveJob: Job? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    binding = ActivitySettingsBinding.inflate(layoutInflater)
    setContentView(binding.root)

    setSupportActionBar(binding.toolbar)
    supportActionBar?.setDisplayHomeAsUpEnabled(true)

    prefs = getSharedPreferences("haramblur", MODE_PRIVATE)
    val defaultUrl = "http://10.0.2.2:3001"
    client = DetectionClient(prefs.getString("backendUrl", defaultUrl) ?: defaultUrl)

    // Load settings: try backend first, fallback to SharedPreferences
    loadSettings()

    setupListeners()
  }

  private fun loadSettings() {
    // Load from local prefs immediately (instant UI)
    localSettings = AppSettings(
      blurMode = prefs.getString("blurMode", "women_only") ?: "women_only",
      blurIntensity = prefs.getInt("blurIntensity", 85),
      nsfwThreshold = prefs.getFloat("nsfwThreshold", 0.5f).toDouble(),
      detectFaces = prefs.getBoolean("detectFaces", true),
      detectNsfw = prefs.getBoolean("detectNsfw", true),
      genderThreshold = prefs.getFloat("genderThreshold", 0.6f).toDouble(),
    )
    applySettingsToUI(localSettings)

    // Then fetch from backend asynchronously to get any remote updates
    lifecycleScope.launch {
      val remote = client.getSettings()
      if (remote != null) {
        Log.d("Settings", "Loaded from backend: $remote")
        localSettings = remote
        applySettingsToUI(remote)
        saveToPrefs(remote) // keep local prefs in sync
      } else {
        Log.d("Settings", "Backend offline — using local prefs")
        showSnackbar("Backend offline — showing local settings", false)
      }
    }
  }

  private fun applySettingsToUI(settings: AppSettings) {
    // Blur mode toggle
    when (settings.blurMode) {
      "women_only" -> binding.toggleBlurMode.check(binding.btnWomenOnly.id)
      "all_faces" -> binding.toggleBlurMode.check(binding.btnAllFaces.id)
      "men_only" -> binding.toggleBlurMode.check(binding.btnMenOnly.id)
    }

    binding.sliderGenderThreshold.value = settings.genderThreshold.toFloat()
    binding.switchDetectFaces.isChecked = settings.detectFaces
    binding.sliderNsfwThreshold.value = settings.nsfwThreshold.toFloat()
    binding.switchDetectNsfw.isChecked = settings.detectNsfw
    binding.sliderBlurIntensity.value = settings.blurIntensity.toFloat()
    binding.etBackendUrl.setText(
      prefs.getString("backendUrl", "http://10.0.2.2:3001"),
    )
    updateSliderLabels(settings)
  }

  private fun updateSliderLabels(settings: AppSettings) {
    binding.tvGenderValue.text = "${(settings.genderThreshold * 100).toInt()}%"
    binding.tvNsfwValue.text = "%.2f".format(settings.nsfwThreshold)
    binding.tvBlurValue.text = "${settings.blurIntensity}"
  }

  private fun setupListeners() {
    // Blur mode toggle group
    binding.toggleBlurMode.addOnButtonCheckedListener { _, checkedId, isChecked ->
      if (!isChecked) {
        return@addOnButtonCheckedListener
      }
      localSettings = localSettings.copy(
        blurMode = when (checkedId) {
          binding.btnAllFaces.id -> "all_faces"
          binding.btnMenOnly.id -> "men_only"
          else -> "women_only"
        },
      )
      autoSave()
    }

    binding.sliderGenderThreshold.addOnChangeListener { _, value, _ ->
      localSettings = localSettings.copy(genderThreshold = value.toDouble())
      binding.tvGenderValue.text = "${(value * 100).toInt()}%"
      autoSave()
    }

    binding.switchDetectFaces.setOnCheckedChangeListener { _, checked ->
      localSettings = localSettings.copy(detectFaces = checked)
      autoSave()
    }

    binding.sliderNsfwThreshold.addOnChangeListener { _, value, _ ->
      localSettings = localSettings.copy(nsfwThreshold = value.toDouble())
      binding.tvNsfwValue.text = "%.2f".format(value)
      autoSave()
    }

    binding.switchDetectNsfw.setOnCheckedChangeListener { _, checked ->
      localSettings = localSettings.copy(detectNsfw = checked)
      autoSave()
    }

    binding.sliderBlurIntensity.addOnChangeListener { _, value, _ ->
      localSettings = localSettings.copy(blurIntensity = value.toInt())
      binding.tvBlurValue.text = "${value.toInt()}"
      autoSave()
    }

    binding.btnTestConnection.setOnClickListener {
      testConnection()
    }

    binding.btnSaveUrl.setOnClickListener {
      val url = binding.etBackendUrl.text?.toString()?.trim().orEmpty()
      if (url.isBlank()) {
        showSnackbar("Please enter a backend URL", false)
        return@setOnClickListener
      }
      prefs.edit().putString("backendUrl", url).apply()
      client.updateBaseUrl(url)
      showSnackbar("Backend URL saved", true)
      testConnection()
    }

    binding.btnResetDefaults.setOnClickListener {
      AlertDialog.Builder(this)
        .setTitle("Reset to Defaults?")
        .setMessage("This will reset all settings to factory defaults.")
        .setPositiveButton("Reset") { _, _ ->
          localSettings = AppSettings() // default values
          applySettingsToUI(localSettings)
          saveToBackend(localSettings)
          saveToPrefs(localSettings)
          showSnackbar("Settings reset to defaults", true)
        }
        .setNegativeButton("Cancel", null)
        .show()
    }
  }

  private fun autoSave() {
    // Debounce: wait 600ms after last change before saving
    autoSaveJob?.cancel()
    autoSaveJob = lifecycleScope.launch {
      delay(600)
      saveToPrefs(localSettings)
      saveToBackend(localSettings)
    }
  }

  private fun saveToPrefs(settings: AppSettings) {
    prefs.edit()
      .putString("blurMode", settings.blurMode)
      .putInt("blurIntensity", settings.blurIntensity)
      .putFloat("nsfwThreshold", settings.nsfwThreshold.toFloat())
      .putBoolean("detectFaces", settings.detectFaces)
      .putBoolean("detectNsfw", settings.detectNsfw)
      .putFloat("genderThreshold", settings.genderThreshold.toFloat())
      .apply()
  }

  private fun saveToBackend(settings: AppSettings) {
    lifecycleScope.launch {
      val saved = client.saveSettings(settings)
      if (saved != null) {
        Log.d("Settings", "Saved to backend: $saved")
        showSnackbar("Settings saved ✓", true)
      } else {
        Log.w("Settings", "Could not save to backend — kept locally")
      }
    }
  }

  private fun testConnection() {
    binding.tvConnectionStatus.text = "Testing..."
    lifecycleScope.launch {
      val ok = client.checkHealth()
      binding.tvConnectionStatus.text = if (ok) "✓ Connected" else "✗ Failed"
      binding.tvConnectionStatus.setTextColor(
        ContextCompat.getColor(
          this@SettingsActivity,
          if (ok) R.color.accent_emerald else R.color.danger_red,
        ),
      )
    }
  }

  private fun showSnackbar(message: String, success: Boolean) {
    Snackbar.make(binding.root, message, Snackbar.LENGTH_SHORT).apply {
      setBackgroundTint(
        ContextCompat.getColor(
          this@SettingsActivity,
          if (success) R.color.accent_emerald else R.color.danger_red,
        ),
      )
    }.show()
  }

  override fun onOptionsItemSelected(item: MenuItem): Boolean {
    if (item.itemId == android.R.id.home) {
      onBackPressedDispatcher.onBackPressed()
      return true
    }
    return super.onOptionsItemSelected(item)
  }
}
