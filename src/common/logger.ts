import winston from 'winston';

// ADR-010: Winston with JSON structured logging
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'bokehtv-backend' },
  transports: [
    new winston.transports.Console(),
  ],
});
