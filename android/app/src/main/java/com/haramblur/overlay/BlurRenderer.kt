package com.haramblur.overlay

import android.content.Context
import android.util.Log
import android.view.WindowManager
import com.haramblur.data.AppSettings
import com.haramblur.data.DetectionResult

class BlurRenderer(
  private val context: Context,
  private val windowManager: WindowManager,
) {
  fun update(result: DetectionResult, settings: AppSettings, scaleX: Float, scaleY: Float) {
    // Overlay drawing is implemented in the next Android tasks.
    // Keep this no-op safe so capture/detection loop can run without crashing.
    Log.v(
      "BlurRenderer",
      "update faces=${result.faces.size} nsfw=${result.nsfw.score} mode=${settings.blurMode} scale=($scaleX,$scaleY)",
    )
  }

  fun clear() {
    // Placeholder for clearing overlay views.
  }

  fun destroyAll() {
    clear()
  }
}
