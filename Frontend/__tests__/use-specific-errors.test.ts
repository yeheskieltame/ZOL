import { renderHook } from '@testing-library/react'
import { useSpecificErrors } from '@/hooks/use-specific-errors'

describe('useSpecificErrors', () => {
  it('should provide insufficientBalance error creator', () => {
    const { result } = renderHook(() => useSpecificErrors())
    
    const error = result.current.insufficientBalance('USDC')
    expect(error.title).toBe('Insufficient Balance')
    expect(error.message).toContain('USDC')
    expect(error.category).toBe('wallet')
  })

  it('should provide walletNotConnected error creator', () => {
    const { result } = renderHook(() => useSpecificErrors())
    
    const error = result.current.walletNotConnected()
    expect(error.title).toBe('Wallet Not Connected')
    expect(error.category).toBe('wallet')
  })

  it('should provide networkTimeout error creator', () => {
    const { result } = renderHook(() => useSpecificErrors())
    
    const error = result.current.networkTimeout()
    expect(error.title).toBe('Network Timeout')
    expect(error.category).toBe('network')
    expect(error.retryable).toBe(true)
  })

  it('should provide accountNotFound error creator', () => {
    const { result } = renderHook(() => useSpecificErrors())
    
    const error = result.current.accountNotFound('token account')
    expect(error.title).toBe('Account Not Found')
    expect(error.message).toContain('token account')
    expect(error.category).toBe('account')
  })

  it('should return stable references', () => {
    const { result, rerender } = renderHook(() => useSpecificErrors())
    
    const firstRender = result.current
    rerender()
    const secondRender = result.current
    
    expect(firstRender.insufficientBalance).toBe(secondRender.insufficientBalance)
    expect(firstRender.walletNotConnected).toBe(secondRender.walletNotConnected)
    expect(firstRender.networkTimeout).toBe(secondRender.networkTimeout)
    expect(firstRender.accountNotFound).toBe(secondRender.accountNotFound)
  })
})
