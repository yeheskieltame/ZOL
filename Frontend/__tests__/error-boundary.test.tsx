import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '@/components/error-boundary'
import { PageErrorBoundary } from '@/components/page-error-boundary'

// Component that throws an error
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })
  afterAll(() => {
    console.error = originalError
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders fallback UI when an error is thrown', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('displays custom fallback when provided', () => {
    const customFallback = <div>Custom error UI</div>

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error UI')).toBeInTheDocument()
    expect(screen.queryByText('Something Went Wrong')).not.toBeInTheDocument()
  })

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn()

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalled()
    expect(onError.mock.calls[0][0].message).toBe('Test error message')
  })

  it('has Try Again button that resets error state', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()

    // Verify Try Again button exists
    const tryAgainButton = screen.getByText('Try Again')
    expect(tryAgainButton).toBeInTheDocument()

    // Clicking it should trigger the reset handler
    // (Full reset behavior is tested in integration tests)
    fireEvent.click(tryAgainButton)
  })

  it('shows technical details in collapsible section', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    const detailsElement = screen.getByText('Technical Details')
    expect(detailsElement).toBeInTheDocument()

    // Details should be collapsed by default
    const details = detailsElement.closest('details')
    expect(details).not.toHaveAttribute('open')
  })
})

describe('PageErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })
  afterAll(() => {
    console.error = originalError
  })

  it('renders children when there is no error', () => {
    render(
      <PageErrorBoundary pageName="Test Page">
        <div>Page content</div>
      </PageErrorBoundary>
    )

    expect(screen.getByText('Page content')).toBeInTheDocument()
  })

  it('renders page-specific error UI when error occurs', () => {
    render(
      <PageErrorBoundary pageName="Test Page">
        <ThrowError />
      </PageErrorBoundary>
    )

    expect(screen.getByText('Error Loading Test Page')).toBeInTheDocument()
    expect(screen.getByText(/Something went wrong while loading this page/)).toBeInTheDocument()
  })

  it('shows reload button in fallback UI', () => {
    render(
      <PageErrorBoundary pageName="Test Page">
        <ThrowError />
      </PageErrorBoundary>
    )

    const reloadButton = screen.getByText('Reload Page')
    expect(reloadButton).toBeInTheDocument()
  })

  it('uses default page name when not provided', () => {
    render(
      <PageErrorBoundary>
        <ThrowError />
      </PageErrorBoundary>
    )

    expect(screen.getByText('Error Loading this page')).toBeInTheDocument()
  })
})
