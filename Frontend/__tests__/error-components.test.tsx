import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ErrorModal } from '@/components/error-modal'
import { ErrorDisplay } from '@/components/error-display'
import { UserFriendlyError } from '@/lib/error-parser'

describe('ErrorModal', () => {
  const mockError: UserFriendlyError = {
    title: 'Test Error',
    message: 'This is a test error message',
    details: 'Error details for debugging',
    retryable: true,
    actionLabel: 'Try Again',
    category: 'transaction',
  }

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <ErrorModal isOpen={false} onClose={() => {}} error={mockError} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should not render when error is null', () => {
    const { container } = render(
      <ErrorModal isOpen={true} onClose={() => {}} error={null} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should render error title and message', () => {
    render(<ErrorModal isOpen={true} onClose={() => {}} error={mockError} />)
    expect(screen.getByText('Test Error')).toBeInTheDocument()
    expect(screen.getByText('This is a test error message')).toBeInTheDocument()
  })

  it('should render error details in collapsible section', () => {
    render(<ErrorModal isOpen={true} onClose={() => {}} error={mockError} />)
    expect(screen.getByText('Technical Details')).toBeInTheDocument()
    expect(screen.getByText('Error details for debugging')).toBeInTheDocument()
  })

  it('should display error category badge', () => {
    render(<ErrorModal isOpen={true} onClose={() => {}} error={mockError} />)
    expect(screen.getByText('TRANSACTION')).toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', () => {
    const onClose = jest.fn()
    render(<ErrorModal isOpen={true} onClose={onClose} error={mockError} />)
    
    const closeButton = screen.getByLabelText('Close error modal')
    fireEvent.click(closeButton)
    
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should call onClose when backdrop is clicked', () => {
    const onClose = jest.fn()
    const { container } = render(
      <ErrorModal isOpen={true} onClose={onClose} error={mockError} />
    )
    
    const backdrop = container.querySelector('.absolute.inset-0')
    if (backdrop) {
      fireEvent.click(backdrop)
    }
    
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should show retry button for retryable errors', () => {
    const onRetry = jest.fn()
    render(
      <ErrorModal isOpen={true} onClose={() => {}} error={mockError} onRetry={onRetry} />
    )
    
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('should call onRetry and onClose when retry button is clicked', () => {
    const onRetry = jest.fn()
    const onClose = jest.fn()
    render(
      <ErrorModal isOpen={true} onClose={onClose} error={mockError} onRetry={onRetry} />
    )
    
    const retryButton = screen.getByText('Try Again')
    fireEvent.click(retryButton)
    
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should not show retry button for non-retryable errors', () => {
    const nonRetryableError: UserFriendlyError = {
      ...mockError,
      retryable: false,
    }
    render(
      <ErrorModal isOpen={true} onClose={() => {}} error={nonRetryableError} />
    )
    
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument()
    expect(screen.getByText('Close')).toBeInTheDocument()
  })

  it('should show "Cancel" button when retry is available', () => {
    const onRetry = jest.fn()
    render(
      <ErrorModal isOpen={true} onClose={() => {}} error={mockError} onRetry={onRetry} />
    )
    
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('should not render details section when details are not provided', () => {
    const errorWithoutDetails: UserFriendlyError = {
      ...mockError,
      details: undefined,
    }
    render(
      <ErrorModal isOpen={true} onClose={() => {}} error={errorWithoutDetails} />
    )
    
    expect(screen.queryByText('Technical Details')).not.toBeInTheDocument()
  })
})

describe('ErrorDisplay', () => {
  const mockError: UserFriendlyError = {
    title: 'Network Error',
    message: 'Unable to connect to the network',
    details: 'Connection timeout after 30s',
    retryable: true,
    actionLabel: 'Retry',
    category: 'network',
  }

  it('should not render when error is null', () => {
    const { container } = render(<ErrorDisplay error={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('should render error title and message', () => {
    render(<ErrorDisplay error={mockError} />)
    expect(screen.getByText('Network Error')).toBeInTheDocument()
    expect(screen.getByText('Unable to connect to the network')).toBeInTheDocument()
  })

  it('should render details in collapsible section', () => {
    render(<ErrorDisplay error={mockError} />)
    expect(screen.getByText('Show details')).toBeInTheDocument()
    expect(screen.getByText('Connection timeout after 30s')).toBeInTheDocument()
  })

  it('should call onRetry when retry button is clicked', () => {
    const onRetry = jest.fn()
    render(<ErrorDisplay error={mockError} onRetry={onRetry} />)
    
    const retryButton = screen.getByText('Retry')
    fireEvent.click(retryButton)
    
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('should call onDismiss when dismiss button is clicked', () => {
    const onDismiss = jest.fn()
    render(<ErrorDisplay error={mockError} onDismiss={onDismiss} />)
    
    const dismissButton = screen.getByText('Dismiss')
    fireEvent.click(dismissButton)
    
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('should not show retry button for non-retryable errors', () => {
    const nonRetryableError: UserFriendlyError = {
      ...mockError,
      retryable: false,
    }
    render(<ErrorDisplay error={nonRetryableError} onRetry={() => {}} />)
    
    expect(screen.queryByText('Retry')).not.toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <ErrorDisplay error={mockError} className="custom-class" />
    )
    
    const errorDiv = container.firstChild as HTMLElement
    expect(errorDiv.className).toContain('custom-class')
  })

  it('should render appropriate icon for wallet errors', () => {
    const walletError: UserFriendlyError = {
      ...mockError,
      category: 'wallet',
    }
    const { container } = render(<ErrorDisplay error={walletError} />)
    expect(container.querySelector('.border-yellow-500')).toBeInTheDocument()
  })

  it('should render appropriate icon for program errors', () => {
    const programError: UserFriendlyError = {
      ...mockError,
      category: 'program',
    }
    const { container } = render(<ErrorDisplay error={programError} />)
    expect(container.querySelector('.border-red-500')).toBeInTheDocument()
  })

  it('should render appropriate icon for account errors', () => {
    const accountError: UserFriendlyError = {
      ...mockError,
      category: 'account',
    }
    const { container } = render(<ErrorDisplay error={accountError} />)
    expect(container.querySelector('.border-blue-500')).toBeInTheDocument()
  })

  it('should not render action buttons when neither onRetry nor onDismiss provided', () => {
    const nonRetryableError: UserFriendlyError = {
      ...mockError,
      retryable: false,
    }
    render(<ErrorDisplay error={nonRetryableError} />)
    
    expect(screen.queryByText('Retry')).not.toBeInTheDocument()
    expect(screen.queryByText('Dismiss')).not.toBeInTheDocument()
  })
})
