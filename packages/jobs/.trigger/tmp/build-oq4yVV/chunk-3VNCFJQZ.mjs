import {
  TriggerTracer
} from "./chunk-GX6AF6F3.mjs";
import {
  SemanticInternalAttributes,
  SpanKind,
  TaskRunPromise,
  accessoryAttributes,
  apiClientManager,
  conditionallyImportPacket,
  createErrorTaskError,
  defaultRetryOptions,
  getEnvVar,
  getSchemaParseFn,
  init_esm as init_esm2,
  makeIdempotencyKey,
  mergeRequestOptions,
  parsePacket,
  runMetadata,
  runtime,
  stringifyIO,
  taskCatalog,
  taskContext,
  timeout
} from "./chunk-O2FJUH2A.mjs";
import {
  init_esm
} from "./chunk-2NHI4QYU.mjs";

// ../../node_modules/@trigger.dev/sdk/dist/esm/v3/config.js
init_esm();
function defineConfig(config) {
  return config;
}

// ../../node_modules/@trigger.dev/sdk/dist/esm/v3/tasks.js
init_esm();

// ../../node_modules/@trigger.dev/sdk/dist/esm/v3/shared.js
init_esm();
init_esm2();

// ../../node_modules/@trigger.dev/sdk/dist/esm/v3/runs.js
init_esm();

// ../../node_modules/@trigger.dev/sdk/dist/esm/v3/tracer.js
init_esm();

// ../../node_modules/@trigger.dev/sdk/dist/esm/version.js
init_esm();
var VERSION = "3.3.17";

// ../../node_modules/@trigger.dev/sdk/dist/esm/v3/tracer.js
var tracer = new TriggerTracer({ name: "@trigger.dev/sdk", version: VERSION });

