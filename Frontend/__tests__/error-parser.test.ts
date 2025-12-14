import {
  parseTransactionError,
  mapProgramError,
  isRetryableError,
  extractTransactionSignature,
  formatErrorDetails,
  ProgramErrorCode,
  UserFriendlyError,
  createInsufficientBalanceError,
  createWalletNotConnectedError,
  createNetworkTimeoutError,
  createAccountNotFoundError,
} from '@/lib/error-parser'

describe('Error Parser', () => {
  describe('parseTransactionError', () => {
    it('should handle null/undefined errors', () => {
      const result = parseTransactionError(null)
      expect(result.title).toBe('Unknown Error')
      expect(result.retryable).toBe(true)
      expect(result.category).toBe('transaction')
    })

    it('should parse user rejected transaction', () => {
      const error = new Error('User rejected the request')
      const result = parseTransactionError(error)
      expect(result.title).toBe('Transaction Cancelled')
      expect(result.retryable).toBe(false)
      expect(result.category).toBe('wallet')
    })

    it('should parse wallet not connected error', () => {
      const error = new Error('Wallet not connected')
      const result = parseTransactionError(error)
      expect(result.title).toBe('Wallet Not Connected')
      expect(result.retryable).toBe(false)
      expect(result.category).toBe('wallet')
    })

    it('should parse network errors', () => {
      const error = new Error('Network request failed')
      const result = parseTransactionError(error)
      expect(result.title).toBe('Network Error')
      expect(result.retryable).toBe(true)
      expect(result.actionLabel).toBe('Retry')
      expect(result.category).toBe('network')
    })

    it('should parse rate limiting errors', () => {
      const error = new Error('429 Too many requests')
      const result = parseTransactionError(error)
      expect(result.title).toBe('Rate Limited')
      expect(result.retryable).toBe(true)
      expect(result.category).toBe('network')
    })

    it('should parse insufficient SOL errors', () => {
      const error = new Error('Attempt to debit an account but found no record of a prior credit')
      const result = parseTransactionError(error)
      expect(result.title).toBe('Insufficient SOL')
      expect(result.retryable).toBe(false)
      expect(result.category).toBe('wallet')
    })

    it('should parse account not found errors', () => {
      const error = new Error('Account does not exist')
      const result = parseTransactionError(error)
      expect(result.title).toBe('Account Not Found')
      expect(result.retryable).toBe(false)
      expect(result.category).toBe('account')
    })

    it('should parse blockhash not found errors', () => {
      const error = new Error('Blockhash not found')
      const result = parseTransactionError(error)
      expect(result.title).toBe('Transaction Expired')
      expect(result.retryable).toBe(true)
      expect(result.category).toBe('transaction')
    })

    it('should parse program error with hex code', () => {
      const error = new Error('Transaction simulation failed: custom program error: 0x1770')
      const result = parseTransactionError(error)
      expect(result.title).toBe('Invalid Faction')
      expect(result.category).toBe('program')
      expect(result.retryable).toBe(false)
    })

    it('should parse program error with decimal code', () => {
      const error = new Error('Transaction failed: Error Code: 6001')
      const result = parseTransactionError(error)
      expect(result.title).toBe('Insufficient Funds')
      expect(result.category).toBe('program')
    })

    it('should parse program error by name', () => {
      const error = new Error('Transaction failed: EpochNotEnded')
      const result = parseTransactionError(error)
      expect(result.title).toBe('Epoch Not Ended')
      expect(result.category).toBe('program')
    })

    it('should handle generic errors with fallback', () => {
      const error = new Error('Some unknown error')
      const result = parseTransactionError(error)
      expect(result.title).toBe('Transaction Error')
      expect(result.retryable).toBe(true)
      expect(result.details).toContain('Some unknown error')
    })
  })

  describe('mapProgramError', () => {
    it('should map InvalidFaction error code', () => {
      const result = mapProgramError(ProgramErrorCode.InvalidFaction)
      expect(result.title).toBe('Invalid Faction')
      expect(result.message).toContain('invalid')
      expect(result.category).toBe('program')
      expect(result.retryable).toBe(false)
    })

    it('should map InsufficientFunds error code', () => {
      const result = mapProgramError(ProgramErrorCode.InsufficientFunds)
      expect(result.title).toBe('Insufficient Funds')
      expect(result.message).toContain('enough funds')
      expect(result.category).toBe('program')
    })

    it('should map EpochNotEnded error code', () => {
      const result = mapProgramError(ProgramErrorCode.EpochNotEnded)
      expect(result.title).toBe('Epoch Not Ended')
      expect(result.message).toContain('not ended')
      expect(result.category).toBe('program')
    })

    it('should handle unknown program error codes', () => {
      const result = mapProgramError(9999)
      expect(result.title).toBe('Program Error')
      expect(result.details).toContain('9999')
      expect(result.category).toBe('program')
    })
  })

  describe('isRetryableError', () => {
    it('should return true for network errors', () => {
      const error = new Error('Network request failed')
      expect(isRetryableError(error)).toBe(true)
    })

    it('should return false for user rejected errors', () => {
      const error = new Error('User rejected the request')
      expect(isRetryableError(error)).toBe(false)
    })

    it('should return false for program errors', () => {
      const error = new Error('custom program error: 0x1770')
      expect(isRetryableError(error)).toBe(false)
    })

    it('should return true for blockhash errors', () => {
      const error = new Error('Blockhash not found')
      expect(isRetryableError(error)).toBe(true)
    })
  })

  describe('extractTransactionSignature', () => {
    it('should extract signature from error message', () => {
      const signature = '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW'
      const error = new Error(`Transaction failed with signature: ${signature}`)
      const result = extractTransactionSignature(error)
      expect(result).toBe(signature)
    })

    it('should extract signature from error object', () => {
      const signature = '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW'
      const error = { message: 'Failed', signature }
      const result = extractTransactionSignature(error)
      expect(result).toBe(signature)
    })

    it('should return null if no signature found', () => {
      const error = new Error('Some error without signature')
      const result = extractTransactionSignature(error)
      expect(result).toBe(null)
    })

    it('should handle null error', () => {
      const result = extractTransactionSignature(null)
      expect(result).toBe(null)
    })
  })

  describe('formatErrorDetails', () => {
    it('should format error with message', () => {
      const error = new Error('Test error message')
      const result = formatErrorDetails(error)
      expect(result).toContain('Message: Test error message')
    })

    it('should format error with code and name', () => {
      const error = { message: 'Test', code: 'ERR_001', name: 'TestError' }
      const result = formatErrorDetails(error)
      expect(result).toContain('Message: Test')
      expect(result).toContain('Code: ERR_001')
      expect(result).toContain('Name: TestError')
    })

    it('should include signature if present', () => {
      const signature = '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW'
      const error = { message: 'Failed', signature }
      const result = formatErrorDetails(error)
      expect(result).toContain(`Signature: ${signature}`)
    })

    it('should include logs if present', () => {
      const error = { message: 'Failed', logs: ['Log line 1', 'Log line 2'] }
      const result = formatErrorDetails(error)
      expect(result).toContain('Logs: Log line 1')
      expect(result).toContain('Log line 2')
    })

    it('should handle null error', () => {
      const result = formatErrorDetails(null)
      expect(result).toBe('No error details available')
    })

    it('should convert to string if no details available', () => {
      const error = 'Simple string error'
      const result = formatErrorDetails(error)
      expect(result).toBe('Simple string error')
    })
  })

  describe('Error categories', () => {
    it('should categorize wallet errors correctly', () => {
      const errors = [
        'User rejected the request',
        'Wallet not connected',
        'insufficient lamports',
      ]

      errors.forEach(msg => {
        const result = parseTransactionError(new Error(msg))
        expect(result.category).toBe('wallet')
      })
    })

    it('should categorize network errors correctly', () => {
      const errors = [
        'Network request failed',
        'Failed to fetch',
        'timeout',
        '503 Service Unavailable',
      ]

      errors.forEach(msg => {
        const result = parseTransactionError(new Error(msg))
        expect(result.category).toBe('network')
      })
    })

    it('should categorize program errors correctly', () => {
      const errors = [
        'custom program error: 0x1770',
        'Error Code: 6001',
        'InvalidFaction',
      ]

      errors.forEach(msg => {
        const result = parseTransactionError(new Error(msg))
        expect(result.category).toBe('program')
      })
    })

    it('should categorize account errors correctly', () => {
      const errors = [
        'Account does not exist',
        'AccountNotFound',
        'could not find account',
      ]

      errors.forEach(msg => {
        const result = parseTransactionError(new Error(msg))
        expect(result.category).toBe('account')
      })
    })

    it('should parse insufficient balance errors', () => {
      const errors = [
        'insufficient balance',
        'Insufficient balance',
        'balance too low',
      ]

      errors.forEach(msg => {
        const result = parseTransactionError(new Error(msg))
        expect(result.title).toBe('Insufficient Balance')
        expect(result.category).toBe('wallet')
        expect(result.retryable).toBe(false)
      })
    })

    it('should parse network timeout errors', () => {
      const errors = [
        'timeout',
        'timed out',
        'ETIMEDOUT',
        'Request timeout',
      ]

      errors.forEach(msg => {
        const result = parseTransactionError(new Error(msg))
        expect(result.title).toBe('Network Timeout')
        expect(result.category).toBe('network')
        expect(result.retryable).toBe(true)
      })
    })
  })

  describe('Specific Error Creators', () => {
    describe('createInsufficientBalanceError', () => {
      it('should create insufficient balance error with default token', () => {
        const error = createInsufficientBalanceError()
        expect(error.title).toBe('Insufficient Balance')
        expect(error.message).toContain('USDC')
        expect(error.category).toBe('wallet')
        expect(error.retryable).toBe(false)
      })

      it('should create insufficient balance error with custom token', () => {
        const error = createInsufficientBalanceError('SOL')
        expect(error.message).toContain('SOL')
        expect(error.details).toContain('SOL')
      })
    })

    describe('createWalletNotConnectedError', () => {
      it('should create wallet not connected error', () => {
        const error = createWalletNotConnectedError()
        expect(error.title).toBe('Wallet Not Connected')
        expect(error.message).toContain('connect your Solana wallet')
        expect(error.category).toBe('wallet')
        expect(error.retryable).toBe(false)
      })
    })

    describe('createNetworkTimeoutError', () => {
      it('should create network timeout error', () => {
        const error = createNetworkTimeoutError()
        expect(error.title).toBe('Network Timeout')
        expect(error.message).toContain('took too long')
        expect(error.category).toBe('network')
        expect(error.retryable).toBe(true)
        expect(error.actionLabel).toBe('Retry')
      })
    })

    describe('createAccountNotFoundError', () => {
      it('should create account not found error with default type', () => {
        const error = createAccountNotFoundError()
        expect(error.title).toBe('Account Not Found')
        expect(error.message).toContain('account')
        expect(error.category).toBe('account')
        expect(error.retryable).toBe(false)
      })

      it('should create account not found error with custom type', () => {
        const error = createAccountNotFoundError('user account')
        expect(error.message).toContain('user account')
        expect(error.details).toContain('user account')
      })
    })
  })
})
