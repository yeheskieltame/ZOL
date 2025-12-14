'use client';

import { CheckCircle2, ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '@/components/modal';
import { SOLANA_CONFIG } from '@/lib/config';

interface TransactionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  signature: string;
  operationName?: string;
  onDataRefresh?: () => void;
}

/**
 * TransactionSuccessModal Component
 * 
 * Displays a success modal after a transaction is confirmed.
 * Shows the transaction signature with copy functionality.
 * Provides a link to view the transaction on Solana Explorer.
 * Optionally triggers data refresh after transaction completion.
 * 
 * Requirements: 11.2, 11.5
 * 
 * @param isOpen - Whether the modal is open
 * @param onClose - Callback when modal is closed
 * @param signature - Transaction signature
 * @param operationName - Name of the completed operation
 * @param onDataRefresh - Optional callback to refresh data after transaction
 */
export function TransactionSuccessModal({
  isOpen,
  onClose,
  signature,
  operationName = 'Transaction',
  onDataRefresh,
}: TransactionSuccessModalProps) {
  const [copied, setCopied] = useState(false);

  /**
   * Get Solana Explorer URL for the transaction
   */
  const getExplorerUrl = (sig: string): string => {
    const cluster = SOLANA_CONFIG.cluster === 'mainnet-beta' ? '' : `?cluster=${SOLANA_CONFIG.cluster}`;
    return `https://explorer.solana.com/tx/${sig}${cluster}`;
  };

  /**
   * Copy signature to clipboard
   */
  const handleCopySignature = async () => {
    try {
      await navigator.clipboard.writeText(signature);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy signature:', err);
    }
  };

  /**
   * Handle modal close with optional data refresh
   */
  const handleClose = () => {
    if (onDataRefresh) {
      onDataRefresh();
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Transaction Successful"
      maxWidth="max-w-lg"
    >
      <div className="space-y-6">
        {/* Success icon and message */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {operationName} Completed
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Your transaction has been confirmed on the Solana blockchain
            </p>
          </div>
        </div>

        {/* Transaction signature */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">
            Transaction Signature
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded px-3 py-2">
              <p className="text-xs font-mono text-gray-900 truncate">
                {signature}
              </p>
            </div>
            <button
              onClick={handleCopySignature}
              className="flex-shrink-0 border border-black px-3 py-2 hover:bg-gray-100 transition-colors"
              title="Copy signature"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 text-black" />
              )}
            </button>
          </div>
          {copied && (
            <p className="text-xs text-green-600">Signature copied to clipboard!</p>
          )}
        </div>

        {/* Explorer link */}
        <div>
          <a
            href={getExplorerUrl(signature)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full border-2 border-black bg-white px-4 py-3 text-sm font-medium text-black hover:bg-gray-100 transition-colors"
          >
            <span>View on Solana Explorer</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {/* Close button */}
        <div>
          <button
            onClick={handleClose}
            className="w-full border-2 border-black bg-black px-4 py-3 text-sm font-medium text-white hover:bg-gray-900 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
