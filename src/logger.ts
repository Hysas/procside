import winston from 'winston';
import * as path from 'path';
import { loadConfig } from './config.js';

const LOG_FILE = 'procside.log';

function getLogFilePath(artifactDir: string): string {
  return path.join(process.cwd(), artifactDir, LOG_FILE);
}

function createLogger(): winston.Logger {
  const config = loadConfig();

  return winston.createLogger({
    level: config.logLevel,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} [${level.toUpperCase()}] ${message}`;
      })
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} ${level}: ${message}`;
          })
        ),
        silent: config.silent
      }),
      new winston.transports.File({
        filename: getLogFilePath(config.artifactDir),
        maxsize: 5 * 1024 * 1024, // 5MB
        maxFiles: config.environment === 'production' ? 5 : 3
      })
    ]
  });
}

const logger = createLogger();

export default logger;
