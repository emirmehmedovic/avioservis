/**
 * Logger utility za aplikaciju
 * Omogućava konzistentno logiranje poruka s različitim nivoima ozbiljnosti
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  enableConsole: boolean;
  minLevel: LogLevel;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const DEFAULT_OPTIONS: LoggerOptions = {
  enableConsole: true,
  minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
};

/**
 * Logger klasa za konzistentno logiranje
 */
class Logger {
  private options: LoggerOptions;

  constructor(options: Partial<LoggerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Formatira poruku za log
   */
  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const levelUpper = level.toUpperCase();
    let formattedMessage = `[${timestamp}] [${levelUpper}] ${message}`;
    
    if (args.length > 0) {
      formattedMessage += ' ' + args.map(arg => {
        if (arg instanceof Error) {
          return `${arg.message}\n${arg.stack}`;
        } else if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
    }
    
    return formattedMessage;
  }

  /**
   * Logira poruku ako je nivo ozbiljnosti dovoljan
   */
  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.options.minLevel]) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, ...args);
    
    if (this.options.enableConsole) {
      switch (level) {
        case 'debug':
          console.debug(formattedMessage);
          break;
        case 'info':
          console.info(formattedMessage);
          break;
        case 'warn':
          console.warn(formattedMessage);
          break;
        case 'error':
          console.error(formattedMessage);
          break;
      }
    }
    
    // Ovdje se može dodati logiranje u datoteku ili slanje na vanjski servis
  }

  /**
   * Logira debug poruku
   */
  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }

  /**
   * Logira info poruku
   */
  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }

  /**
   * Logira upozorenje
   */
  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }

  /**
   * Logira grešku
   */
  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }
}

// Kreiraj i izvezi singleton instancu loggera
export const logger = new Logger();

// Izvezi tipove za korištenje u drugim modulima
export type { LogLevel, LoggerOptions };
