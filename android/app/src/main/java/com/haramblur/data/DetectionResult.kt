package com.haramblur.data

data class FaceDetection(
  val x: Int,
  val y: Int,
  val width: Int,
  val height: Int,
  val confidence: Double,
  val gender: String,
  val genderConfidence: Double,
)

data class NsfwResult(
  val score: Double,
  val label: String,
)

data class ProcessingTime(
  val face: Int,
  val gender: Int,
  val nsfw: Int,
  val total: Int,
)

data class DetectionResult(
  val faces: List<FaceDetection>,
  val nsfw: NsfwResult,
  val processingTime: ProcessingTime,
)

data class ModelStatusItem(
  val loaded: Boolean,
  val name: String,
  val size: String,
)

data class ModelsStatus(
  val faceModel: ModelStatusItem,
  val genderModel: ModelStatusItem,
  val nsfwModel: ModelStatusItem,
)
