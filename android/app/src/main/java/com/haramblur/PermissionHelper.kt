package com.haramblur

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings

object PermissionHelper {
  fun hasOverlayPermission(context: Context): Boolean {
    return Settings.canDrawOverlays(context)
  }

  fun overlayPermissionIntent(context: Context): Intent {
    return Intent(
      Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
      Uri.parse("package:${context.packageName}"),
    )
  }

  fun mediaProjectionPermissionIntent(): Intent {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
    } else {
      Intent()
    }
  }
}
