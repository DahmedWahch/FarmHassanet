package com.haramblur.network

import com.google.gson.Gson
import com.haramblur.data.AppSettings
import com.haramblur.data.DetectionResult
import com.haramblur.data.ModelsStatus
import java.io.IOException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor

class DetectionClient(
  private val baseUrl: String = "http://10.0.2.2:3001",
) {
  private val gson = Gson()

  private val httpClient: OkHttpClient = OkHttpClient.Builder()
    .addInterceptor(
      HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.NONE
      },
    )
    .build()

  suspend fun checkHealth(): Boolean = withContext(Dispatchers.IO) {
    return@withContext try {
      val request = Request.Builder()
        .url("$baseUrl/api/health")
        .get()
        .build()

      httpClient.newCall(request).execute().use { response ->
        response.isSuccessful
      }
    } catch (_: IOException) {
      false
    }
  }

  suspend fun getModelsStatus(): ModelsStatus = withContext(Dispatchers.IO) {
    val request = Request.Builder()
      .url("$baseUrl/api/models/status")
      .get()
      .build()

    httpClient.newCall(request).execute().use { response ->
      if (!response.isSuccessful) {
        throw IOException("Model status request failed: ${response.code}")
      }
      val body = response.body?.string() ?: throw IOException("Empty model status response.")
      gson.fromJson(body, ModelsStatus::class.java)
    }
  }

  suspend fun getSettings(): AppSettings = withContext(Dispatchers.IO) {
    val request = Request.Builder()
      .url("$baseUrl/api/settings")
      .get()
      .build()

    httpClient.newCall(request).execute().use { response ->
      if (!response.isSuccessful) {
        throw IOException("Settings request failed: ${response.code}")
      }
      val body = response.body?.string() ?: throw IOException("Empty settings response.")
      gson.fromJson(body, AppSettings::class.java)
    }
  }

  suspend fun detectImage(fileName: String, imageBytes: ByteArray): DetectionResult =
    withContext(Dispatchers.IO) {
      val mediaType = "image/jpeg".toMediaType()
      val filePart = imageBytes.toRequestBody(mediaType)
      val requestBody = MultipartBody.Builder()
        .setType(MultipartBody.FORM)
        .addFormDataPart("image", fileName, filePart)
        .build()

      val request = Request.Builder()
        .url("$baseUrl/api/detect")
        .post(requestBody)
        .build()

      httpClient.newCall(request).execute().use { response ->
        if (!response.isSuccessful) {
          throw IOException("Detection request failed: ${response.code}")
        }
        val body = response.body?.string() ?: throw IOException("Empty detection response.")
        gson.fromJson(body, DetectionResult::class.java)
      }
    }
}
