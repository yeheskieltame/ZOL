import { renderHook, act } from '@testing-library/react';
import { useTransactionFeedback } from '@/hooks/use-transaction-feedback';

describe('useTransactionFeedback', () => {
  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useTransactionFeedback());
    
    expect(result.current.feedbackState).toEqual({
      showLoading: false,
      showSuccess: false,
      signature: null,
      status: 'idle',
      operationName: 'Transaction',
    });
  });

  it('should start transaction with operation name', () => {
    const { result } = renderHook(() => useTransactionFeedback());
    
    act(() => {
      result.current.startTransaction('Deposit');
    });
    
    expect(result.current.feedbackState.operationName).toBe('Deposit');
    expect(result.current.feedbackState.status).toBe('idle');
  });

  it('should show loading when status is processing', () => {
    const { result } = renderHook(() => useTransactionFeedback());
    
    act(() => {
      result.current.updateStatus('processing');
    });
    
    expect(result.current.feedbackState.showLoading).toBe(true);
    expect(result.current.feedbackState.showSuccess).toBe(false);
    expect(result.current.feedbackState.status).toBe('processing');
  });

  it('should show success modal when status is confirmed', () => {
    const { result } = renderHook(() => useTransactionFeedback());
    const signature = 'test-signature-123';
    
    act(() => {
      result.current.updateStatus('confirmed', signature);
    });
    
    expect(result.current.feedbackState.showLoading).toBe(false);
    expect(result.current.feedbackState.showSuccess).toBe(true);
    expect(result.current.feedbackState.status).toBe('confirmed');
    expect(result.current.feedbackState.signature).toBe(signature);
  });

  it('should show success modal when status is finalized', () => {
    const { result } = renderHook(() => useTransactionFeedback());
    const signature = 'test-signature-456';
    
    act(() => {
      result.current.updateStatus('finalized', signature);
    });
    
    expect(result.current.feedbackState.showLoading).toBe(false);
    expect(result.current.feedbackState.showSuccess).toBe(true);
    expect(result.current.feedbackState.status).toBe('finalized');
    expect(result.current.feedbackState.signature).toBe(signature);
  });

  it('should hide everything when status is error', () => {
    const { result } = renderHook(() => useTransactionFeedback());
    
    // First set to processing
    act(() => {
      result.current.updateStatus('processing');
    });
    
    expect(result.current.feedbackState.showLoading).toBe(true);
    
    // Then set to error
    act(() => {
      result.current.updateStatus('error');
    });
    
    expect(result.current.feedbackState.showLoading).toBe(false);
    expect(result.current.feedbackState.showSuccess).toBe(false);
    expect(result.current.feedbackState.status).toBe('error');
  });

  it('should preserve signature when updating status', () => {
    const { result } = renderHook(() => useTransactionFeedback());
    const signature = 'test-signature-789';
    
    act(() => {
      result.current.updateStatus('processing', signature);
    });
    
    expect(result.current.feedbackState.signature).toBe(signature);
    
    act(() => {
      result.current.updateStatus('confirmed');
    });
    
    expect(result.current.feedbackState.signature).toBe(signature);
  });

  it('should close success modal and reset status to idle', () => {
    const { result } = renderHook(() => useTransactionFeedback());
    
    act(() => {
      result.current.updateStatus('confirmed', 'test-sig');
    });
    
    expect(result.current.feedbackState.showSuccess).toBe(true);
    
    act(() => {
      result.current.closeSuccess();
    });
    
    expect(result.current.feedbackState.showSuccess).toBe(false);
    expect(result.current.feedbackState.status).toBe('idle');
  });

  it('should reset all state', () => {
    const { result } = renderHook(() => useTransactionFeedback());
    
    // Set some state
    act(() => {
      result.current.startTransaction('Withdraw');
      result.current.updateStatus('confirmed', 'test-signature');
    });
    
    expect(result.current.feedbackState.operationName).toBe('Withdraw');
    expect(result.current.feedbackState.signature).toBe('test-signature');
    
    // Reset
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.feedbackState).toEqual({
      showLoading: false,
      showSuccess: false,
      signature: null,
      status: 'idle',
      operationName: 'Transaction',
    });
  });

  it('should handle complete transaction flow', () => {
    const { result } = renderHook(() => useTransactionFeedback());
    
    // Start transaction
    act(() => {
      result.current.startTransaction('Deposit');
    });
    
    expect(result.current.feedbackState.operationName).toBe('Deposit');
    expect(result.current.feedbackState.status).toBe('idle');
    
    // Processing
    act(() => {
      result.current.updateStatus('processing');
    });
    
    expect(result.current.feedbackState.showLoading).toBe(true);
    expect(result.current.feedbackState.status).toBe('processing');
    
    // Confirmed
    act(() => {
      result.current.updateStatus('confirmed', 'sig-123');
    });
    
    expect(result.current.feedbackState.showLoading).toBe(false);
    expect(result.current.feedbackState.showSuccess).toBe(true);
    expect(result.current.feedbackState.signature).toBe('sig-123');
    
    // Close success
    act(() => {
      result.current.closeSuccess();
    });
    
    expect(result.current.feedbackState.showSuccess).toBe(false);
    expect(result.current.feedbackState.status).toBe('idle');
  });

  it('should handle transaction failure flow', () => {
    const { result } = renderHook(() => useTransactionFeedback());
    
    // Start and process
    act(() => {
      result.current.startTransaction('Withdraw');
      result.current.updateStatus('processing');
    });
    
    expect(result.current.feedbackState.showLoading).toBe(true);
    
    // Error
    act(() => {
      result.current.updateStatus('error');
    });
    
    expect(result.current.feedbackState.showLoading).toBe(false);
    expect(result.current.feedbackState.showSuccess).toBe(false);
    expect(result.current.feedbackState.status).toBe('error');
  });
});
