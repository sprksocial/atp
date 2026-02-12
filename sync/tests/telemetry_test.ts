import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { IdResolver, MemoryCache } from "@atp/identity";
import { Firehose } from "../firehose/index.ts";
import { MemoryRunner } from "../runner/index.ts";
import { SyncTelemetry, type SyncTelemetryOptions } from "../telemetry.ts";

type Attributes = Record<string, string | number | boolean>;
type CounterCall = { value: number; attributes?: Attributes };
type HistogramCall = { value: number; attributes?: Attributes };

class MockCounter {
  calls: CounterCall[] = [];

  add(value: number, attributes?: Attributes): void {
    this.calls.push({ value, attributes });
  }
}

class MockHistogram {
  calls: HistogramCall[] = [];

  record(value: number, attributes?: Attributes): void {
    this.calls.push({ value, attributes });
  }
}

class MockSpan {
  ended = false;
  exceptions: Error[] = [];
  status?: { code: number };

  constructor(
    public name: string,
    public attributes: Attributes,
  ) {}

  end(): void {
    this.ended = true;
  }

  recordException(error: Error): void {
    this.exceptions.push(error);
  }

  setStatus(status: { code: number }): void {
    this.status = status;
  }
}

class MockTracer {
  spans: MockSpan[] = [];

  startSpan(name: string, options?: { attributes?: Attributes }): MockSpan {
    const span = new MockSpan(name, options?.attributes ?? {});
    this.spans.push(span);
    return span;
  }
}

class MockMeter {
  counters = new Map<string, MockCounter>();
  histograms = new Map<string, MockHistogram>();

  createCounter(name: string): MockCounter {
    const counter = new MockCounter();
    this.counters.set(name, counter);
    return counter;
  }

  createHistogram(name: string): MockHistogram {
    const histogram = new MockHistogram();
    this.histograms.set(name, histogram);
    return histogram;
  }
}

Deno.test("SyncTelemetry records counters and histograms", () => {
  const tracer = new MockTracer();
  const meter = new MockMeter();
  const telemetry = new SyncTelemetry({
    tracer: tracer as unknown as SyncTelemetryOptions["tracer"],
    meter: meter as unknown as SyncTelemetryOptions["meter"],
  });

  telemetry.recordEventReceived("commit");
  telemetry.recordEventsParsed(2, "commit");
  telemetry.recordEventHandled("create", "ok");
  telemetry.recordError("parse", "commit");
  telemetry.recordParseDuration(10, "commit", "ok");
  telemetry.recordHandleDuration(12, "create", "error");

  assertEquals(meter.counters.get("sync.events.received")?.calls.length, 1);
  assertEquals(meter.counters.get("sync.events.parsed")?.calls[0]?.value, 2);
  assertEquals(meter.counters.get("sync.events.handled")?.calls.length, 1);
  assertEquals(meter.counters.get("sync.errors.total")?.calls.length, 1);
  assertEquals(meter.histograms.get("sync.parse.duration")?.calls.length, 1);
  assertEquals(meter.histograms.get("sync.handle.duration")?.calls.length, 1);
});

Deno.test("SyncTelemetry marks errored spans", async () => {
  const tracer = new MockTracer();
  const meter = new MockMeter();
  const telemetry = new SyncTelemetry({
    tracer: tracer as unknown as SyncTelemetryOptions["tracer"],
    meter: meter as unknown as SyncTelemetryOptions["meter"],
  });

  await assertRejects(async () => {
    await telemetry.withSpan(
      "span",
      {},
      () => Promise.reject(new Error("boom")),
    );
  });

  assertEquals(tracer.spans.length, 1);
  assertEquals(tracer.spans[0]?.ended, true);
  assertEquals(tracer.spans[0]?.exceptions.length, 1);
  assertEquals(typeof tracer.spans[0]?.status?.code, "number");
});

Deno.test("MemoryRunner emits runner telemetry", async () => {
  const tracer = new MockTracer();
  const meter = new MockMeter();
  const runner = new MemoryRunner({
    telemetry: {
      tracer: tracer as unknown as SyncTelemetryOptions["tracer"],
      meter: meter as unknown as SyncTelemetryOptions["meter"],
    },
    setCursor: async () => {
      await Promise.resolve();
    },
  });

  await runner.trackEvent("did:plc:alice", 1, async () => {
    await Promise.resolve();
  });

  assertEquals(tracer.spans.length, 0);
  assertEquals(
    meter.histograms.get("sync.runner.task.duration")?.calls.length,
    1,
  );
  assertEquals(
    meter.histograms.get("sync.runner.cursor_save.duration")?.calls.length,
    1,
  );
});

Deno.test("SyncTelemetry can be disabled", async () => {
  const tracer = new MockTracer();
  const meter = new MockMeter();
  const telemetry = new SyncTelemetry({
    enabled: false,
    tracer: tracer as unknown as SyncTelemetryOptions["tracer"],
    meter: meter as unknown as SyncTelemetryOptions["meter"],
  });

  await telemetry.withSpan("span", {}, async () => {
    await Promise.resolve();
  });
  telemetry.recordEventReceived("commit");

  assertEquals(tracer.spans.length, 0);
  assertEquals(meter.counters.size, 0);
});

Deno.test("Firehose shares telemetry instance with runner", () => {
  let sharedTelemetry: SyncTelemetry | undefined;
  const runner = {
    getCursor: () => undefined,
    setTelemetry: (telemetry: SyncTelemetry) => {
      sharedTelemetry = telemetry;
    },
    trackEvent: async () => {
      await Promise.resolve();
    },
  };
  const idResolver = new IdResolver({
    plcUrl: "http://localhost:3000",
    didCache: new MemoryCache(),
  });

  new Firehose({
    idResolver,
    runner,
    handleEvent: async () => {
      await Promise.resolve();
    },
    onError: () => {},
  });

  assertEquals(sharedTelemetry instanceof SyncTelemetry, true);
});

Deno.test("Firehose rejects conflicting telemetry configuration", () => {
  const runnerTelemetry = new SyncTelemetry();
  const runner = {
    getCursor: () => undefined,
    getTelemetry: () => runnerTelemetry,
    trackEvent: async () => {
      await Promise.resolve();
    },
  };
  const idResolver = new IdResolver({
    plcUrl: "http://localhost:3000",
    didCache: new MemoryCache(),
  });

  assertThrows(() => {
    new Firehose({
      idResolver,
      runner,
      telemetry: {},
      handleEvent: async () => {
        await Promise.resolve();
      },
      onError: () => {},
    });
  });
});
