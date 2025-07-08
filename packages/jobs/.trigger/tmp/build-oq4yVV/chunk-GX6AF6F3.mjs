import {
  SemanticInternalAttributes,
  SpanStatusCode,
  clock,
  context,
  init_esm as init_esm2,
  propagation,
  recordSpanException,
  require_src2 as require_src,
  taskContext,
  trace,
  usage
} from "./chunk-O2FJUH2A.mjs";
import {
  __toESM,
  init_esm
} from "./chunk-2NHI4QYU.mjs";

// ../../node_modules/@trigger.dev/core/dist/esm/v3/tracer.js
init_esm();
init_esm2();
var import_api_logs = __toESM(require_src(), 1);
var TriggerTracer = class {
  _config;
  constructor(_config) {
    this._config = _config;
  }
  _tracer;
  get tracer() {
    if (!this._tracer) {
      if ("tracer" in this._config)
        return this._config.tracer;
      this._tracer = trace.getTracer(this._config.name, this._config.version);
    }
    return this._tracer;
  }
  _logger;
  get logger() {
    if (!this._logger) {
      if ("logger" in this._config)
        return this._config.logger;
      this._logger = import_api_logs.logs.getLogger(this._config.name, this._config.version);
    }
    return this._logger;
  }
  extractContext(traceContext) {
    return propagation.extract(context.active(), traceContext ?? {});
  }
  startActiveSpan(name, fn, options, ctx, signal) {
    const parentContext = ctx ?? context.active();
    const attributes = options?.attributes ?? {};
    let spanEnded = false;
    return this.tracer.startActiveSpan(name, {
      ...options,
      attributes,
      startTime: clock.preciseNow()
    }, parentContext, async (span) => {
      signal?.addEventListener("abort", () => {
        if (!spanEnded) {
          spanEnded = true;
          recordSpanException(span, signal.reason);
          span.end();
        }
      });
      if (taskContext.ctx) {
        const partialSpan = this.tracer.startSpan(name, {
          ...options,
          attributes: {
            ...attributes,
            [SemanticInternalAttributes.SPAN_PARTIAL]: true,
            [SemanticInternalAttributes.SPAN_ID]: span.spanContext().spanId
          }
        }, parentContext);
        if (options?.events) {
          for (const event of options.events) {
            partialSpan.addEvent(event.name, event.attributes, event.startTime);
          }
        }
        partialSpan.end();
      }
      if (options?.events) {
        for (const event of options.events) {
          span.addEvent(event.name, event.attributes, event.startTime);
        }
      }
      const usageMeasurement = usage.start();
      try {
        return await fn(span);
      } catch (e) {
        if (!spanEnded) {
          if (typeof e === "string" || e instanceof Error) {
            span.recordException(e);
          }
          span.setStatus({ code: SpanStatusCode.ERROR });
        }
        throw e;
      } finally {
        if (!spanEnded) {
          spanEnded = true;
          if (taskContext.ctx) {
            const usageSample = usage.stop(usageMeasurement);
            const machine = taskContext.ctx.machine;
            span.setAttributes({
              [SemanticInternalAttributes.USAGE_DURATION_MS]: usageSample.cpuTime,
              [SemanticInternalAttributes.USAGE_COST_IN_CENTS]: machine?.centsPerMs ? usageSample.cpuTime * machine.centsPerMs : 0
            });
          }
          span.end(clock.preciseNow());
        }
      }
    });
  }
  startSpan(name, options, ctx) {
    const parentContext = ctx ?? context.active();
    const attributes = options?.attributes ?? {};
    const span = this.tracer.startSpan(name, options, ctx);
    this.tracer.startSpan(name, {
      ...options,
      attributes: {
        ...attributes,
        [SemanticInternalAttributes.SPAN_PARTIAL]: true,
        [SemanticInternalAttributes.SPAN_ID]: span.spanContext().spanId
      }
    }, parentContext).end();
    return span;
  }
};

export {
  TriggerTracer
};
//# sourceMappingURL=chunk-GX6AF6F3.mjs.map
