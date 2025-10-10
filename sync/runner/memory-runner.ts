import PQueue from "p-queue";
import { ConsecutiveList } from "./consecutive-list.ts";
import type { EventRunner } from "./types.ts";

export type MemoryRunnerOptions = {
  setCursor?: (cursor: number) => Promise<void>;
  concurrency?: number;
  startCursor?: number;
  setCursorInterval?: number; // milliseconds between persisted cursor saves (throttling)
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

  constructor(public opts: MemoryRunnerOptions = {}) {
    this.mainQueue = new PQueue({ concurrency: opts.concurrency ?? Infinity });
    this.cursor = opts.startCursor;
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
      await handler();
      const latest = item.complete().at(-1);
      if (latest !== undefined) {
        this.cursor = latest;
        const { setCursor, setCursorInterval } = this.opts;
        if (setCursor) {
          if (!setCursorInterval) {
            await setCursor(this.cursor);
            this.lastCursorSave = Date.now();
          } else {
            const now = Date.now();
            if (
              now - this.lastCursorSave >= setCursorInterval &&
              !this.savingCursor
            ) {
              // Set timestamp & flag before awaiting to avoid multiple saves racing in same interval
              this.lastCursorSave = now;
              this.savingCursor = true;
              try {
                await setCursor(this.cursor);
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