// ../../node_modules/@trigger.dev/sdk/dist/esm/v3/shared.js
function queue(options) {
  return options;
}
function createSchemaTask(params) {
  const customQueue = params.queue ? queue({
    name: params.queue?.name ?? `task/${params.id}`,
    ...params.queue
  }) : void 0;
  const parsePayload = params.schema ? getSchemaParseFn(params.schema) : void 0;
  const task = {
    id: params.id,
    description: params.description,
    schema: params.schema,
    trigger: async (payload, options, requestOptions) => {
      const taskMetadata = taskCatalog.getTaskManifest(params.id);
      return await trigger_internal(taskMetadata && taskMetadata.exportName ? `${taskMetadata.exportName}.trigger()` : `trigger()`, params.id, payload, parsePayload, {
        queue: customQueue,
        ...options
      }, requestOptions);
    },
    batchTrigger: async (items, options, requestOptions) => {
      const taskMetadata = taskCatalog.getTaskManifest(params.id);
      return await batchTrigger_internal(taskMetadata && taskMetadata.exportName ? `${taskMetadata.exportName}.batchTrigger()` : `batchTrigger()`, params.id, items, options, parsePayload, requestOptions, customQueue);
    },
    triggerAndWait: (payload, options) => {
      const taskMetadata = taskCatalog.getTaskManifest(params.id);
      return new TaskRunPromise((resolve, reject) => {
        triggerAndWait_internal(taskMetadata && taskMetadata.exportName ? `${taskMetadata.exportName}.triggerAndWait()` : `triggerAndWait()`, params.id, payload, parsePayload, {
          queue: customQueue,
          ...options
        }).then((result) => {
          resolve(result);
        }).catch((error) => {
          reject(error);
        });
      }, params.id);
    },
    batchTriggerAndWait: async (items, options) => {
      const taskMetadata = taskCatalog.getTaskManifest(params.id);
      return await batchTriggerAndWait_internal(taskMetadata && taskMetadata.exportName ? `${taskMetadata.exportName}.batchTriggerAndWait()` : `batchTriggerAndWait()`, params.id, items, parsePayload, options, void 0, customQueue);
    }
  };
  taskCatalog.registerTaskMetadata({
    id: params.id,
    description: params.description,
    queue: params.queue,
    retry: params.retry ? { ...defaultRetryOptions, ...params.retry } : void 0,
    machine: typeof params.machine === "string" ? { preset: params.machine } : params.machine,
    maxDuration: params.maxDuration,
    fns: {
      run: params.run,
      init: params.init,
      cleanup: params.cleanup,
      middleware: params.middleware,
      handleError: params.handleError,
      onSuccess: params.onSuccess,
      onFailure: params.onFailure,
      onStart: params.onStart,
      parsePayload
    }
  });
  task[Symbol.for("trigger.dev/task")] = true;
  return task;
}
async function trigger_internal(name2, id, payload, parsePayload, options, requestOptions) {
  const apiClient = apiClientManager.clientOrThrow();
  const parsedPayload = parsePayload ? await parsePayload(payload) : payload;
  const payloadPacket = await stringifyIO(parsedPayload);
  const handle = await apiClient.triggerTask(id, {
    payload: payloadPacket.data,
    options: {
      queue: options?.queue,
      concurrencyKey: options?.concurrencyKey,
      test: taskContext.ctx?.run.isTest,
      payloadType: payloadPacket.dataType,
      idempotencyKey: await makeIdempotencyKey(options?.idempotencyKey),
      idempotencyKeyTTL: options?.idempotencyKeyTTL,
      delay: options?.delay,
      ttl: options?.ttl,
      tags: options?.tags,
      maxAttempts: options?.maxAttempts,
      parentAttempt: taskContext.ctx?.attempt.id,
      metadata: options?.metadata,
      maxDuration: options?.maxDuration,
      machine: options?.machine,
      lockToVersion: options?.version ?? getEnvVar("TRIGGER_VERSION")
    }
  }, {
    spanParentAsLink: true
  }, {
    name: name2,
    tracer,
    icon: "trigger",
    onResponseBody: (body, span) => {
      if (body && typeof body === "object" && !Array.isArray(body)) {
        if ("id" in body && typeof body.id === "string") {
          span.setAttribute("runId", body.id);
        }
      }
    },
    ...requestOptions
  });
  return handle;
}
async function batchTrigger_internal(name2, taskIdentifier, items, options, parsePayload, requestOptions, queue2) {
  const apiClient = apiClientManager.clientOrThrow();
  const response = await apiClient.batchTriggerV2({
    items: await Promise.all(items.map(async (item) => {
      const parsedPayload = parsePayload ? await parsePayload(item.payload) : item.payload;
      const payloadPacket = await stringifyIO(parsedPayload);
      return {
        task: taskIdentifier,
        payload: payloadPacket.data,
        options: {
          queue: item.options?.queue ?? queue2,
          concurrencyKey: item.options?.concurrencyKey,
          test: taskContext.ctx?.run.isTest,
          payloadType: payloadPacket.dataType,
          idempotencyKey: await makeIdempotencyKey(item.options?.idempotencyKey),
          idempotencyKeyTTL: item.options?.idempotencyKeyTTL,
          delay: item.options?.delay,
          ttl: item.options?.ttl,
          tags: item.options?.tags,
          maxAttempts: item.options?.maxAttempts,
          parentAttempt: taskContext.ctx?.attempt.id,
          metadata: item.options?.metadata,
          maxDuration: item.options?.maxDuration,
          machine: item.options?.machine,
          lockToVersion: item.options?.version ?? getEnvVar("TRIGGER_VERSION")
        }
      };
    }))
  }, {
    spanParentAsLink: true,
    idempotencyKey: await makeIdempotencyKey(options?.idempotencyKey),
    idempotencyKeyTTL: options?.idempotencyKeyTTL,
    processingStrategy: options?.triggerSequentially ? "sequential" : void 0
  }, {
    name: name2,
    tracer,
    icon: "trigger",
    onResponseBody(body, span) {
      if (body && typeof body === "object" && !Array.isArray(body)) {
        if ("id" in body && typeof body.id === "string") {
          span.setAttribute("batchId", body.id);
        }
        if ("runs" in body && Array.isArray(body.runs)) {
          span.setAttribute("runCount", body.runs.length);
        }
        if ("isCached" in body && typeof body.isCached === "boolean") {
          if (body.isCached) {
            console.warn(`Result is a cached response because the request was idempotent.`);
          }
          span.setAttribute("isCached", body.isCached);
        }
        if ("idempotencyKey" in body && typeof body.idempotencyKey === "string") {
          span.setAttribute("idempotencyKey", body.idempotencyKey);
        }
      }
    },
    ...requestOptions
  });
  const handle = {
    batchId: response.id,
    isCached: response.isCached,
    idempotencyKey: response.idempotencyKey,
    runs: response.runs,
    publicAccessToken: response.publicAccessToken
  };
  return handle;
}
async function triggerAndWait_internal(name2, id, payload, parsePayload, options, requestOptions) {
  const ctx = taskContext.ctx;
  if (!ctx) {
    throw new Error("triggerAndWait can only be used from inside a task.run()");
  }
  const apiClient = apiClientManager.clientOrThrow();
  const parsedPayload = parsePayload ? await parsePayload(payload) : payload;
  const payloadPacket = await stringifyIO(parsedPayload);
  return await tracer.startActiveSpan(name2, async (span) => {
    const response = await apiClient.triggerTask(id, {
      payload: payloadPacket.data,
      options: {
        dependentAttempt: ctx.attempt.id,
        lockToVersion: taskContext.worker?.version,
        // Lock to current version because we're waiting for it to finish
        queue: options?.queue,
        concurrencyKey: options?.concurrencyKey,
        test: taskContext.ctx?.run.isTest,
        payloadType: payloadPacket.dataType,
        delay: options?.delay,
        ttl: options?.ttl,
        tags: options?.tags,
        maxAttempts: options?.maxAttempts,
        metadata: options?.metadata,
        maxDuration: options?.maxDuration,
        machine: options?.machine
      }
    }, {}, requestOptions);
    span.setAttribute("runId", response.id);
    const result = await runtime.waitForTask({
      id: response.id,
      ctx
    });
    return await handleTaskRunExecutionResult(result, id);
  }, {
    kind: SpanKind.PRODUCER,
    attributes: {
      [SemanticInternalAttributes.STYLE_ICON]: "trigger",
      ...accessoryAttributes({
        items: [
          {
            text: id,
            variant: "normal"
          }
        ],
        style: "codepath"
      })
    }
  });
}
async function batchTriggerAndWait_internal(name2, id, items, parsePayload, options, requestOptions, queue2) {
  const ctx = taskContext.ctx;
  if (!ctx) {
    throw new Error("batchTriggerAndWait can only be used from inside a task.run()");
  }
  const apiClient = apiClientManager.clientOrThrow();
  return await tracer.startActiveSpan(name2, async (span) => {
    const response = await apiClient.batchTriggerV2({
      items: await Promise.all(items.map(async (item) => {
        const parsedPayload = parsePayload ? await parsePayload(item.payload) : item.payload;
        const payloadPacket = await stringifyIO(parsedPayload);
        return {
          task: id,
          payload: payloadPacket.data,
          options: {
            lockToVersion: taskContext.worker?.version,
            queue: item.options?.queue ?? queue2,
            concurrencyKey: item.options?.concurrencyKey,
            test: taskContext.ctx?.run.isTest,
            payloadType: payloadPacket.dataType,
            delay: item.options?.delay,
            ttl: item.options?.ttl,
            tags: item.options?.tags,
            maxAttempts: item.options?.maxAttempts,
            metadata: item.options?.metadata,
            maxDuration: item.options?.maxDuration,
            machine: item.options?.machine
          }
        };
      })),
      dependentAttempt: ctx.attempt.id
    }, {
      processingStrategy: options?.triggerSequentially ? "sequential" : void 0
    }, requestOptions);
    span.setAttribute("batchId", response.id);
    span.setAttribute("runCount", response.runs.length);
    span.setAttribute("isCached", response.isCached);
    if (response.isCached) {
      console.warn(`Result is a cached response because the request was idempotent.`);
    }
    if (response.idempotencyKey) {
      span.setAttribute("idempotencyKey", response.idempotencyKey);
    }
    const result = await runtime.waitForBatch({
      id: response.id,
      runs: response.runs.map((run) => run.id),
      ctx
    });
    const runs2 = await handleBatchTaskRunExecutionResult(result.items, id);
    return {
      id: result.id,
      runs: runs2
    };
  }, {
    kind: SpanKind.PRODUCER,
    attributes: {
      [SemanticInternalAttributes.STYLE_ICON]: "trigger",
      ...accessoryAttributes({
        items: [
          {
            text: id,
            variant: "normal"
          }
        ],
        style: "codepath"
      })
    }
  });
}
async function handleBatchTaskRunExecutionResult(items, taskIdentifier) {
  const someObjectStoreOutputs = items.some((item) => item.ok && item.outputType === "application/store");
  if (!someObjectStoreOutputs) {
    const results = await Promise.all(items.map(async (item) => {
      return await handleTaskRunExecutionResult(item, taskIdentifier);
    }));
    return results;
  }
  return await tracer.startActiveSpan("store.downloadPayloads", async (span) => {
    const results = await Promise.all(items.map(async (item) => {
      return await handleTaskRunExecutionResult(item, taskIdentifier);
    }));
    return results;
  }, {
    kind: SpanKind.INTERNAL,
    [SemanticInternalAttributes.STYLE_ICON]: "cloud-download"
  });
}
async function handleTaskRunExecutionResult(execution, taskIdentifier) {
  if (execution.ok) {
    const outputPacket = { data: execution.output, dataType: execution.outputType };
    const importedPacket = await conditionallyImportPacket(outputPacket, tracer);
    return {
      ok: true,
      id: execution.id,
      taskIdentifier: execution.taskIdentifier ?? taskIdentifier,
      output: await parsePacket(importedPacket)
    };
  } else {
    return {
      ok: false,
      id: execution.id,
      taskIdentifier: execution.taskIdentifier ?? taskIdentifier,
      error: createErrorTaskError(execution.error)
    };
  }
}

