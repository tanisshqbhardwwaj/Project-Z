type LogLevel = "debug" | "info" | "warn" | "error";

type LogPayload = Record<string, unknown>;

function write(level: LogLevel, message: string, payload?: LogPayload) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...payload,
  };

  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else if (process.env.NODE_ENV !== "production" || level === "info") {
    console.log(line);
  }

  captureExternalError(level, message, payload);
}

function captureExternalError(level: LogLevel, message: string, payload?: LogPayload) {
  if (level !== "error") return;
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;

  // Optional hook: wire @sentry/nextjs when SENTRY_DSN is set in production.
  // Keeps the app working without Sentry installed locally.
  try {
    const globalSentry = (globalThis as { Sentry?: { captureMessage?: (msg: string, opts?: object) => void } }).Sentry;
    globalSentry?.captureMessage?.(message, {
      level: "error",
      extra: payload,
    });
  } catch {
    // ignore optional monitoring failures
  }
}

export const logger = {
  debug(message: string, payload?: LogPayload) {
    if (process.env.NODE_ENV === "production") return;
    write("debug", message, payload);
  },
  info(message: string, payload?: LogPayload) {
    write("info", message, payload);
  },
  warn(message: string, payload?: LogPayload) {
    write("warn", message, payload);
  },
  error(message: string, payload?: LogPayload) {
    write("error", message, payload);
  },
};
