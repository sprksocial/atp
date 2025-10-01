import PQueue from "p-queue";
import { ConsecutiveList } from "./consecutive-list.ts";
import type { EventRunner } from "./types.ts";

export type MemoryRunnerOptions = {
  setCursor?: (cursor: number) => Promise<void>;
  concurrency?: number;
  startCursor?: number;
  setCursorInterval?: number; // milliseconds between cursor saves, 0 for immediate saves
};

// A queue with arbitrarily many partitions, each processing work sequentially.
// Partitions are created lazily and taken out of memory when they go idle.
export class MemoryRunner implements EventRunner {
  consecutive: ConsecutiveList<number> = new ConsecutiveList<number>();
  mainQueue: PQueue;
  partitions: Map<string, PQueue> = new Map<string, PQueue>();
  cursor: number | undefined;
  private lastSavedCursor: number | undefined;
  private saveCursorTimer: number | undefined;
  private readonly useInterval: boolean;
  private readonly intervalMs: number;
  private readonly setCursor: ((cursor: number) => Promise<void>) | undefined;
  private pendingSaveCursor: number | undefined;

  constructor(public opts: MemoryRunnerOptions = {}) {
    this.mainQueue = new PQueue({ concurrency: opts.concurrency ?? Infinity });
    this.cursor = opts.startCursor;
    this.setCursor = opts.setCursor;
    this.intervalMs = opts.setCursorInterval ?? 0;
    this.useInterval = this.intervalMs > 0;
  }

  getCursor(): number | undefined {
    return this.cursor;
  }

  addTask(partitionId: string, task: () => Promise<void>): Promise<void> {
    if (this.mainQueue.isPaused) return Promise.resolve();
    return this.mainQueue.add(() => {
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
      await handler();
      const latest = item.complete().at(-1);
      if (latest !== undefined) {
        this.cursor = latest;
        if (this.setCursor) {
          if (this.useInterval) {
            this.scheduleIntervalSave();
          } else {
            this.setCursor(this.cursor).catch(console.error);
            this.lastSavedCursor = this.cursor;
          }
        }
      }
    });
  }

  private scheduleIntervalSave(): void {
    // Fast path: if cursor hasn't changed or timer already scheduled for this cursor
    if (
      this.cursor === this.lastSavedCursor ||
      this.cursor === this.pendingSaveCursor
    ) return;

    this.pendingSaveCursor = this.cursor;

    if (this.saveCursorTimer) {
      clearTimeout(this.saveCursorTimer);
    }

    this.saveCursorTimer = setTimeout(() => {
      const cursorToSave = this.pendingSaveCursor!;
      this.setCursor!(cursorToSave)
        .then(() => {
          this.lastSavedCursor = cursorToSave;
        })
        .catch(console.error);
      this.saveCursorTimer = undefined;
      this.pendingSaveCursor = undefined;
    }, this.intervalMs);
  }

  async processAll() {
    await this.mainQueue.onIdle();
  }

  async destroy() {
    this.mainQueue.pause();
    this.mainQueue.clear();
    this.partitions.forEach((p) => p.clear());

    // Clear any pending cursor save timer and perform final save
    if (this.saveCursorTimer) {
      clearTimeout(this.saveCursorTimer);
      this.saveCursorTimer = undefined;
    }

    // Perform final cursor save if needed
    if (
      this.setCursor && this.cursor !== undefined &&
      this.cursor !== this.lastSavedCursor
    ) {
      try {
        await this.setCursor(this.cursor);
        this.lastSavedCursor = this.cursor;
      } catch (error) {
        console.error("Failed to save cursor during destroy:", error);
      }
    }

    await this.mainQueue.onIdle();
  }
}
