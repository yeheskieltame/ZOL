"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, RefreshCw, X, ExternalLink } from "lucide-react"
import { UserFriendlyError } from "@/lib/error-parser"

interface ErrorModalProps {
  isOpen: boolean
  onClose: () => void
  error: UserFriendlyError | null
  onRetry?: () => void
}

export function ErrorModal({ isOpen, onClose, error, onRetry }: ErrorModalProps) {
  const router = useRouter()
  
  if (!isOpen || !error) return null

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    }
    onClose()
  }
  
  const handleAction = () => {
    // Handle special actions like "Go to Faucet"
    if (error.actionLabel === 'Go to Faucet') {
      router.push('/faucet')
      onClose()
      return
    }
    // Default to retry behavior
    handleRetry()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/95" onClick={onClose} />
      <div className="relative bg-white border-2 border-black max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b-2 border-black p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <h2 className="text-2xl font-bold tracking-tighter text-black">{error.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="border border-black p-2 hover:bg-gray-100 transition-colors"
            aria-label="Close error modal"
          >
            <X className="h-4 w-4 text-black" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-black space-y-4">
          {/* Error Message */}
          <div>
            <p className="text-base leading-relaxed">{error.message}</p>
          </div>

          {/* Error Details (collapsible) */}
          {error.details && (
            <details className="border border-gray-300 rounded">
              <summary className="cursor-pointer p-3 bg-gray-50 hover:bg-gray-100 transition-colors font-medium text-sm">
                Technical Details
              </summary>
              <div className="p-3 bg-white">
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words font-mono text-gray-700">
                  {error.details}
                </pre>
              </div>
            </details>
          )}

          {/* Category Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Error Type:</span>
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium border border-black bg-gray-100">
              {error.category.toUpperCase()}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {error.actionLabel && (
              <button
                onClick={handleAction}
                className="flex-1 flex items-center justify-center gap-2 bg-black text-white px-4 py-3 border-2 border-black hover:bg-gray-800 transition-colors font-medium"
              >
                {error.actionLabel === 'Go to Faucet' ? (
                  <ExternalLink className="h-4 w-4" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {error.actionLabel}
              </button>
            )}
            {error.retryable && onRetry && !error.actionLabel && (
              <button
                onClick={handleRetry}
                className="flex-1 flex items-center justify-center gap-2 bg-black text-white px-4 py-3 border-2 border-black hover:bg-gray-800 transition-colors font-medium"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 bg-white text-black px-4 py-3 border-2 border-black hover:bg-gray-100 transition-colors font-medium"
            >
              {(error.retryable && onRetry) || error.actionLabel ? 'Cancel' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
