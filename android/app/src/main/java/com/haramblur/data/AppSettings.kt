package com.haramblur.data

data class AppSettings(
  val nsfwThreshold: Double = 0.5,
  val blurIntensity: Int = 85,
  val detectFaces: Boolean = true,
  val detectNsfw: Boolean = true,
  val blurMode: String = "women_only",
  val genderThreshold: Double = 0.6,
)
