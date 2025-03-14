/**
 * Logger Utility
 * 
 * @description A centralized logging utility for consistent logging across the application.
 * Provides different log levels and the ability to enable/disable logging for specific modules.
 * 
 * @functionality
 * - Provides different log levels (debug, info, warn, error)
 * - Allows enabling/disabling logging for specific modules
 * - Formats log messages with timestamps and module names
 * - Supports log capture for display in the UI
 */

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

// Logger configuration
interface LoggerConfig {
  level: LogLevel;
  captureFunction?: (module: string, level: LogLevel, message: string, data?: any) => void;
}

// Global configuration
const globalConfig: LoggerConfig = {
  level: LogLevel.INFO
};

// Module-specific configurations
const moduleConfigs: Record<string, LoggerConfig> = {};

/**
 * Set the global log level
 * @param level The log level to set
 */
export function setGlobalLogLevel(level: LogLevel): void {
  globalConfig.level = level;
}

/**
 * Set a log capture function to capture logs for display in the UI
 * @param captureFunction Function to call with log data
 */
export function setLogCaptureFunction(
  captureFunction: (module: string, level: LogLevel, message: string, data?: any) => void
): void {
  globalConfig.captureFunction = captureFunction;
}

/**
 * Set the log level for a specific module
 * @param module Module name
 * @param level Log level
 */
export function setModuleLogLevel(module: string, level: LogLevel): void {
  if (!moduleConfigs[module]) {
    moduleConfigs[module] = { ...globalConfig };
  }
  moduleConfigs[module].level = level;
}

/**
 * Get a logger for a specific module
 * @param module Module name
 * @returns Logger object with logging methods
 */
export function getLogger(module: string) {
  // Get or create module config
  if (!moduleConfigs[module]) {
    moduleConfigs[module] = { ...globalConfig };
  }

  // Format the log message
  const formatLog = (level: LogLevel, message: string, data?: any): string => {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    
    let formattedMessage = `[${timestamp}] [${module}] [${levelName}] ${message}`;
    
    if (data !== undefined) {
      if (typeof data === 'object') {
        try {
          const dataStr = JSON.stringify(data, null, 2);
          formattedMessage += `\n${dataStr}`;
        } catch (error) {
          formattedMessage += `\n[Object could not be stringified]`;
        }
      } else {
        formattedMessage += ` ${data}`;
      }
    }
    
    return formattedMessage;
  };

  // Log a message if the level is enabled
  const log = (level: LogLevel, message: string, data?: any): void => {
    const config = moduleConfigs[module];
    
    if (level >= config.level) {
      const formattedMessage = formatLog(level, message, data);
      
      // Output to console
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage);
          break;
      }
      
      // Call capture function if set
      if (config.captureFunction) {
        config.captureFunction(module, level, message, data);
      } else if (globalConfig.captureFunction) {
        globalConfig.captureFunction(module, level, message, data);
      }
    }
  };

  // Return logger object
  return {
    debug: (message: string, data?: any) => log(LogLevel.DEBUG, message, data),
    info: (message: string, data?: any) => log(LogLevel.INFO, message, data),
    warn: (message: string, data?: any) => log(LogLevel.WARN, message, data),
    error: (message: string, data?: any) => log(LogLevel.ERROR, message, data),
    setLevel: (level: LogLevel) => setModuleLogLevel(module, level)
  };
}
