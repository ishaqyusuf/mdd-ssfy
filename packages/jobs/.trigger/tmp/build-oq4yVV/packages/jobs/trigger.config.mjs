import {
  require_src
} from "../../chunk-LORBG75E.mjs";
import {
  defineConfig
} from "../../chunk-3VNCFJQZ.mjs";
import "../../chunk-GX6AF6F3.mjs";
import {
  SpanKind,
  context,
  init_esm as init_esm2,
  trace
} from "../../chunk-O2FJUH2A.mjs";
import {
  __toESM,
  init_esm
} from "../../chunk-2NHI4QYU.mjs";

// trigger.config.ts
init_esm();

// ../../node_modules/@prisma/instrumentation/dist/index.mjs
init_esm();
init_esm2();
var import_instrumentation = __toESM(require_src(), 1);
init_esm2();
var showAllTraces = process.env.PRISMA_SHOW_ALL_TRACES === "true";
var nonSampledTraceParent = `00-10-10-00`;
function engineSpanKindToOtelSpanKind(engineSpanKind) {
  switch (engineSpanKind) {
    case "client":
      return SpanKind.CLIENT;
    case "internal":
    default:
      return SpanKind.INTERNAL;
  }
}
var ActiveTracingHelper = class {
  traceMiddleware;
  tracerProvider;
  ignoreSpanTypes;
  constructor({ traceMiddleware, tracerProvider, ignoreSpanTypes }) {
    this.traceMiddleware = traceMiddleware;
    this.tracerProvider = tracerProvider;
    this.ignoreSpanTypes = ignoreSpanTypes;
  }
  isEnabled() {
    return true;
  }
  getTraceParent(context2) {
    const span = trace.getSpanContext(context2 ?? context.active());
    if (span) {
      return `00-${span.traceId}-${span.spanId}-0${span.traceFlags}`;
    }
    return nonSampledTraceParent;
  }
  dispatchEngineSpans(spans) {
    const tracer = this.tracerProvider.getTracer("prisma");
    const linkIds = /* @__PURE__ */ new Map();
    const roots = spans.filter((span) => span.parentId === null);
    for (const root of roots) {
      dispatchEngineSpan(tracer, root, spans, linkIds, this.ignoreSpanTypes);
    }
  }
  getActiveContext() {
    return context.active();
  }
  runInChildSpan(options, callback) {
    if (typeof options === "string") {
      options = { name: options };
    }
    if (options.internal && !showAllTraces) {
      return callback();
    }
    if (options.middleware && !this.traceMiddleware) {
      return callback();
    }
    const tracer = this.tracerProvider.getTracer("prisma");
    const context2 = options.context ?? this.getActiveContext();
    const name = `prisma:client:${options.name}`;
    if (shouldIgnoreSpan(name, this.ignoreSpanTypes)) {
      return callback();
    }
    if (options.active === false) {
      const span = tracer.startSpan(name, options, context2);
      return endSpan(span, callback(span, context2));
    }
    return tracer.startActiveSpan(name, options, (span) => endSpan(span, callback(span, context2)));
  }
};
function dispatchEngineSpan(tracer, engineSpan, allSpans, linkIds, ignoreSpanTypes) {
  if (shouldIgnoreSpan(engineSpan.name, ignoreSpanTypes)) return;
  const spanOptions = {
    attributes: engineSpan.attributes,
    kind: engineSpanKindToOtelSpanKind(engineSpan.kind),
    startTime: engineSpan.startTime
  };
  tracer.startActiveSpan(engineSpan.name, spanOptions, (span) => {
    linkIds.set(engineSpan.id, span.spanContext().spanId);
    if (engineSpan.links) {
      span.addLinks(
        engineSpan.links.flatMap((link) => {
          const linkedId = linkIds.get(link);
          if (!linkedId) {
            return [];
          }
          return {
            context: {
              spanId: linkedId,
              traceId: span.spanContext().traceId,
              traceFlags: span.spanContext().traceFlags
            }
          };
        })
      );
    }
    const children = allSpans.filter((s) => s.parentId === engineSpan.id);
    for (const child of children) {
      dispatchEngineSpan(tracer, child, allSpans, linkIds, ignoreSpanTypes);
    }
    span.end(engineSpan.endTime);
  });
}
function endSpan(span, result) {
  if (isPromiseLike(result)) {
    return result.then(
      (value) => {
        span.end();
        return value;
      },
      (reason) => {
        span.end();
        throw reason;
      }
    );
  }
  span.end();
  return result;
}
function isPromiseLike(value) {
  return value != null && typeof value["then"] === "function";
}
function shouldIgnoreSpan(spanName, ignoreSpanTypes) {
  return ignoreSpanTypes.some(
    (pattern) => typeof pattern === "string" ? pattern === spanName : pattern.test(spanName)
  );
}
var package_default = {
  name: "@prisma/instrumentation",
  version: "6.11.1",
  description: "OpenTelemetry compliant instrumentation for Prisma Client",
  main: "dist/index.js",
  module: "dist/index.mjs",
  types: "dist/index.d.ts",
  exports: {
    ".": {
      require: {
        types: "./dist/index.d.ts",
        default: "./dist/index.js"
      },
      import: {
        types: "./dist/index.d.ts",
        default: "./dist/index.mjs"
      }
    }
  },
  license: "Apache-2.0",
  homepage: "https://www.prisma.io",
  repository: {
    type: "git",
    url: "https://github.com/prisma/prisma.git",
    directory: "packages/instrumentation"
  },
  bugs: "https://github.com/prisma/prisma/issues",
  devDependencies: {
    "@prisma/internals": "workspace:*",
    "@swc/core": "1.11.5",
    "@types/jest": "29.5.14",
    "@types/node": "18.19.76",
    "@opentelemetry/api": "1.9.0",
    jest: "29.7.0",
    "jest-junit": "16.0.0",
    typescript: "5.4.5"
  },
  dependencies: {
    "@opentelemetry/instrumentation": "^0.52.0 || ^0.53.0 || ^0.54.0 || ^0.55.0 || ^0.56.0 || ^0.57.0"
  },
  peerDependencies: {
    "@opentelemetry/api": "^1.8"
  },
  files: [
    "dist"
  ],
  keywords: [
    "prisma",
    "instrumentation",
    "opentelemetry",
    "otel"
  ],
  scripts: {
    dev: "DEV=true tsx helpers/build.ts",
    build: "tsx helpers/build.ts",
    prepublishOnly: "pnpm run build",
    test: "jest"
  },
  sideEffects: false
};
var VERSION = package_default.version;
var majorVersion = VERSION.split(".")[0];
var GLOBAL_INSTRUMENTATION_ACCESSOR_KEY = "PRISMA_INSTRUMENTATION";
var GLOBAL_VERSIONED_INSTRUMENTATION_ACCESSOR_KEY = `V${majorVersion}_PRISMA_INSTRUMENTATION`;
var NAME = package_default.name;
var MODULE_NAME = "@prisma/client";
var PrismaInstrumentation = class extends import_instrumentation.InstrumentationBase {
  tracerProvider;
  constructor(config = {}) {
    super(NAME, VERSION, config);
  }
  setTracerProvider(tracerProvider) {
    this.tracerProvider = tracerProvider;
  }
  init() {
    const module = new import_instrumentation.InstrumentationNodeModuleDefinition(MODULE_NAME, [VERSION]);
    return [module];
  }
  enable() {
    const config = this._config;
    const globalValue = {
      helper: new ActiveTracingHelper({
        traceMiddleware: config.middleware ?? false,
        tracerProvider: this.tracerProvider ?? trace.getTracerProvider(),
        ignoreSpanTypes: config.ignoreSpanTypes ?? []
      })
    };
    global[GLOBAL_INSTRUMENTATION_ACCESSOR_KEY] = globalValue;
    global[GLOBAL_VERSIONED_INSTRUMENTATION_ACCESSOR_KEY] = globalValue;
  }
  disable() {
    delete global[GLOBAL_INSTRUMENTATION_ACCESSOR_KEY];
    delete global[GLOBAL_VERSIONED_INSTRUMENTATION_ACCESSOR_KEY];
  }
  isEnabled() {
    return Boolean(global[GLOBAL_VERSIONED_INSTRUMENTATION_ACCESSOR_KEY]);
  }
};

// trigger.config.ts
var trigger_config_default = defineConfig({
  project: process.env.TRIGGER_PROJECT_ID,
  runtime: "node",
  logLevel: "log",
  maxDuration: 60,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1e3,
      maxTimeoutInMs: 1e4,
      factor: 2,
      randomize: true
    }
  },
  build: {},
  dirs: ["./src/tasks"],
  instrumentations: [new PrismaInstrumentation()]
});
var resolveEnvVars = void 0;
export {
  trigger_config_default as default,
  resolveEnvVars
};
//# sourceMappingURL=trigger.config.mjs.map
