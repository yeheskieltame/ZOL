import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TransactionLoading } from '@/components/transaction-loading';
import { TransactionSuccessModal } from '@/components/transaction-success-modal';
import { TransactionFeedback } from '@/components/transaction-feedback';
import type { TransactionStatus } from '@/hooks/use-zol-transactions';

// Mock the config
jest.mock('@/lib/config', () => ({
  SOLANA_CONFIG: {
    cluster: 'devnet',
  },
}));

describe('TransactionLoading', () => {
  it('should not render when status is idle', () => {
    const { container } = render(
      <TransactionLoading status="idle" signature={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render processing state with spinner', () => {
    render(
      <TransactionLoading
        status="processing"
        signature={null}
        operationName="Deposit"
      />
    );
    
    expect(screen.getByText('Deposit in progress...')).toBeInTheDocument();
    expect(screen.getByText('Waiting for blockchain confirmation')).toBeInTheDocument();
  });

  it('should render confirmed state with success icon', () => {
    const signature = '5J8H5sTvEhnGcB7vJzBbKZ8z9YqYzKqYzKqYzKqYzKqYzKqYzKqYzKqYzKqYzKqYzKqYzKqYzKqY';
    
    render(
      <TransactionLoading
        status="confirmed"
        signature={signature}
        operationName="Withdraw"
      />
    );
    
    expect(screen.getByText('Withdraw confirmed')).toBeInTheDocument();
    expect(screen.getByText('Transaction has been confirmed on the blockchain')).toBeInTheDocument();
  });

  it('should render finalized state', () => {
    render(
      <TransactionLoading
        status="finalized"
        signature="test-signature"
        operationName="Register"
      />
    );
    
    expect(screen.getByText('Register finalized')).toBeInTheDocument();
    expect(screen.getByText('Transaction has been finalized on the blockchain')).toBeInTheDocument();
  });

  it('should render error state', () => {
    render(
      <TransactionLoading
        status="error"
        signature={null}
        operationName="Transaction"
      />
    );
    
    expect(screen.getByText('Transaction failed')).toBeInTheDocument();
    expect(screen.getByText('An error occurred during transaction processing')).toBeInTheDocument();
  });

  it('should display transaction signature when available', () => {
    const signature = '5J8H5sTvEhnGcB7vJzBbKZ8z9YqYzKqYzKqYzKqYzKqYzKqYzKqYzKqYzKqYzKqYzKqYzKqYzKqY';
    
    render(
      <TransactionLoading
        status="confirmed"
        signature={signature}
      />
    );
    
    expect(screen.getByText(/Signature:/)).toBeInTheDocument();
    expect(screen.getByText(/5J8H5sTv...zKqYzKqY/)).toBeInTheDocument();
  });

  it('should show delay warning after threshold', async () => {
    jest.useFakeTimers();
    
    render(
      <TransactionLoading
        status="processing"
        signature={null}
        showDelayWarning={true}
        delayThreshold={5000}
      />
    );
    
    // Initially no delay warning
    expect(screen.queryByText(/taking longer than expected/)).not.toBeInTheDocument();
    
    // Fast-forward time past threshold
    jest.advanceTimersByTime(6000);
    
    await waitFor(() => {
      expect(screen.getByText(/taking longer than expected/)).toBeInTheDocument();
    });
    
    jest.useRealTimers();
  });

  it('should not show delay warning when disabled', async () => {
    jest.useFakeTimers();
    
    render(
      <TransactionLoading
        status="processing"
        signature={null}
        showDelayWarning={false}
        delayThreshold={1000}
      />
    );
    
    jest.advanceTimersByTime(2000);
    
    await waitFor(() => {
      expect(screen.queryByText(/taking longer than expected/)).not.toBeInTheDocument();
    });
    
    jest.useRealTimers();
  });

  it('should display elapsed time in delay warning', async () => {
    jest.useFakeTimers();
    
    render(
      <TransactionLoading
        status="processing"
        signature={null}
        showDelayWarning={true}
        delayThreshold={5000}
      />
    );
    
    jest.advanceTimersByTime(12000);
    
    await waitFor(() => {
      expect(screen.getByText(/12s elapsed/)).toBeInTheDocument();
    });
    
    jest.useRealTimers();
  });
});

describe('TransactionSuccessModal', () => {
  const mockSignature = '5J8H5sTvEhnGcB7vJzBbKZ8z9YqYzKqYzKqYzKqYzKqYzKqYzKqYzKqYzKqYzKqYzKqYzKqYzKqY';

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <TransactionSuccessModal
        isOpen={false}
        onClose={() => {}}
        signature={mockSignature}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render success message and signature', () => {
    render(
      <TransactionSuccessModal
        isOpen={true}
        onClose={() => {}}
        signature={mockSignature}
        operationName="Deposit"
      />
    );
    
    expect(screen.getByText('Deposit Completed')).toBeInTheDocument();
    expect(screen.getByText('Your transaction has been confirmed on the Solana blockchain')).toBeInTheDocument();
    expect(screen.getByText(mockSignature)).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = jest.fn();
    
    render(
      <TransactionSuccessModal
        isOpen={true}
        onClose={onClose}
        signature={mockSignature}
      />
    );
    
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onDataRefresh when modal is closed', () => {
    const onDataRefresh = jest.fn();
    const onClose = jest.fn();
    
    render(
      <TransactionSuccessModal
        isOpen={true}
        onClose={onClose}
        signature={mockSignature}
        onDataRefresh={onDataRefresh}
      />
    );
    
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    
    expect(onDataRefresh).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should copy signature to clipboard', async () => {
    const mockClipboard = {
      writeText: jest.fn().mockResolvedValue(undefined),
    };
    Object.assign(navigator, { clipboard: mockClipboard });
    
    render(
      <TransactionSuccessModal
        isOpen={true}
        onClose={() => {}}
        signature={mockSignature}
      />
    );
    
    const copyButton = screen.getByTitle('Copy signature');
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith(mockSignature);
      expect(screen.getByText('Signature copied to clipboard!')).toBeInTheDocument();
    });
  });

  it('should render explorer link with correct URL for devnet', () => {
    render(
      <TransactionSuccessModal
        isOpen={true}
        onClose={() => {}}
        signature={mockSignature}
      />
    );
    
    const explorerLink = screen.getByText('View on Solana Explorer').closest('a');
    expect(explorerLink).toHaveAttribute(
      'href',
      `https://explorer.solana.com/tx/${mockSignature}?cluster=devnet`
    );
    expect(explorerLink).toHaveAttribute('target', '_blank');
    expect(explorerLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should use default operation name when not provided', () => {
    render(
      <TransactionSuccessModal
        isOpen={true}
        onClose={() => {}}
        signature={mockSignature}
      />
    );
    
    expect(screen.getByText('Transaction Completed')).toBeInTheDocument();
  });
});

