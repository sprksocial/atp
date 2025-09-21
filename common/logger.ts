import {
  configure,
  getConsoleSink,
  getLogger,
  type Logger,
  type LogLevel,
  type Sink,
} from "@logtape/logtape";
import { getFileSink } from "@logtape/file";

const allSystemsEnabled = !Deno.env.get("LOG_SYSTEMS");
const enabledSystems = (Deno.env.get("LOG_SYSTEMS") || "")
  .replace(",", " ")
  .split(" ")
  .filter(Boolean);

const enabledEnv = Deno.env.get("LOG_ENABLED");
const enabled = enabledEnv === "true" || enabledEnv === "t" ||
  enabledEnv === "1";

const level = (Deno.env.get("LOG_LEVEL") || "info") as LogLevel;
const logDestination = Deno.env.get("LOG_DESTINATION");

// Initialize LogTape configuration
let configured = false;

async function ensureConfigured() {
  if (configured || !enabled) return;

  const sinks: Record<string, Sink> = {
    console: getConsoleSink(),
  };

  // Add file sink if LOG_DESTINATION is specified
  if (logDestination) {
    sinks.file = getFileSink(logDestination);
  }

  await configure({
    sinks,
    loggers: [
      {
        category: [], // Root logger
        lowestLevel: level,
        sinks: logDestination ? ["console", "file"] : ["console"],
      },
    ],
  });

  configured = true;
}

const subsystemLoggers: Record<string, Logger> = {};

export const subsystemLogger = (name: string): Logger => {
  if (subsystemLoggers[name]) return subsystemLoggers[name];

  const subsystemEnabled = enabled &&
    (allSystemsEnabled || enabledSystems.includes(name));

  // Ensure LogTape is configured before creating loggers
  ensureConfigured().catch(console.error);

  // Create LogTape logger for this subsystem
  const logger = getLogger([name]);

  if (!subsystemEnabled) {
    // Create a wrapper that no-ops all logging methods for disabled subsystems
    const noOpLogger: Logger = {
      ...logger,
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      fatal: () => {},
    };
    subsystemLoggers[name] = noOpLogger;
    return subsystemLoggers[name];
  }

  subsystemLoggers[name] = logger;
  return subsystemLoggers[name];
};
