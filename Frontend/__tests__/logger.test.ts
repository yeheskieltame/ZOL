/**
 * Unit tests for the logging system
 */

import { Logger, logger } from '@/lib/logger';

describe('Logger', () => {
  let testLogger: Logger;

  beforeEach(() => {
    testLogger = new Logger({ enabled: true, minLevel: 'debug', persistLogs: true });
    testLogger.clearLogs();
  });

  describe('Wallet event logging', () => {
    it('should log wallet connection', () => {
      const publicKey = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
      const balance = 1.5;

      testLogger.walletConnected(publicKey, balance);

      const logs = testLogger.getLogs('wallet');
      expect(logs).toHaveLength(1);
      expect(logs[0].category).toBe('wallet');
      expect(logs[0].level).toBe('info');
      expect(logs[0].message).toBe('Wallet connected');
      expect(logs[0].metadata).toEqual({ publicKey, balance });
    });

    it('should log wallet disconnection', () => {
      const publicKey = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

      testLogger.walletDisconnected(publicKey);

      const logs = testLogger.getLogs('wallet');
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Wallet disconnected');
    });

    it('should log wallet connection failure', () => {
      const error = new Error('Connection refused');

      testLogger.walletConnectionFailed(error);

      const logs = testLogger.getLogs('wallet', 'error');
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('error');
      expect(logs[0].metadata?.error).toBe('Connection refused');
    });
  });

  describe('Transaction event logging', () => {
    it('should log transaction submission', () => {
      const signature = '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';
      const type = 'deposit';

      testLogger.transactionSubmitted(signature, type, { amount: 1000000 });

      const logs = testLogger.getLogs('transaction');
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Transaction submitted');
      expect(logs[0].metadata?.signature).toBe(signature);
      expect(logs[0].metadata?.type).toBe(type);
    });

    it('should log transaction confirmation', () => {
      const signature = '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';
      const type = 'withdraw';
      const slot = 12345;

      testLogger.transactionConfirmed(signature, type, slot);

      const logs = testLogger.getLogs('transaction');
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Transaction confirmed');
      expect(logs[0].metadata?.slot).toBe(slot);
    });

    it('should log transaction failure', () => {
      const signature = '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';
      const type = 'register';
      const error = new Error('Insufficient funds');

      testLogger.transactionFailed(signature, type, error);

      const logs = testLogger.getLogs('transaction', 'error');
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('error');
      expect(logs[0].metadata?.error).toBe('Insufficient funds');
    });
  });

  describe('RPC event logging', () => {
    it('should log RPC request', () => {
      const method = 'getAccountInfo';
      const endpoint = 'https://api.devnet.solana.com';

      testLogger.rpcRequest(method, endpoint);

      const logs = testLogger.getLogs('rpc');
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('debug');
      expect(logs[0].metadata?.method).toBe(method);
    });

    it('should log RPC response', () => {
      const method = 'getAccountInfo';
      const endpoint = 'https://api.devnet.solana.com';
      const duration = 150;

      testLogger.rpcResponse(method, endpoint, duration);

      const logs = testLogger.getLogs('rpc');
      expect(logs).toHaveLength(1);
      expect(logs[0].metadata?.duration).toBe(duration);
    });

    it('should log RPC error', () => {
      const method = 'getAccountInfo';
      const endpoint = 'https://api.devnet.solana.com';
      const error = new Error('Network timeout');

      testLogger.rpcError(method, endpoint, error);

      const logs = testLogger.getLogs('rpc', 'error');
      expect(logs).toHaveLength(1);
      expect(logs[0].metadata?.error).toBe('Network timeout');
    });

    it('should log RPC endpoint switch', () => {
      testLogger.rpcEndpointSwitched(0, 1);

      const logs = testLogger.getLogs('rpc', 'warn');
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('RPC endpoint switched');
    });
  });

  describe('UI event logging', () => {
    it('should log page view', () => {
      testLogger.pageView('arena');

      const logs = testLogger.getLogs('ui');
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Page viewed');
      expect(logs[0].metadata?.page).toBe('arena');
    });

    it('should log user action', () => {
      testLogger.userAction('deposit_initiated', { amount: 1000000 });

      const logs = testLogger.getLogs('ui');
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('User action');
      expect(logs[0].metadata?.action).toBe('deposit_initiated');
    });

    it('should log modal events', () => {
      testLogger.modalOpened('deposit');
      testLogger.modalClosed('deposit');

      const logs = testLogger.getLogs('ui');
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('Modal opened');
      expect(logs[1].message).toBe('Modal closed');
    });
  });

  describe('Log management', () => {
    it('should filter logs by category', () => {
      testLogger.walletConnected('test');
      testLogger.transactionSubmitted('sig', 'deposit');
      testLogger.rpcRequest('method', 'endpoint');

      const walletLogs = testLogger.getLogs('wallet');
      const transactionLogs = testLogger.getLogs('transaction');
      const rpcLogs = testLogger.getLogs('rpc');

      expect(walletLogs).toHaveLength(1);
      expect(transactionLogs).toHaveLength(1);
      expect(rpcLogs).toHaveLength(1);
    });

    it('should filter logs by level', () => {
      testLogger.walletConnected('test'); // info
      testLogger.walletConnectionFailed(new Error('test')); // error
      testLogger.rpcRequest('method', 'endpoint'); // debug

      const errorLogs = testLogger.getErrorLogs();
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].level).toBe('error');
    });

    it('should clear logs', () => {
      testLogger.walletConnected('test');
      testLogger.transactionSubmitted('sig', 'deposit');

      expect(testLogger.getLogs()).toHaveLength(2);

      testLogger.clearLogs();

      expect(testLogger.getLogs()).toHaveLength(0);
    });

    it('should limit log size', () => {
      const smallLogger = new Logger({ maxLogSize: 5 });

      for (let i = 0; i < 10; i++) {
        smallLogger.walletConnected(`test-${i}`);
      }

      const logs = smallLogger.getLogs();
      expect(logs.length).toBeLessThanOrEqual(5);
    });

    it('should export logs as JSON', () => {
      testLogger.walletConnected('test');
      testLogger.transactionSubmitted('sig', 'deposit');

      const exported = testLogger.exportLogs();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });

    it('should provide log statistics', () => {
      testLogger.walletConnected('test');
      testLogger.transactionSubmitted('sig', 'deposit');
      testLogger.rpcError('method', 'endpoint', new Error('test'));

      const stats = testLogger.getLogStats();

      expect(stats.total).toBe(3);
      expect(stats.byCategory.wallet).toBe(1);
      expect(stats.byCategory.transaction).toBe(1);
      expect(stats.byCategory.rpc).toBe(1);
      expect(stats.byLevel.info).toBe(2);
      expect(stats.byLevel.error).toBe(1);
    });
  });

  describe('Log level filtering', () => {
    it('should respect minimum log level', () => {
      const infoLogger = new Logger({ minLevel: 'info' });

      infoLogger.rpcRequest('method', 'endpoint'); // debug - should not log
      infoLogger.walletConnected('test'); // info - should log

      const logs = infoLogger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('info');
    });

    it('should disable logging when enabled is false', () => {
      const disabledLogger = new Logger({ enabled: false });

      disabledLogger.walletConnected('test');
      disabledLogger.transactionSubmitted('sig', 'deposit');

      const logs = disabledLogger.getLogs();
      expect(logs).toHaveLength(0);
    });
  });
});