// ../../node_modules/@trigger.dev/sdk/dist/esm/v3/tasks.js
var schemaTask = createSchemaTask;

// ../../node_modules/@trigger.dev/sdk/dist/esm/v3/index.js
init_esm();

// ../../node_modules/@trigger.dev/sdk/dist/esm/v3/cache.js
init_esm();

// ../../node_modules/@trigger.dev/sdk/dist/esm/v3/retry.js
init_esm();

// ../../node_modules/@trigger.dev/sdk/dist/esm/v3/batch.js
init_esm();

// ../../node_modules/@trigger.dev/sdk/dist/esm/v3/wait.js
init_esm();

// ../../node_modules/@trigger.dev/sdk/dist/esm/v3/waitUntil.js
init_esm();

// ../../node_modules/@trigger.dev/sdk/dist/esm/v3/usage.js
init_esm();

// ../../node_modules/@trigger.dev/sdk/dist/esm/v3/idempotencyKeys.js
init_esm();

// ../../node_modules/@trigger.dev/sdk/dist/esm/v3/tags.js
init_esm();

// ../../node_modules/@trigger.dev/sdk/dist/esm/v3/metadata.js
init_esm();
var parentMetadataUpdater = runMetadata.parent;
var rootMetadataUpdater = runMetadata.root;
var metadataUpdater = {
  set: setMetadataKey,
  del: deleteMetadataKey,
  append: appendMetadataKey,
  remove: removeMetadataKey,
  increment: incrementMetadataKey,
  decrement: decrementMetadataKey,
  flush: flushMetadata
};
var metadata = {
  current: currentMetadata,
  get: getMetadataKey,
  save: saveMetadata,
  replace: replaceMetadata,
  stream,
  fetchStream,
  parent: parentMetadataUpdater,
  root: rootMetadataUpdater,
  refresh: refreshMetadata,
  ...metadataUpdater
};
function currentMetadata() {
  return runMetadata.current();
}
function getMetadataKey(key) {
  return runMetadata.getKey(key);
}
function setMetadataKey(key, value) {
  runMetadata.set(key, value);
  return metadataUpdater;
}
function deleteMetadataKey(key) {
  runMetadata.del(key);
  return metadataUpdater;
}
function replaceMetadata(metadata2) {
  runMetadata.update(metadata2);
}
function saveMetadata(metadata2) {
  runMetadata.update(metadata2);
}
function incrementMetadataKey(key, value = 1) {
  runMetadata.increment(key, value);
  return metadataUpdater;
}
function decrementMetadataKey(key, value = 1) {
  runMetadata.decrement(key, value);
  return metadataUpdater;
}
function appendMetadataKey(key, value) {
  runMetadata.append(key, value);
  return metadataUpdater;
}
function removeMetadataKey(key, value) {
  runMetadata.remove(key, value);
  return metadataUpdater;
}
async function flushMetadata(requestOptions) {
  const $requestOptions = mergeRequestOptions({
    tracer,
    name: "metadata.flush()",
    icon: "code-plus"
  }, requestOptions);
  await runMetadata.flush($requestOptions);
}
async function refreshMetadata(requestOptions) {
  const $requestOptions = mergeRequestOptions({
    tracer,
    name: "metadata.refresh()",
    icon: "code-plus"
  }, requestOptions);
  await runMetadata.refresh($requestOptions);
}
async function stream(key, value, signal) {
  return runMetadata.stream(key, value, signal);
}
async function fetchStream(key, signal) {
  return runMetadata.fetchStream(key, signal);
}

// ../../node_modules/@trigger.dev/sdk/dist/esm/v3/timeout.js
init_esm();
var MAXIMUM_MAX_DURATION = 2147483647;
var timeout2 = {
  None: MAXIMUM_MAX_DURATION,
  signal: timeout.signal
};

// ../../node_modules/@trigger.dev/sdk/dist/esm/v3/webhooks.js
init_esm();

// ../../node_modules/@trigger.dev/sdk/dist/esm/imports/uncrypto.js
init_esm();

// ../../node_modules/@trigger.dev/sdk/dist/esm/v3/schedules/index.js
init_esm();

// ../../node_modules/@trigger.dev/sdk/dist/esm/v3/envvars.js
init_esm();

// ../../node_modules/@trigger.dev/sdk/dist/esm/v3/auth.js
init_esm();

export {
  defineConfig,
  schemaTask
};
//# sourceMappingURL=chunk-3VNCFJQZ.mjs.map
