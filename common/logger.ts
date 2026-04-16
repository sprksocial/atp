import {
  configure,
  getConsoleSink,
  getLogger,
  type Logger,
  type LogLevel,
  type LogMethod,
  type Sink,
} from "@logtape/logtape";
import { getFileSink } from "@logtape/file";
import process from "node:process";

const isDeno = typeof Deno !== "undefined";
type LoggingConfig = {
  allSystemsEnabled: boolean;
  enabledSystems: string[];
  enabled: boolean;
  level: LogLevel;
  logDestination?: string;
};

const getEnv = (key: string): string | undefined => {
  if (isDeno) {
    try {
      return Deno.env.get(key);
    } catch {
      return undefined;
    }
  }

  return process.env[key];
};

let config: LoggingConfig | undefined;
let configurePromise: Promise<void> | undefined;

async function ensureConfigured() {
  const {
    enabled,
    level,
    logDestination,
  } = getLoggingConfig();
  if (!enabled) return;
  if (configurePromise) {
    await configurePromise;
    return;
  }

  const sinks: Record<string, Sink> = {
    console: getConsoleSink(),
  };

  if (logDestination) {
    sinks.file = getFileSink(logDestination);
  }

  configurePromise = configure({
    sinks,
    loggers: [
      {
        category: [],
        lowestLevel: level,
        sinks: logDestination ? ["console", "file"] : ["console"],
      },
    ],
  }).catch((error) => {
    configurePromise = undefined;
    throw error;
  });

  await configurePromise;
}

const subsystemLoggers: Record<string, Logger> = {};

export const subsystemLogger = (name: string): Logger => {
  if (subsystemLoggers[name]) return subsystemLoggers[name];

  subsystemLoggers[name] = wrapLogger(name, getLogger([name]));
  return subsystemLoggers[name];
};

export function _resetLoggerStateForTest(): void {
  config = undefined;
  configurePromise = undefined;
  for (const name in subsystemLoggers) {
    delete subsystemLoggers[name];
  }
}

function getLoggingConfig(): LoggingConfig {
  if (config) {
    return config;
  }

  const logSystems = getEnv("LOG_SYSTEMS") || "";
  const enabledSystems = logSystems.replace(",", " ")
    .split(" ")
    .filter(Boolean);
  const enabledEnv = getEnv("LOG_ENABLED");

  config = {
    allSystemsEnabled: !logSystems,
    enabledSystems,
    enabled: enabledEnv === "true" || enabledEnv === "t" || enabledEnv === "1",
    level: (getEnv("LOG_LEVEL") || "info") as LogLevel,
    logDestination: getEnv("LOG_DESTINATION"),
  };
  return config;
}

function isSubsystemEnabled(name: string): boolean {
  const { allSystemsEnabled, enabled, enabledSystems } = getLoggingConfig();
  return enabled && (allSystemsEnabled || enabledSystems.includes(name));
}

function wrapLogger(name: string, logger: Logger): Logger {
  return new Proxy(logger, {
    get(target, property, receiver) {
      if (property === "parent") {
        return target.parent === null ? null : wrapLogger(name, target.parent);
      }

      if (property === "getChild") {
        return (subcategory: Parameters<Logger["getChild"]>[0]) =>
          wrapLogger(name, target.getChild(subcategory));
      }

      if (property === "with") {
        return (properties: Parameters<Logger["with"]>[0]) =>
          wrapLogger(name, target.with(properties));
      }

      if (
        property === "trace" ||
        property === "debug" ||
        property === "info" ||
        property === "warn" ||
        property === "warning" ||
        property === "error" ||
        property === "fatal"
      ) {
        return wrapLogMethod(
          name,
          Reflect.get(target, property, receiver).bind(target) as LogMethod,
        );
      }

      if (property === "emit") {
        return wrapEmitMethod(
          name,
          Reflect.get(target, property, receiver).bind(
            target,
          ) as Logger["emit"],
        );
      }

      return Reflect.get(target, property, receiver);
    },
  });
}

function wrapLogMethod(name: string, method: LogMethod): LogMethod {
  return ((...args: unknown[]) => {
    if (!isSubsystemEnabled(name)) {
      return;
    }

    ensureConfigured().catch(console.error);
    Reflect.apply(method as (...args: unknown[]) => void, undefined, args);
  }) as LogMethod;
}

function wrapEmitMethod(name: string, method: Logger["emit"]): Logger["emit"] {
  return ((record) => {
    if (!isSubsystemEnabled(name)) {
      return;
    }

    ensureConfigured().catch(console.error);
    method(record);
  }) as Logger["emit"];
}
