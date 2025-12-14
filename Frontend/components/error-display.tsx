"use client"

import type React from "react"
import { AlertCircle, AlertTriangle, Info, RefreshCw, XCircle } from "lucide-react"
import { UserFriendlyError } from "@/lib/error-parser"

interface ErrorDisplayProps {
  error: UserFriendlyError | null
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

/**
 * Inline error display component for showing errors within pages
 * Provides a less intrusive alternative to the modal for contextual errors
 */
export function ErrorDisplay({ error, onRetry, onDismiss, className = "" }: ErrorDisplayProps) {
  if (!error) return null

  // Determine icon and color based on error category
  const getIconAndColor = () => {
    switch (error.category) {
      case 'wallet':
        return { Icon: AlertCircle, color: 'border-yellow-500 bg-yellow-50' }
      case 'network':
        return { Icon: AlertTriangle, color: 'border-orange-500 bg-orange-50' }
      case 'program':
      case 'transaction':
        return { Icon: XCircle, color: 'border-red-500 bg-red-50' }
      case 'account':
        return { Icon: Info, color: 'border-blue-500 bg-blue-50' }
      default:
        return { Icon: AlertCircle, color: 'border-gray-500 bg-gray-50' }
    }
  }

  const { Icon, color } = getIconAndColor()

  return (
    <div className={`border-2 ${color} p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm mb-1">{error.title}</h3>
          <p className="text-sm text-gray-700 mb-2">{error.message}</p>

          {error.details && (
            <details className="mb-2">
              <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-800 font-medium">
                Show details
              </summary>
              <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap break-words font-mono text-gray-600 bg-white p-2 border border-gray-300">
                {error.details}
              </pre>
            </details>
          )}

          {(error.retryable && onRetry) || onDismiss ? (
            <div className="flex gap-2 mt-3">
              {error.retryable && onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 bg-black text-white border border-black hover:bg-gray-800 transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  {error.actionLabel || 'Retry'}
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="inline-flex items-center text-xs font-medium px-3 py-1.5 bg-white text-black border border-black hover:bg-gray-100 transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
