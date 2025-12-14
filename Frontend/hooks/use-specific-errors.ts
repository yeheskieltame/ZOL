"use client"

import { useCallback } from 'react'
import {
  createInsufficientBalanceError,
  createWalletNotConnectedError,
  createNetworkTimeoutError,
  createAccountNotFoundError,
  UserFriendlyError,
} from '@/lib/error-parser'

/**
 * Hook that provides easy access to specific error creators
 * Useful for components that need to show specific error messages
 */
export function useSpecificErrors() {
  const insufficientBalance = useCallback((tokenName?: string): UserFriendlyError => {
    return createInsufficientBalanceError(tokenName)
  }, [])

  const walletNotConnected = useCallback((): UserFriendlyError => {
    return createWalletNotConnectedError()
  }, [])

  const networkTimeout = useCallback((): UserFriendlyError => {
    return createNetworkTimeoutError()
  }, [])

  const accountNotFound = useCallback((accountType?: string): UserFriendlyError => {
    return createAccountNotFoundError(accountType)
  }, [])

  return {
    insufficientBalance,
    walletNotConnected,
    networkTimeout,
    accountNotFound,
  }
}
