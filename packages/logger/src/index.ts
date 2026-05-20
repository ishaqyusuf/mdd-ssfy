import pino from "pino";
import pinoPretty from "pino-pretty";

/**
 * Check if we're in pretty mode
 */
const isPretty =
  process.env.LOG_PRETTY === "true" && process.env.NODE_ENV !== "production";

const loggerOptions: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: ["email", "password", "address"],
    // remove: true,
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
};

const prettyOptions: pinoPretty.PrettyOptions = {
  colorize: true,
  translateTime: "HH:MM:ss",
  ignore: "pid,hostname",
  messageFormat: "{msg}",
  hideObject: false,
  singleLine: false,
  levelFirst: true,
};

/**
 * Create the base pino logger instance
 */
const baseLogger = (() => {
  if (!isPretty) {
    return pino(loggerOptions);
  }

  try {
    return pino(loggerOptions, pinoPretty(prettyOptions));
  } catch {
    return pino(loggerOptions);
  }
})();

/**
 * Create a logger adapter that wraps pino to match the existing API
 */
function createLoggerAdapter(pinoLogger: pino.Logger, prefixContext?: string) {
  // Format context with brackets if not already formatted
  const formatContext = (ctx?: string): string => {
    if (!ctx) return "";
    // If already has brackets, use as-is, otherwise wrap in brackets
    if (ctx.startsWith("[") && ctx.endsWith("]")) {
      return ctx;
    }
    return `[${ctx}]`;
  };

  const formattedContext = formatContext(prefixContext);

  return {
    info: (message: string, data?: object) => {
      try {
        const fullMessage = formattedContext
          ? `${formattedContext} ${message}`
          : message;
        if (data) {
          pinoLogger.info(data, fullMessage);
        } else {
          pinoLogger.info(fullMessage);
        }
      } catch (_error) {
        // Silently ignore logger stream errors to prevent crashes
        // This can happen when pino-pretty transport's stream is closing
      }
    },
    error: (message: string, data?: object) => {
      try {
        const fullMessage = formattedContext
          ? `${formattedContext} ${message}`
          : message;
        if (data) {
          pinoLogger.error(data, fullMessage);
        } else {
          pinoLogger.error(fullMessage);
        }
      } catch (_error) {
        // Silently ignore logger stream errors to prevent crashes
        // This can happen when pino-pretty transport's stream is closing
      }
    },
    warn: (message: string, data?: object) => {
      try {
        const fullMessage = formattedContext
          ? `${formattedContext} ${message}`
          : message;
        if (data) {
          pinoLogger.warn(data, fullMessage);
        } else {
          pinoLogger.warn(fullMessage);
        }
      } catch (_error) {
        // Silently ignore logger stream errors to prevent crashes
        // This can happen when pino-pretty transport's stream is closing
      }
    },
    debug: (message: string, data?: object) => {
      try {
        const fullMessage = formattedContext
          ? `${formattedContext} ${message}`
          : message;
        if (data) {
          pinoLogger.debug(data, fullMessage);
        } else {
          pinoLogger.debug(fullMessage);
        }
      } catch (_error) {
        // Silently ignore logger stream errors to prevent crashes
        // This can happen when pino-pretty transport's stream is closing
      }
    },
  };
}

/**
 * Default logger instance
 */
export const logger = createLoggerAdapter(baseLogger);

/**
 * Create a child logger with additional context
 * @param context - Context string to prepend to all log messages
 * @returns A new logger instance with the context
 *
 * @example
 * ```ts
 * const logger = createLoggerWithContext("my-component");
 * logger.info("Processing", { userId: 123 }); // Will log with "my-component" as context
 * ```
 */
export function createLoggerWithContext(context: string) {
  const childLogger = baseLogger.child({ context });
  return createLoggerAdapter(childLogger, context);
}

export default logger;
