import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const extras = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  return `${timestamp} [${level}] ${stack || message}${extras}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'HH:mm:ss' }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : combine(colorize(), devFormat)
  ),
  transports: [new winston.transports.Console()],
});