describe('TransactionFeedback', () => {
  const mockSignature = '5J8H5sTvEhnGcB7vJzBbKZ8z9YqYzKqYzKqYzKqYzKqYzKqYzKqYzKqYzKqYzKqYzKqYzKqYzKqY';

  it('should render loading indicator when status is processing', () => {
    render(
      <TransactionFeedback
        status="processing"
        signature={null}
        operationName="Deposit"
        onSuccessClose={() => {}}
      />
    );
    
    expect(screen.getByText('Deposit in progress...')).toBeInTheDocument();
  });

  it('should render success modal when status is confirmed', () => {
    render(
      <TransactionFeedback
        status="confirmed"
        signature={mockSignature}
        operationName="Withdraw"
        onSuccessClose={() => {}}
      />
    );
    
    expect(screen.getByText('Withdraw Completed')).toBeInTheDocument();
  });

  it('should render success modal when status is finalized', () => {
    render(
      <TransactionFeedback
        status="finalized"
        signature={mockSignature}
        operationName="Register"
        onSuccessClose={() => {}}
      />
    );
    
    expect(screen.getByText('Register Completed')).toBeInTheDocument();
  });

  it('should not render anything when status is idle', () => {
    const { container } = render(
      <TransactionFeedback
        status="idle"
        signature={null}
        onSuccessClose={() => {}}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('should not render anything when status is error', () => {
    const { container } = render(
      <TransactionFeedback
        status="error"
        signature={null}
        onSuccessClose={() => {}}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('should call onSuccessClose when success modal is closed', () => {
    const onSuccessClose = jest.fn();
    
    render(
      <TransactionFeedback
        status="confirmed"
        signature={mockSignature}
        onSuccessClose={onSuccessClose}
      />
    );
    
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    
    expect(onSuccessClose).toHaveBeenCalledTimes(1);
  });

  it('should call onDataRefresh when success modal is closed', () => {
    const onDataRefresh = jest.fn();
    const onSuccessClose = jest.fn();
    
    render(
      <TransactionFeedback
        status="confirmed"
        signature={mockSignature}
        onSuccessClose={onSuccessClose}
        onDataRefresh={onDataRefresh}
      />
    );
    
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    
    expect(onDataRefresh).toHaveBeenCalledTimes(1);
  });

  it('should pass showDelayWarning prop to TransactionLoading', async () => {
    jest.useFakeTimers();
    
    render(
      <TransactionFeedback
        status="processing"
        signature={null}
        showDelayWarning={true}
        onSuccessClose={() => {}}
      />
    );
    
    jest.advanceTimersByTime(11000);
    
    await waitFor(() => {
      expect(screen.getByText(/taking longer than expected/)).toBeInTheDocument();
    });
    
    jest.useRealTimers();
  });
});
