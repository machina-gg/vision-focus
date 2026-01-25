/**
 * Image utilities for custom background uploads
 */

import { IMAGE_LIMITS } from '~/constants/limits'

export interface ImageValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate an image file before processing
 */
export function validateImageFile(file: File): ImageValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided' }
  }

  if (
    !IMAGE_LIMITS.SUPPORTED_TYPES.includes(
      file.type as (typeof IMAGE_LIMITS.SUPPORTED_TYPES)[number]
    )
  ) {
    return {
      valid: false,
      error: 'Unsupported file type. Please use JPEG, PNG, or WebP.',
    }
  }

  if (file.size > IMAGE_LIMITS.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${IMAGE_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB.`,
    }
  }

  return { valid: true }
}

/**
 * Load an image from a file
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))

    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let newWidth = width
  let newHeight = height

  if (width > maxWidth) {
    newWidth = maxWidth
    newHeight = (height * maxWidth) / width
  }

  if (newHeight > maxHeight) {
    newHeight = maxHeight
    newWidth = (width * maxHeight) / height
  }

  return { width: Math.round(newWidth), height: Math.round(newHeight) }
}

/**
 * Compress an image to fit within target size
 */
export async function compressImage(
  file: File,
  maxSizeMB: number = IMAGE_LIMITS.TARGET_SIZE / 1024 / 1024
): Promise<string> {
  const validation = validateImageFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const img = await loadImage(file)
  const { width, height } = calculateDimensions(
    img.width,
    img.height,
    IMAGE_LIMITS.MAX_WIDTH,
    IMAGE_LIMITS.MAX_HEIGHT
  )

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Draw image with white background (for transparency)
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)

  // Try different quality levels to get under target size
  const targetSize = maxSizeMB * 1024 * 1024
  let quality = 0.9
  let dataUrl = canvas.toDataURL('image/jpeg', quality)

  while (dataUrl.length > targetSize && quality > 0.1) {
    quality -= 0.1
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  }

  if (dataUrl.length > targetSize) {
    throw new Error(
      `Unable to compress image below ${maxSizeMB}MB. Try a smaller image.`
    )
  }

  return dataUrl
}

/**
 * Get the size of a base64 data URL in bytes
 */
export function getBase64Size(dataUrl: string): number {
  // Remove data URL prefix (data:image/jpeg;base64,)
  const base64 = dataUrl.split(',')[1]
  if (!base64) return 0

  // Calculate size: base64 represents 3 bytes per 4 characters
  const padding = (base64.match(/=/g) || []).length
  return Math.floor((base64.length * 3) / 4) - padding
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
