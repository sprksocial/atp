import type { SyncTelemetry } from "../telemetry.ts";

/**
 * Generic event runner interface
 * for event tracking and processing
 */
export interface EventRunner {
  getCursor(): Awaited<number | undefined>;
  getTelemetry?(): SyncTelemetry;
  setTelemetry?(telemetry: SyncTelemetry): void;
  trackEvent(
    did: string,
    seq: number,
    handler: () => Promise<void>,
  ): Promise<void>;
}
