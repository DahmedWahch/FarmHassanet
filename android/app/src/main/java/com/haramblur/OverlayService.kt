package com.haramblur

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.util.DisplayMetrics
import android.util.Log
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import androidx.lifecycle.LifecycleService
import androidx.lifecycle.lifecycleScope
import com.haramblur.data.AppSettings
import com.haramblur.data.DetectionResult
import com.haramblur.network.DetectionClient
import com.haramblur.overlay.BlurRenderer
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class OverlayService : LifecycleService() {
  companion object {
    const val NOTIFICATION_ID = 101
    const val CHANNEL_ID = "haramblur_service"
    private const val TAG = "OverlayService"
    const val DETECT_WIDTH = 640
  }

  private lateinit var windowManager: WindowManager
  private lateinit var mediaProjection: MediaProjection
  private lateinit var virtualDisplay: VirtualDisplay
  private lateinit var imageReader: ImageReader
  private lateinit var blurRenderer: BlurRenderer
  private lateinit var detectionClient: DetectionClient
  private lateinit var settings: AppSettings

  private var screenWidth = 0
  private var screenHeight = 0
  private var screenDensityDpi = 0
  private var scaleX = 1f
  private var scaleY = 1f

  private var captureJob: Job? = null

  private val detectHeight: Int
    get() = (DETECT_WIDTH * screenHeight / screenWidth).coerceAtLeast(1)

  override fun onCreate() {
    super.onCreate()
    windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    createNotificationChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    super.onStartCommand(intent, flags, startId)

    if (intent?.action == "STOP") {
      Log.d(TAG, "Stop action received from notification")
      stopSelf()
      return START_NOT_STICKY
    }

    // Android 14+ requires foreground startup before MediaProjection token use.
    // Keep this as the first operational call in service startup.
    startForeground(NOTIFICATION_ID, buildNotification())
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      Log.d(TAG, "Android 14+ startup path active")
    }

    val extras = intent ?: run {
      Log.e(TAG, "No intent extras; cannot start")
      stopSelf()
      return START_NOT_STICKY
    }

    val backendUrl = extras.getStringExtra("backendUrl") ?: "http://10.0.2.2:3001"
    val blurMode = extras.getStringExtra("blurMode") ?: "women_only"
    val blurIntensity = extras.getIntExtra("blurIntensity", 85)
    val nsfwThreshold = extras.getFloatExtra("nsfwThreshold", 0.5f)
    val genderThreshold = extras.getFloatExtra("genderThreshold", 0.6f)
    val resultCode = extras.getIntExtra("mediaProjectionResultCode", -1)
    val projectionData = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      extras.getParcelableExtra("mediaProjectionData", Intent::class.java)
    } else {
      @Suppress("DEPRECATION")
      extras.getParcelableExtra("mediaProjectionData")
    }

    if (resultCode == -1 || projectionData == null) {
      Log.e(TAG, "Invalid MediaProjection data")
      stopSelf()
      return START_NOT_STICKY
    }

    settings = AppSettings(
      blurMode = blurMode,
      blurIntensity = blurIntensity,
      nsfwThreshold = nsfwThreshold.toDouble(),
      genderThreshold = genderThreshold.toDouble(),
    )

    detectionClient = DetectionClient(backendUrl)
    blurRenderer = BlurRenderer(this, windowManager)

    getScreenMetrics()
    setupMediaProjection(resultCode, projectionData)
    startCaptureLoop()

    // Restart with last intent payload if system kills service.
    return START_REDELIVER_INTENT
  }

  private fun getScreenMetrics() {
    val metrics = DisplayMetrics()
    @Suppress("DEPRECATION")
    windowManager.defaultDisplay.getRealMetrics(metrics)
    screenWidth = metrics.widthPixels
    screenHeight = metrics.heightPixels
    screenDensityDpi = metrics.densityDpi

    scaleX = screenWidth.toFloat() / DETECT_WIDTH.toFloat()
    scaleY = screenHeight.toFloat() / detectHeight.toFloat()

    Log.d(
      TAG,
      "Screen: ${screenWidth}x${screenHeight} @ ${screenDensityDpi}dpi | " +
        "Detect: ${DETECT_WIDTH}x${detectHeight} | Scale: ${scaleX}x${scaleY}",
    )
  }

  private fun setupMediaProjection(resultCode: Int, data: Intent) {
    val projectionManager = getSystemService(MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
    mediaProjection = projectionManager.getMediaProjection(resultCode, data)

    imageReader = ImageReader.newInstance(
      DETECT_WIDTH,
      detectHeight,
      PixelFormat.RGBA_8888,
      2,
    )

    virtualDisplay = mediaProjection.createVirtualDisplay(
      "HaramBlurCapture",
      DETECT_WIDTH,
      detectHeight,
      screenDensityDpi,
      DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
      imageReader.surface,
      null,
      null,
    )
    Log.d(TAG, "VirtualDisplay created: ${DETECT_WIDTH}x${detectHeight}")
  }

  private fun startCaptureLoop() {
    captureJob?.cancel()
    captureJob = lifecycleScope.launch(Dispatchers.IO) {
      Log.d(TAG, "Capture loop started")
      var frameCount = 0

      while (isActive) {
        val frameStart = System.currentTimeMillis()
        val jpegBytes = captureFrame()

        if (jpegBytes != null) {
          frameCount++
          Log.v(TAG, "Frame $frameCount captured (${jpegBytes.size / 1024}KB)")
          val result: DetectionResult? = detectionClient.detect(jpegBytes)
          result?.let {
            withContext(Dispatchers.Main) {
              blurRenderer.update(it, settings, scaleX, scaleY)
            }
          } ?: withContext(Dispatchers.Main) {
            blurRenderer.clear()
          }
        }

        val elapsed = System.currentTimeMillis() - frameStart
        val sleepMs = maxOf(0, 200 - elapsed)
        if (sleepMs > 0) {
          delay(sleepMs)
        }
      }
    }
  }

  private fun captureFrame(): ByteArray? {
    return try {
      val image: Image = imageReader.acquireLatestImage() ?: return null
      try {
        val planes = image.planes
        val buffer: ByteBuffer = planes[0].buffer
        val pixelStride = planes[0].pixelStride
        val rowStride = planes[0].rowStride
        val rowPadding = rowStride - pixelStride * DETECT_WIDTH

        val bitmap = Bitmap.createBitmap(
          DETECT_WIDTH + rowPadding / pixelStride,
          detectHeight,
          Bitmap.Config.ARGB_8888,
        )
        bitmap.copyPixelsFromBuffer(buffer)

        val cropped = Bitmap.createBitmap(bitmap, 0, 0, DETECT_WIDTH, detectHeight)
        bitmap.recycle()

        val stream = ByteArrayOutputStream()
        cropped.compress(Bitmap.CompressFormat.JPEG, 70, stream)
        cropped.recycle()

        val bytes = stream.toByteArray()
        stream.close()
        bytes
      } finally {
        image.close()
      }
    } catch (error: Exception) {
      Log.e(TAG, "Frame capture error: ${error.message}", error)
      null
    }
  }

  override fun onDestroy() {
    super.onDestroy()
    Log.d(TAG, "Service stopping")
    captureJob?.cancel()
    if (::blurRenderer.isInitialized) blurRenderer.destroyAll()
    if (::virtualDisplay.isInitialized) virtualDisplay.release()
    if (::imageReader.isInitialized) imageReader.close()
    if (::mediaProjection.isInitialized) mediaProjection.stop()
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "HaramBlur Protection",
        NotificationManager.IMPORTANCE_LOW,
      ).apply {
        description = "HaramBlur screen protection is active"
      }
      getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
  }

  private fun buildNotification(): Notification {
    val stopIntent = Intent(this, OverlayService::class.java).apply { action = "STOP" }
    val stopPendingIntent = PendingIntent.getService(
      this,
      0,
      stopIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    val openIntent = Intent(this, MainActivity::class.java)
    val openPendingIntent = PendingIntent.getActivity(
      this,
      0,
      openIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(getString(R.string.notification_title))
      .setContentText(getString(R.string.notification_text))
      .setSmallIcon(R.drawable.ic_shield)
      .setOngoing(true)
      .setContentIntent(openPendingIntent)
      .addAction(0, "Stop", stopPendingIntent)
      .build()
  }
}
