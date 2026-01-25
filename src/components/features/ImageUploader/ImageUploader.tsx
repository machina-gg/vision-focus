import React, { useCallback, useState, useRef } from 'react'

import { Upload, X, Image as ImageIcon } from 'lucide-react'

import { compressImage, validateImageFile } from '~/lib/image'
import { getMessage } from '~/lib/i18n'

export interface ImageUploaderProps {
  value: string | null
  onChange: (dataUrl: string | null) => void
  maxSizeMB?: number
  disabled?: boolean
}

export function ImageUploader({
  value,
  onChange,
  maxSizeMB = 1,
  disabled = false,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)

      const validation = validateImageFile(file)
      if (!validation.valid) {
        setError(validation.error || 'Invalid file')
        return
      }

      setIsProcessing(true)
      try {
        const dataUrl = await compressImage(file, maxSizeMB)
        onChange(dataUrl)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process image')
      } finally {
        setIsProcessing(false)
      }
    },
    [maxSizeMB, onChange]
  )

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      const file = e.dataTransfer.files[0]
      if (file) {
        handleFile(file)
      }
    },
    [disabled, handleFile]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFile(file)
      }
      // Reset input so the same file can be selected again
      e.target.value = ''
    },
    [handleFile]
  )

  const handleRemove = useCallback(() => {
    onChange(null)
    setError(null)
  }, [onChange])

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [disabled])

  if (value) {
    return (
      <div className="relative">
        <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-200">
          <img
            src={value}
            alt="Uploaded background"
            className="w-full h-full object-cover"
          />
          {!disabled && (
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
              title={getMessage('remove')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500 text-center">
          {getMessage('uploadedImage')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative w-full aspect-video rounded-lg border-2 border-dashed
          flex flex-col items-center justify-center gap-2
          transition-colors cursor-pointer
          ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isProcessing ? 'pointer-events-none' : ''}
        `}
      >
        {isProcessing ? (
          <>
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600">{getMessage('processing')}</p>
          </>
        ) : (
          <>
            <div className="p-3 bg-gray-100 rounded-full">
              {isDragging ? (
                <ImageIcon className="w-6 h-6 text-primary-500" />
              ) : (
                <Upload className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                {isDragging
                  ? getMessage('dropImage')
                  : getMessage('uploadImage')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {getMessage('supportedFormats')}
              </p>
            </div>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </div>
  )
}
