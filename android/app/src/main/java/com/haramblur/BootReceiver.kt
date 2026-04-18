package com.haramblur

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED) {
      return
    }

    val prefs = context.getSharedPreferences("haramblur", Context.MODE_PRIVATE)
    val wasActive = prefs.getBoolean("protection_active", false)
    if (!wasActive) {
      return
    }

    // MediaProjection token cannot be restored across reboot.
    // We reopen the app so the user can re-enable protection safely.
    val launchIntent = Intent(context, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK
      putExtra("restarted_after_boot", true)
    }
    context.startActivity(launchIntent)
  }
}
