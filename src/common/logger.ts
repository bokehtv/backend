import winston from 'winston';

// ADR-010: Winston with JSON structured logging
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  silent: process.env.NODE_ENV === 'test',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'bokehtv-backend' },
  transports: [
    new winston.transports.Console(),
  ],
});

export default logger;
