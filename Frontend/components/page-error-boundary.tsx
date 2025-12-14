"use client"

import React, { ReactNode } from 'react'
import { ErrorBoundary } from './error-boundary'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface PageErrorBoundaryProps {
  children: ReactNode
  pageName?: string
}

/**
 * Page-specific error boundary with a simpler fallback UI
 * Designed to wrap individual pages while maintaining the app layout
 */
export function PageErrorBoundary({ children, pageName = 'this page' }: PageErrorBoundaryProps) {
  const handleError = (error: Error) => {
    // Log to console for debugging
    console.error(`Error in ${pageName}:`, error)

    // In production, send to error tracking service
    // Example: trackError({ page: pageName, error })
  }

  const handleReload = () => {
    window.location.reload()
  }

  const fallback = (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="border-4 border-black bg-white p-8">
          {/* Icon and Title */}
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-red-100 border-2 border-black p-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tighter text-black">
                Error Loading {pageName}
              </h2>
              <p className="text-gray-600 mt-1">
                Something went wrong while loading this page
              </p>
            </div>
          </div>

          {/* Message */}
          <div className="bg-gray-50 border-2 border-gray-300 p-4 mb-6">
            <p className="text-sm text-gray-700">
              We encountered an unexpected error. This might be a temporary issue.
              Please try reloading the page.
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={handleReload}
            className="w-full flex items-center justify-center gap-2 bg-black text-white px-6 py-3 border-2 border-black hover:bg-gray-800 transition-colors font-medium"
          >
            <RefreshCw className="h-4 w-4" />
            Reload Page
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <ErrorBoundary fallback={fallback} onError={handleError}>
      {children}
    </ErrorBoundary>
  )
}
