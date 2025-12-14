"use client"

import { useState, useCallback } from 'react'
import { parseTransactionError, UserFriendlyError } from '@/lib/error-parser'

interface UseErrorHandlerReturn {
  error: UserFriendlyError | null
  setError: (error: unknown) => void
  clearError: () => void
  handleError: (error: unknown) => void
}

/**
 * Hook for managing error state with automatic parsing
 * Provides utilities for setting, clearing, and handling errors
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setErrorState] = useState<UserFriendlyError | null>(null)

  const setError = useCallback((error: unknown) => {
    const parsedError = parseTransactionError(error)
    setErrorState(parsedError)
  }, [])

  const clearError = useCallback(() => {
    setErrorState(null)
  }, [])

  const handleError = useCallback((error: unknown) => {
    console.error('Error occurred:', error)
    setError(error)
  }, [setError])

  return {
    error,
    setError,
    clearError,
    handleError,
  }
}
