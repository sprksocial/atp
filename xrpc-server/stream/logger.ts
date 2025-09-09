import { subsystemLogger } from "@atproto/common";

/**
 * Logger instance for XRPC streaming operations.
 * This is a subsystem logger specifically configured for logging events
 * related to WebSocket streaming, connection management, and stream processing.
 *
 * @example
 * ```typescript
 * import { logger } from './logger';
 *
 * logger.info('WebSocket connection established');
 * logger.error(error, 'Stream processing failed');
 * ```
 */
export const logger: ReturnType<typeof subsystemLogger> = subsystemLogger(
  "xrpc-stream",
);

/**
 * Default export of the XRPC stream logger.
 * Same as the named export, provided for convenience.
 */
export default logger;
