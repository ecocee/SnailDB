/**
 * Comprehensive logging module
 * Production-grade logging with levels, formatting, and file rotation
 */

import fs from 'fs';
import path from 'path';
import { createWriteStream, WriteStream } from 'fs';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, any>;
  error?: Error;
}

export class Logger {
  private module: string;
  private level: LogLevel = LogLevel.INFO;
  private dataDir: string;
  private fileStream: WriteStream | null = null;
  private logFile: string;
  private maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private maxFiles: number = 10;

  constructor(module: string, dataDir: string, level: LogLevel = LogLevel.INFO) {
    this.module = module;
    this.dataDir = dataDir;
    this.level = level;
    this.logFile = path.join(dataDir, 'ecocee.log');
    this.initializeLogging();
  }

  private initializeLogging(): void {
    try {
      // Ensure log directory exists
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      // Create write stream
      this.fileStream = createWriteStream(this.logFile, { flags: 'a' });
    } catch (error) {
      console.error(`Failed to initialize logging: ${error}`);
    }
  }

  /**
   * Debug level logging
   */
  public debug(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Info level logging
   */
  public info(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Warning level logging
   */
  public warn(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Error level logging
   */
  public error(message: string, error?: Error | Record<string, any>, data?: Record<string, any>): void {
    if (error instanceof Error) {
      this.log(LogLevel.ERROR, message, { ...data, stack: error.stack });
    } else {
      this.log(LogLevel.ERROR, message, { ...error, ...data });
    }
  }

  /**
   * Fatal level logging
   */
  public fatal(message: string, error?: Error | Record<string, any>, data?: Record<string, any>): void {
    if (error instanceof Error) {
      this.log(LogLevel.FATAL, message, { ...data, stack: error.stack });
    } else {
      this.log(LogLevel.FATAL, message, { ...error, ...data });
    }
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, data?: Record<string, any>): void {
    // Skip if below threshold
    if (level < this.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      module: this.module,
      message,
      data,
    };

    // Format log entry
    const formatted = this.formatEntry(entry);

    // Log to console
    this.logToConsole(entry, formatted);

    // Log to file
    this.logToFile(formatted);

    // Check for rotation
    this.checkRotation();
  }

  /**
   * Format log entry
   */
  private formatEntry(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] ${levelName} [${entry.module}]`;

    let message = `${prefix} ${entry.message}`;

    if (entry.data && Object.keys(entry.data).length > 0) {
      message += ` ${JSON.stringify(entry.data)}`;
    }

    return message;
  }

  /**
   * Log to console
   */
  private logToConsole(entry: LogEntry, formatted: string): void {
    const colors: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m', // Green
      [LogLevel.WARN]: '\x1b[33m', // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.FATAL]: '\x1b[35m', // Magenta
    };

    const reset = '\x1b[0m';
    const color = colors[entry.level];

    console.log(`${color}${formatted}${reset}`);
  }

  /**
   * Log to file
   */
  private logToFile(formatted: string): void {
    if (!this.fileStream) {
      return;
    }

    try {
      this.fileStream.write(`${formatted}\n`);
    } catch (error) {
      console.error(`Failed to write to log file: ${error}`);
    }
  }

  /**
   * Check for log rotation
   */
  private checkRotation(): void {
    try {
      if (!fs.existsSync(this.logFile)) {
        return;
      }

      const stats = fs.statSync(this.logFile);
      if (stats.size > this.maxFileSize) {
        this.rotateLog();
      }
    } catch (error) {
      console.error(`Failed to check log rotation: ${error}`);
    }
  }

  /**
   * Rotate log file
   */
  private rotateLog(): void {
    try {
      // Close current stream
      if (this.fileStream) {
        this.fileStream.end();
      }

      // Rename current log
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archivedLog = `${this.logFile}.${timestamp}`;
      fs.renameSync(this.logFile, archivedLog);

      // Remove old logs if exceeding max files
      const logDir = path.dirname(this.logFile);
      const files = fs.readdirSync(logDir)
        .filter((f) => f.startsWith('ecocee.log.'))
        .sort()
        .reverse();

      while (files.length > this.maxFiles - 1) {
        const oldFile = files.pop();
        if (oldFile) {
          fs.unlinkSync(path.join(logDir, oldFile));
        }
      }

      // Reinitialize
      this.initializeLogging();
    } catch (error) {
      console.error(`Failed to rotate log: ${error}`);
    }
  }

  /**
   * Set log level
   */
  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Close logger
   */
  public close(): void {
    if (this.fileStream) {
      this.fileStream.end();
    }
  }
}

export default Logger;
