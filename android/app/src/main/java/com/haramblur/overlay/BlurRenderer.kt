package com.haramblur.overlay

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PixelFormat
import android.os.Build
import android.renderscript.Allocation
import android.renderscript.Element
import android.renderscript.RenderScript
import android.renderscript.ScriptIntrinsicBlur
import android.util.DisplayMetrics
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.ImageView
import com.haramblur.data.AppSettings
import com.haramblur.data.DetectionResult
import com.haramblur.data.FaceDetection

class BlurRenderer(
  private val context: Context,
  private val windowManager: WindowManager,
) {

  companion object {
    private const val TAG = "BlurRenderer"

    // Max RenderScript blur radius (Android API limit)
    private const val MAX_RS_RADIUS = 25f
  }

  // Active overlay views, keyed by index
  private val overlayViews = mutableListOf<View>()

  /**
   * Main update method — called from OverlayService after each detection.
   * Decides which faces to blur based on settings, then draws/updates overlays.
   *
   * @param result     Detection result from backend
   * @param settings   Current app settings (blurMode, blurIntensity, thresholds)
   * @param scaleX     screenWidth / detectImageWidth (for coordinate scaling)
   * @param scaleY     screenHeight / detectImageHeight
   */
  fun update(
    result: DetectionResult,
    settings: AppSettings,
    scaleX: Float,
    scaleY: Float,
  ) {
    // Check if entire screen should be blurred (NSFW)
    val nsfwBlurAll = settings.detectNsfw && result.nsfw.score >= settings.nsfwThreshold

    if (nsfwBlurAll) {
      Log.d(TAG, "NSFW detected (score=${result.nsfw.score}) — blurring full screen")
      drawFullScreenBlur(settings.blurIntensity)
      return
    }

    // Otherwise: determine which specific faces to blur
    val facesToBlur = if (settings.detectFaces) {
      result.faces.filter { face -> shouldBlurFace(face, settings) }
    } else {
      emptyList()
    }

    Log.d(TAG, "Faces detected: ${result.faces.size}, to blur: ${facesToBlur.size}")

    if (facesToBlur.isEmpty()) {
      clear()
      return
    }

    // Scale bounding boxes from detection coordinates to screen coordinates
    val scaledFaces = facesToBlur.map { face ->
      ScaledRect(
        left = (face.x * scaleX).toInt(),
        top = (face.y * scaleY).toInt(),
        right = ((face.x + face.width) * scaleX).toInt(),
        bottom = ((face.y + face.height) * scaleY).toInt(),
      )
    }

    drawFaceBlurs(scaledFaces, settings.blurIntensity)
  }

  /**
   * Determine if a specific face should be blurred based on current blurMode.
   */
  private fun shouldBlurFace(face: FaceDetection, settings: AppSettings): Boolean {
    return when (settings.blurMode) {
      "women_only" -> {
        // Blur if female, unknown, or if male confidence is below threshold
        face.gender == "female" ||
          face.gender == "unknown" ||
          (face.gender == "male" && face.genderConfidence < settings.genderThreshold)
      }

      "all_faces" -> true

      "men_only" -> {
        face.gender == "male" ||
          face.gender == "unknown" ||
          (face.gender == "female" && face.genderConfidence < settings.genderThreshold)
      }

      else -> false
    }
  }

  /**
   * Draw individual blur boxes over each detected face.
   */
  private fun drawFaceBlurs(faces: List<ScaledRect>, blurIntensity: Int) {
    // Remove old overlays
    clearOverlays()

    for (rect in faces) {
      val width = rect.right - rect.left
      val height = rect.bottom - rect.top
      if (width <= 0 || height <= 0) {
        continue
      }

      // Create a blurred view sized exactly to the face
      val blurView = createBlurView(width, height, blurIntensity)

      val params = WindowManager.LayoutParams(
        width,
        height,
        rect.left,
        rect.top,
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
          @Suppress("DEPRECATION")
          WindowManager.LayoutParams.TYPE_SYSTEM_OVERLAY
        },
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
          WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
          WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
        PixelFormat.TRANSLUCENT,
      ).apply {
        gravity = Gravity.TOP or Gravity.START
        x = rect.left
        y = rect.top
      }

      try {
        windowManager.addView(blurView, params)
        overlayViews.add(blurView)
      } catch (error: Exception) {
        Log.e(TAG, "Failed to add overlay view: ${error.message}", error)
      }
    }
  }

  /**
   * Blur the entire screen — used when NSFW content is detected.
   */
  private fun drawFullScreenBlur(blurIntensity: Int) {
    clearOverlays()

    val display = windowManager.defaultDisplay
    val metrics = DisplayMetrics()
    @Suppress("DEPRECATION")
    display.getRealMetrics(metrics)

    val fullScreenView = createBlurView(metrics.widthPixels, metrics.heightPixels, blurIntensity)

    val params = WindowManager.LayoutParams(
      metrics.widthPixels,
      metrics.heightPixels,
      0,
      0,
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      } else {
        @Suppress("DEPRECATION")
        WindowManager.LayoutParams.TYPE_SYSTEM_OVERLAY
      },
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.TOP or Gravity.START
    }

    try {
      windowManager.addView(fullScreenView, params)
      overlayViews.add(fullScreenView)
    } catch (error: Exception) {
      Log.e(TAG, "Failed to add full-screen overlay: ${error.message}", error)
    }
  }

  /**
   * Create an ImageView displaying a blurred frosted-glass rectangle.
   * blurIntensity 0-100 maps to blur radius 2-25px.
   */
  private fun createBlurView(width: Int, height: Int, blurIntensity: Int): View {
    val radius = 2f + (blurIntensity / 100f) * (MAX_RS_RADIUS - 2f)
    val safeWidth = maxOf(width, 1)
    val safeHeight = maxOf(height, 1)

    // Create a bitmap of the target size, filled with semi-opaque dark color
    val bitmap = Bitmap.createBitmap(safeWidth, safeHeight, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)

    // Fill with dark semi-transparent background (frosted glass effect)
    val paint = Paint().apply {
      color = Color.argb(180, 0, 0, 0) // 70% opaque black
      style = Paint.Style.FILL
    }
    canvas.drawRect(0f, 0f, safeWidth.toFloat(), safeHeight.toFloat(), paint)

    // Apply RenderScript blur if available (API 17-32)
    val blurredBitmap = if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.S) {
      applyRenderScriptBlur(bitmap, radius)
    } else {
      // API 33+: RenderScript deprecated — use canvas blur approximation
      applyPixelBlur(bitmap, radius)
    }

    return ImageView(context).apply {
      setImageBitmap(blurredBitmap)
      scaleType = ImageView.ScaleType.FIT_XY
    }
  }

  /**
   * RenderScript Gaussian blur (API 17-32, most devices).
   */
  @Suppress("DEPRECATION")
  private fun applyRenderScriptBlur(bitmap: Bitmap, radius: Float): Bitmap {
    return try {
      val rs = RenderScript.create(context)
      val input = Allocation.createFromBitmap(rs, bitmap)
      val output = Allocation.createTyped(rs, input.type)
      val script = ScriptIntrinsicBlur.create(rs, Element.U8_4(rs))
      script.setRadius(radius.coerceIn(0f, MAX_RS_RADIUS))
      script.setInput(input)
      script.forEach(output)
      val blurred = Bitmap.createBitmap(bitmap.width, bitmap.height, Bitmap.Config.ARGB_8888)
      output.copyTo(blurred)
      rs.destroy()
      bitmap.recycle()
      blurred
    } catch (error: Exception) {
      Log.w(TAG, "RenderScript blur failed, using fallback: ${error.message}")
      bitmap
    }
  }

  /**
   * Manual blur approximation for API 33+ (RenderScript deprecated).
   * Uses multiple layers of scaled-down and scaled-up bitmap for blur effect.
   */
  private fun applyPixelBlur(bitmap: Bitmap, radius: Float): Bitmap {
    val sourceWidth = bitmap.width
    val sourceHeight = bitmap.height
    val scale = (0.35f - (radius / MAX_RS_RADIUS) * 0.15f).coerceIn(0.1f, 0.35f)
    val width = maxOf((sourceWidth * scale).toInt(), 1)
    val height = maxOf((sourceHeight * scale).toInt(), 1)

    // Downscale
    val small = Bitmap.createScaledBitmap(bitmap, width, height, true)
    bitmap.recycle()

    // Upscale back (creates natural blur)
    return Bitmap.createScaledBitmap(small, sourceWidth, sourceHeight, true)
      .also { small.recycle() }
  }

  /** Remove all overlay views from WindowManager. */
  fun clear() {
    clearOverlays()
  }

  /** Remove all overlays and recycle bitmaps. */
  fun destroyAll() {
    clearOverlays()
  }

  private fun clearOverlays() {
    for (view in overlayViews) {
      try {
        if (view is ImageView) {
          val bitmap = (view.drawable as? android.graphics.drawable.BitmapDrawable)?.bitmap
          view.setImageDrawable(null)
          bitmap?.takeIf { !it.isRecycled }?.recycle()
        }
        windowManager.removeView(view)
      } catch (_: Exception) {
        // View may already be removed — ignore
      }
    }
    overlayViews.clear()
  }

  private data class ScaledRect(
    val left: Int,
    val top: Int,
    val right: Int,
    val bottom: Int,
  )
}
