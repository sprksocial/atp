import {
  type Attributes,
  type Context,
  context,
  type Meter,
  metrics,
  type Span,
  SpanStatusCode,
  trace,
  type Tracer,
} from "@opentelemetry/api";

export type SyncTelemetryOptions = {
  enabled?: boolean;
  tracer?: Tracer;
  meter?: Meter;
};

export type SyncAttributes = Attributes;
export type SyncSpan = Span;

type Outcome = "ok" | "error";

export class SyncTelemetry {
  private readonly tracer: Tracer;
  readonly enabled: boolean;

  private eventsReceived?: ReturnType<Meter["createCounter"]>;
  private eventsParsed?: ReturnType<Meter["createCounter"]>;
  private eventsHandled?: ReturnType<Meter["createCounter"]>;
  private errorsTotal?: ReturnType<Meter["createCounter"]>;
  private parseDuration?: ReturnType<Meter["createHistogram"]>;
  private handleDuration?: ReturnType<Meter["createHistogram"]>;
  private runnerTaskDuration?: ReturnType<Meter["createHistogram"]>;
  private cursorSaveDuration?: ReturnType<Meter["createHistogram"]>;

  constructor(opts: SyncTelemetryOptions = {}) {
    this.enabled = opts.enabled ?? true;
    this.tracer = opts.tracer ?? trace.getTracer("@atp/sync");
    const meter = opts.meter ?? metrics.getMeter("@atp/sync");
    if (this.enabled) {
      this.eventsReceived = meter.createCounter("sync.events.received", {
        description: "Number of firehose events received",
        unit: "1",
      });
      this.eventsParsed = meter.createCounter("sync.events.parsed", {
        description: "Number of parsed sync events",
        unit: "1",
      });
      this.eventsHandled = meter.createCounter("sync.events.handled", {
        description: "Number of handled sync events",
        unit: "1",
      });
      this.errorsTotal = meter.createCounter("sync.errors.total", {
        description: "Number of sync processing errors",
        unit: "1",
      });
      this.parseDuration = meter.createHistogram("sync.parse.duration", {
        description: "Duration of event parsing and auth",
        unit: "ms",
      });
      this.handleDuration = meter.createHistogram("sync.handle.duration", {
        description: "Duration of event handler execution",
        unit: "ms",
      });
      this.runnerTaskDuration = meter.createHistogram(
        "sync.runner.task.duration",
        {
          description: "Duration of runner task execution",
          unit: "ms",
        },
      );
      this.cursorSaveDuration = meter.createHistogram(
        "sync.runner.cursor_save.duration",
        {
          description: "Duration of cursor persistence",
          unit: "ms",
        },
      );
    }
  }

  activeContext(): Context {
    return context.active();
  }

  withContext<T>(ctx: Context, fn: () => T): T {
    return context.with(ctx, fn);
  }

  startSpan(
    name: string,
    attributes?: Attributes,
    parentContext?: Context,
  ): Span | undefined {
    if (!this.enabled) {
      return undefined;
    }
    return this.tracer.startSpan(name, { attributes }, parentContext);
  }

  async withSpan<T>(
    name: string,
    attributes: Attributes,
    fn: (span: Span | undefined) => Promise<T>,
    parentContext?: Context,
  ): Promise<T> {
    if (!this.enabled) {
      return await fn(undefined);
    }
    const span = this.startSpan(name, attributes, parentContext);
    if (!span) {
      return await fn(undefined);
    }
    const spanContext = trace.setSpan(parentContext ?? context.active(), span);
    return await context.with(spanContext, async () => {
      try {
        return await fn(span);
      } catch (err) {
        this.recordSpanError(span, err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  recordEventReceived(eventType: string): void {
    this.eventsReceived?.add(1, { event_type: eventType });
  }

  recordEventsParsed(count: number, eventType: string): void {
    if (count < 1) {
      return;
    }
    this.eventsParsed?.add(count, { event_type: eventType });
  }

  recordEventHandled(eventType: string, outcome: Outcome): void {
    this.eventsHandled?.add(1, { event_type: eventType, outcome });
  }

  recordError(
    stage: "validation" | "parse" | "subscription" | "handler" | "runner",
    eventType?: string,
  ): void {
    const attributes: Attributes = { stage };
    if (eventType !== undefined) {
      attributes.event_type = eventType;
    }
    this.errorsTotal?.add(1, attributes);
  }

  recordParseDuration(
    durationMs: number,
    eventType: string,
    outcome: Outcome,
  ): void {
    this.parseDuration?.record(durationMs, { event_type: eventType, outcome });
  }

  recordHandleDuration(
    durationMs: number,
    eventType: string,
    outcome: Outcome,
  ): void {
    this.handleDuration?.record(durationMs, { event_type: eventType, outcome });
  }

  recordRunnerTaskDuration(durationMs: number, outcome: Outcome): void {
    this.runnerTaskDuration?.record(durationMs, { outcome });
  }

  recordCursorSaveDuration(durationMs: number, outcome: Outcome): void {
    this.cursorSaveDuration?.record(durationMs, { outcome });
  }

  recordSpanError(span: Span | undefined, error: unknown): void {
    if (!span) {
      return;
    }
    span.recordException(asError(error));
    span.setStatus({ code: SpanStatusCode.ERROR });
  }
}

const asError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
};
