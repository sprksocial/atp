import PQueue from "p-queue";
import { ConsecutiveList } from "./consecutive-list.ts";
import type { EventRunner } from "./types.ts";
import { SyncTelemetry, type SyncTelemetryOptions } from "../telemetry.ts";

/**
 * Options for {@link MemoryRunner}
 * @param setCursor Method to save the current cursor
 * @param concurrency Maximum amount of concurrent events being processed
 * @param startCursor Starting Cursor for filling in downtime
 * @param setCursorInterval Interval on which to run setCursor
 */
export type MemoryRunnerOptions = {
  setCursor?: (cursor: number) => Promise<void>;
  concurrency?: number;
  startCursor?: number;
  setCursorInterval?: number; // milliseconds between persisted cursor saves (throttling)
  telemetry?: SyncTelemetryOptions;
};

/** A queue with arbitrarily many partitions, each processing work sequentially.
 * Partitions are created lazily and taken out of memory when they go idle.
 */
export class MemoryRunner implements EventRunner {
  consecutive: ConsecutiveList<number> = new ConsecutiveList<number>();
  mainQueue: PQueue;
  partitions: Map<string, PQueue> = new Map<string, PQueue>();
  cursor: number | undefined;
  private lastCursorSave = 0;
  private savingCursor = false;
  private telemetry: SyncTelemetry;

  constructor(public opts: MemoryRunnerOptions = {}) {
    this.mainQueue = new PQueue({ concurrency: opts.concurrency ?? Infinity });
    this.cursor = opts.startCursor;
    this.telemetry = new SyncTelemetry(opts.telemetry);
  }

  getTelemetry(): SyncTelemetry {
    return this.telemetry;
  }

  setTelemetry(telemetry: SyncTelemetry): void {
    this.telemetry = telemetry;
  }

  getCursor(): number | undefined {
    return this.cursor;
  }

  async addTask(
    partitionId: string,
    task: () => Promise<void>,
  ): Promise<void> {
    if (this.mainQueue.isPaused) return;
    return await this.mainQueue.add(() => {
      return this.getPartition(partitionId).add(task);
    });
  }

  private getPartition(partitionId: string) {
    let partition = this.partitions.get(partitionId);
    if (!partition) {
      partition = new PQueue({ concurrency: 1 });
      partition.once("idle", () => this.partitions.delete(partitionId));
      this.partitions.set(partitionId, partition);
    }
    return partition;
  }

  async trackEvent(did: string, seq: number, handler: () => Promise<void>) {
    if (this.mainQueue.isPaused) return;
    const item = this.consecutive.push(seq);
    await this.addTask(did, async () => {
      const taskStart = performance.now();
      try {
        await handler();
        this.telemetry.recordRunnerTaskDuration(
          performance.now() - taskStart,
          "ok",
        );
      } catch (err) {
        this.telemetry.recordRunnerTaskDuration(
          performance.now() - taskStart,
          "error",
        );
        this.telemetry.recordError("runner");
        throw err;
      }
      const latest = item.complete().at(-1);
      if (latest !== undefined) {
        this.cursor = latest;
        const { setCursor, setCursorInterval } = this.opts;
        if (setCursor) {
          if (!setCursorInterval) {
            const saveStart = performance.now();
            try {
              await setCursor(this.cursor!);
              this.telemetry.recordCursorSaveDuration(
                performance.now() - saveStart,
                "ok",
              );
            } catch (err) {
              this.telemetry.recordCursorSaveDuration(
                performance.now() - saveStart,
                "error",
              );
              this.telemetry.recordError("runner");
              throw err;
            }
            this.lastCursorSave = Date.now();
          } else {
            const now = Date.now();
            if (
              now - this.lastCursorSave >= setCursorInterval &&
              !this.savingCursor
            ) {
              this.lastCursorSave = now;
              this.savingCursor = true;
              const saveStart = performance.now();
              try {
                await setCursor(this.cursor!);
                this.telemetry.recordCursorSaveDuration(
                  performance.now() - saveStart,
                  "ok",
                );
              } catch (err) {
                this.telemetry.recordCursorSaveDuration(
                  performance.now() - saveStart,
                  "error",
                );
                this.telemetry.recordError("runner");
                throw err;
              } finally {
                this.savingCursor = false;
              }
            }
          }
        }
      }
    });
  }

  async processAll() {
    await this.mainQueue.onIdle();
  }

  async destroy() {
    this.mainQueue.pause();
    this.mainQueue.clear();
    this.partitions.forEach((p) => p.clear());
    await this.mainQueue.onIdle();
  }
}
