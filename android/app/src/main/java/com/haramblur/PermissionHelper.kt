package com.haramblur

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.provider.Settings

class PermissionHelper(private val context: Context) {
  companion object {
    const val REQUEST_OVERLAY_PERMISSION = 1001
    const val REQUEST_MEDIA_PROJECTION = 1002
  }

  // Check if SYSTEM_ALERT_WINDOW is granted
  fun hasOverlayPermission(): Boolean {
    return Settings.canDrawOverlays(context)
  }

  // Open system settings screen so user can grant overlay permission
  @Suppress("DEPRECATION")
  fun requestOverlayPermission(activity: Activity) {
    val intent = Intent(
      Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
      Uri.parse("package:${context.packageName}"),
    )
    activity.startActivityForResult(intent, REQUEST_OVERLAY_PERMISSION)
  }

  // Get intent to start MediaProjection permission dialog
  fun getScreenCaptureIntent(): Intent {
    val projectionManager = context.getSystemService(
      Context.MEDIA_PROJECTION_SERVICE,
    ) as MediaProjectionManager
    return projectionManager.createScreenCaptureIntent()
  }

  // Check if both required permissions are fully granted
  fun allPermissionsGranted(): Boolean {
    return hasOverlayPermission()
    // Note: MediaProjection does not have a persistent check —
    // we know it's granted when the user accepts the dialog
  }
}
