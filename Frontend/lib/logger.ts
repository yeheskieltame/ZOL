/**
 * Centralized logging system for the ZOL application
 * Logs wallet events, transaction events, RPC events, and UI events
 * 
 * **Validates: Requirements 1.2, 4.2, 5.2, 6.2, 9.1, 9.2**
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';
export type LogCategory = 'wallet' | 'transaction' | 'rpc' | 'ui';

export interface LogEvent {
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  metadata?: Record<string, any>;
}

export interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  persistLogs: boolean;
  maxLogSize: number;
}

class Logger {
  private config: LoggerConfig;
  private logs: LogEvent[] = [];
  private readonly LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      enabled: true,
      minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      persistLogs: true,
      maxLogSize: 1000,
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return this.LOG_LEVELS[level] >= this.LOG_LEVELS[this.config.minLevel];
  }

  private log(level: LogLevel, category: LogCategory, message: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;

    const logEvent: LogEvent = {
      timestamp: Date.now(),
      level,
      category,
      message,
      metadata,
    };

    // Store log in memory
    if (this.config.persistLogs) {
      this.logs.push(logEvent);
      
      // Trim logs if exceeding max size
      if (this.logs.length > this.config.maxLogSize) {
        this.logs = this.logs.slice(-this.config.maxLogSize);
      }
    }

    // Console output with formatting
    const prefix = `[${category.toUpperCase()}]`;
    const timestamp = new Date(logEvent.timestamp).toISOString();
    const logMessage = `${timestamp} ${prefix} ${message}`;

    switch (level) {
      case 'debug':
        console.debug(logMessage, metadata || '');
        break;
      case 'info':
        console.log(logMessage, metadata || '');
        break;
      case 'warn':
        console.warn(logMessage, metadata || '');
        break;
      case 'error':
        console.error(logMessage, metadata || '');
        break;
    }
  }

  // Wallet event logging
  walletConnected(publicKey: string, balance?: number): void {
    this.log('info', 'wallet', 'Wallet connected', { publicKey, balance });
  }

  walletDisconnected(publicKey?: string): void {
    this.log('info', 'wallet', 'Wallet disconnected', { publicKey });
  }

  walletConnectionFailed(error: Error): void {
    this.log('error', 'wallet', 'Wallet connection failed', {
      error: error.message,
      stack: error.stack,
    });
  }

  walletSignatureRequested(transactionType: string): void {
    this.log('info', 'wallet', 'Signature requested', { transactionType });
  }

  walletSignatureRejected(transactionType: string): void {
    this.log('warn', 'wallet', 'Signature rejected by user', { transactionType });
  }

  // Transaction event logging
  transactionSubmitted(signature: string, type: string, metadata?: Record<string, any>): void {
    this.log('info', 'transaction', 'Transaction submitted', {
      signature,
      type,
      ...metadata,
    });
  }

  transactionConfirmed(signature: string, type: string, slot?: number): void {
    this.log('info', 'transaction', 'Transaction confirmed', {
      signature,
      type,
      slot,
    });
  }

  transactionFinalized(signature: string, type: string): void {
    this.log('info', 'transaction', 'Transaction finalized', {
      signature,
      type,
    });
  }

  transactionFailed(signature: string | undefined, type: string, error: Error, metadata?: Record<string, any>): void {
    this.log('error', 'transaction', 'Transaction failed', {
      signature,
      type,
      error: error.message,
      stack: error.stack,
      ...metadata,
    });
  }

  transactionSimulationFailed(type: string, error: Error): void {
    this.log('warn', 'transaction', 'Transaction simulation failed', {
      type,
      error: error.message,
    });
  }

  // RPC event logging
  rpcRequest(method: string, endpoint: string): void {
    this.log('debug', 'rpc', 'RPC request', { method, endpoint });
  }

  rpcResponse(method: string, endpoint: string, duration: number): void {
    this.log('debug', 'rpc', 'RPC response', { method, endpoint, duration });
  }

  rpcError(method: string, endpoint: string, error: Error): void {
    this.log('error', 'rpc', 'RPC error', {
      method,
      endpoint,
      error: error.message,
    });
  }

  rpcEndpointSwitched(fromIndex: number, toIndex: number): void {
    this.log('warn', 'rpc', 'RPC endpoint switched', { fromIndex, toIndex });
  }

  rpcRateLimited(endpoint: string): void {
    this.log('warn', 'rpc', 'RPC rate limited', { endpoint });
  }

  // UI event logging
  pageView(page: string): void {
    this.log('info', 'ui', 'Page viewed', { page });
  }

  userAction(action: string, metadata?: Record<string, any>): void {
    this.log('info', 'ui', 'User action', { action, ...metadata });
  }

  modalOpened(modalName: string): void {
    this.log('debug', 'ui', 'Modal opened', { modalName });
  }

  modalClosed(modalName: string): void {
    this.log('debug', 'ui', 'Modal closed', { modalName });
  }

  // Utility methods
  getLogs(category?: LogCategory, level?: LogLevel): LogEvent[] {
    let filtered = this.logs;

    if (category) {
      filtered = filtered.filter(log => log.category === category);
    }

    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }

    return filtered;
  }

  getErrorLogs(): LogEvent[] {
    return this.getLogs(undefined, 'error');
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  getLogStats(): {
    total: number;
    byCategory: Record<LogCategory, number>;
    byLevel: Record<LogLevel, number>;
  } {
    const stats = {
      total: this.logs.length,
      byCategory: {
        wallet: 0,
        transaction: 0,
        rpc: 0,
        ui: 0,
      } as Record<LogCategory, number>,
      byLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
      } as Record<LogLevel, number>,
    };

    this.logs.forEach(log => {
      stats.byCategory[log.category]++;
      stats.byLevel[log.level]++;
    });

    return stats;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export { Logger };
