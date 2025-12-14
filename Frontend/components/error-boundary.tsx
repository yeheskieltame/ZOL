"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error Boundary component that catches JavaScript errors anywhere in the child component tree
 * Logs errors and displays a fallback UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details for debugging
    console.error('Error Boundary caught an error:', error, errorInfo)

    // Update state with error info
    this.setState({
      errorInfo,
    })

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // In production, you might want to send this to an error tracking service
    // Example: logErrorToService(error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleGoHome = (): void => {
    window.location.href = '/'
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="border-4 border-black bg-white p-8">
              {/* Icon and Title */}
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-red-100 border-2 border-black p-3">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tighter text-black">
                    Something Went Wrong
                  </h1>
                  <p className="text-gray-600 mt-1">
                    An unexpected error occurred in the application
                  </p>
                </div>
              </div>

              {/* Error Message */}
              <div className="bg-gray-50 border-2 border-gray-300 p-4 mb-6">
                <p className="font-mono text-sm text-gray-800 break-words">
                  {this.state.error?.message || 'Unknown error'}
                </p>
              </div>

              {/* Error Details (collapsible) */}
              {this.state.errorInfo && (
                <details className="mb-6 border-2 border-gray-300">
                  <summary className="cursor-pointer p-3 bg-gray-100 hover:bg-gray-200 transition-colors font-medium text-sm">
                    Technical Details
                  </summary>
                  <div className="p-4 bg-white border-t-2 border-gray-300">
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words font-mono text-gray-700">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center gap-2 bg-black text-white px-6 py-3 border-2 border-black hover:bg-gray-800 transition-colors font-medium"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center gap-2 bg-white text-black px-6 py-3 border-2 border-black hover:bg-gray-100 transition-colors font-medium"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </button>
              </div>

              {/* Help Text */}
              <p className="text-sm text-gray-600 mt-6 text-center">
                If this problem persists, please refresh the page or contact support.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
