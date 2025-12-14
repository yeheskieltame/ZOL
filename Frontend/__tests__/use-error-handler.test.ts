import { renderHook, act } from '@testing-library/react'
import { useErrorHandler } from '@/hooks/use-error-handler'

describe('useErrorHandler', () => {
  beforeEach(() => {
    // Suppress console.error for cleaner test output
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should initialize with null error', () => {
    const { result } = renderHook(() => useErrorHandler())
    expect(result.current.error).toBeNull()
  })

  it('should set error and parse it', () => {
    const { result } = renderHook(() => useErrorHandler())
    
    act(() => {
      result.current.setError(new Error('Test error'))
    })
    
    expect(result.current.error).not.toBeNull()
    expect(result.current.error?.message).toContain('error')
  })

  it('should clear error', () => {
    const { result } = renderHook(() => useErrorHandler())
    
    act(() => {
      result.current.setError(new Error('Test error'))
    })
    
    expect(result.current.error).not.toBeNull()
    
    act(() => {
      result.current.clearError()
    })
    
    expect(result.current.error).toBeNull()
  })

  it('should handle error and log it', () => {
    const consoleSpy = jest.spyOn(console, 'error')
    const { result } = renderHook(() => useErrorHandler())
    
    const testError = new Error('Test error')
    
    act(() => {
      result.current.handleError(testError)
    })
    
    expect(result.current.error).not.toBeNull()
    expect(consoleSpy).toHaveBeenCalledWith('Error occurred:', testError)
  })

  it('should parse user rejected errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler())
    
    act(() => {
      result.current.setError(new Error('User rejected the request'))
    })
    
    expect(result.current.error?.title).toBe('Transaction Cancelled')
    expect(result.current.error?.retryable).toBe(false)
    expect(result.current.error?.category).toBe('wallet')
  })

  it('should parse network errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler())
    
    act(() => {
      result.current.setError(new Error('Network request failed'))
    })
    
    expect(result.current.error?.title).toBe('Network Error')
    expect(result.current.error?.retryable).toBe(true)
    expect(result.current.error?.category).toBe('network')
  })

  it('should parse program errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler())
    
    act(() => {
      result.current.setError(new Error('custom program error: 0x1770'))
    })
    
    expect(result.current.error?.title).toBe('Invalid Faction')
    expect(result.current.error?.retryable).toBe(false)
    expect(result.current.error?.category).toBe('program')
  })

  it('should handle null errors', () => {
    const { result } = renderHook(() => useErrorHandler())
    
    act(() => {
      result.current.setError(null)
    })
    
    expect(result.current.error).not.toBeNull()
    expect(result.current.error?.title).toBe('Unknown Error')
  })

  it('should handle string errors', () => {
    const { result } = renderHook(() => useErrorHandler())
    
    act(() => {
      result.current.setError('Simple string error')
    })
    
    expect(result.current.error).not.toBeNull()
    expect(result.current.error?.details).toContain('Simple string error')
  })

  it('should maintain stable function references', () => {
    const { result, rerender } = renderHook(() => useErrorHandler())
    
    const setError1 = result.current.setError
    const clearError1 = result.current.clearError
    const handleError1 = result.current.handleError
    
    rerender()
    
    expect(result.current.setError).toBe(setError1)
    expect(result.current.clearError).toBe(clearError1)
    expect(result.current.handleError).toBe(handleError1)
  })
})
