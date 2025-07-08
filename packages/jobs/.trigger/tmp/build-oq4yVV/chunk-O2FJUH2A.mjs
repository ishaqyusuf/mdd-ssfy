import {
  __commonJS,
  __esm,
  __export,
  __toESM,
  init_esm
} from "./chunk-2NHI4QYU.mjs";

// ../../node_modules/zod/dist/cjs/v3/helpers/util.js
var require_util = __commonJS({
  "../../node_modules/zod/dist/cjs/v3/helpers/util.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getParsedType = exports.ZodParsedType = exports.objectUtil = exports.util = void 0;
    var util2;
    (function(util3) {
      util3.assertEqual = (_) => {
      };
      function assertIs(_arg) {
      }
      util3.assertIs = assertIs;
      function assertNever(_x) {
        throw new Error();
      }
      util3.assertNever = assertNever;
      util3.arrayToEnum = (items) => {
        const obj = {};
        for (const item of items) {
          obj[item] = item;
        }
        return obj;
      };
      util3.getValidEnumValues = (obj) => {
        const validKeys = util3.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
        const filtered = {};
        for (const k of validKeys) {
          filtered[k] = obj[k];
        }
        return util3.objectValues(filtered);
      };
      util3.objectValues = (obj) => {
        return util3.objectKeys(obj).map(function(e) {
          return obj[e];
        });
      };
      util3.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
        const keys = [];
        for (const key in object) {
          if (Object.prototype.hasOwnProperty.call(object, key)) {
            keys.push(key);
          }
        }
        return keys;
      };
      util3.find = (arr, checker) => {
        for (const item of arr) {
          if (checker(item))
            return item;
        }
        return void 0;
      };
      util3.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
      function joinValues(array, separator = " | ") {
        return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
      }
      util3.joinValues = joinValues;
      util3.jsonStringifyReplacer = (_, value) => {
        if (typeof value === "bigint") {
          return value.toString();
        }
        return value;
      };
    })(util2 || (exports.util = util2 = {}));
    var objectUtil2;
    (function(objectUtil3) {
      objectUtil3.mergeShapes = (first, second) => {
        return {
          ...first,
          ...second
          // second overwrites first
        };
      };
    })(objectUtil2 || (exports.objectUtil = objectUtil2 = {}));
    exports.ZodParsedType = util2.arrayToEnum([
      "string",
      "nan",
      "number",
      "integer",
      "float",
      "boolean",
      "date",
      "bigint",
      "symbol",
      "function",
      "undefined",
      "null",
      "array",
      "object",
      "unknown",
      "promise",
      "void",
      "never",
      "map",
      "set"
    ]);
    var getParsedType2 = (data) => {
      const t = typeof data;
      switch (t) {
        case "undefined":
          return exports.ZodParsedType.undefined;
        case "string":
          return exports.ZodParsedType.string;
        case "number":
          return Number.isNaN(data) ? exports.ZodParsedType.nan : exports.ZodParsedType.number;
        case "boolean":
          return exports.ZodParsedType.boolean;
        case "function":
          return exports.ZodParsedType.function;
        case "bigint":
          return exports.ZodParsedType.bigint;
        case "symbol":
          return exports.ZodParsedType.symbol;
        case "object":
          if (Array.isArray(data)) {
            return exports.ZodParsedType.array;
          }
          if (data === null) {
            return exports.ZodParsedType.null;
          }
          if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
            return exports.ZodParsedType.promise;
          }
          if (typeof Map !== "undefined" && data instanceof Map) {
            return exports.ZodParsedType.map;
          }
          if (typeof Set !== "undefined" && data instanceof Set) {
            return exports.ZodParsedType.set;
          }
          if (typeof Date !== "undefined" && data instanceof Date) {
            return exports.ZodParsedType.date;
          }
          return exports.ZodParsedType.object;
        default:
          return exports.ZodParsedType.unknown;
      }
    };
    exports.getParsedType = getParsedType2;
  }
});

// ../../node_modules/zod/dist/cjs/v3/ZodError.js
var require_ZodError = __commonJS({
  "../../node_modules/zod/dist/cjs/v3/ZodError.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ZodError = exports.quotelessJson = exports.ZodIssueCode = void 0;
    var util_js_1 = require_util();
    exports.ZodIssueCode = util_js_1.util.arrayToEnum([
      "invalid_type",
      "invalid_literal",
      "custom",
      "invalid_union",
      "invalid_union_discriminator",
      "invalid_enum_value",
      "unrecognized_keys",
      "invalid_arguments",
      "invalid_return_type",
      "invalid_date",
      "invalid_string",
      "too_small",
      "too_big",
      "invalid_intersection_types",
      "not_multiple_of",
      "not_finite"
    ]);
    var quotelessJson2 = (obj) => {
      const json = JSON.stringify(obj, null, 2);
      return json.replace(/"([^"]+)":/g, "$1:");
    };
    exports.quotelessJson = quotelessJson2;
    var ZodError2 = class _ZodError extends Error {
      get errors() {
        return this.issues;
      }
      constructor(issues) {
        super();
        this.issues = [];
        this.addIssue = (sub) => {
          this.issues = [...this.issues, sub];
        };
        this.addIssues = (subs = []) => {
          this.issues = [...this.issues, ...subs];
        };
        const actualProto = new.target.prototype;
        if (Object.setPrototypeOf) {
          Object.setPrototypeOf(this, actualProto);
        } else {
          this.__proto__ = actualProto;
        }
        this.name = "ZodError";
        this.issues = issues;
      }
      format(_mapper) {
        const mapper = _mapper || function(issue) {
          return issue.message;
        };
        const fieldErrors = { _errors: [] };
        const processError = (error) => {
          for (const issue of error.issues) {
            if (issue.code === "invalid_union") {
              issue.unionErrors.map(processError);
            } else if (issue.code === "invalid_return_type") {
              processError(issue.returnTypeError);
            } else if (issue.code === "invalid_arguments") {
              processError(issue.argumentsError);
            } else if (issue.path.length === 0) {
              fieldErrors._errors.push(mapper(issue));
            } else {
              let curr = fieldErrors;
              let i = 0;
              while (i < issue.path.length) {
                const el = issue.path[i];
                const terminal = i === issue.path.length - 1;
                if (!terminal) {
                  curr[el] = curr[el] || { _errors: [] };
                } else {
                  curr[el] = curr[el] || { _errors: [] };
                  curr[el]._errors.push(mapper(issue));
                }
                curr = curr[el];
                i++;
              }
            }
          }
        };
        processError(this);
        return fieldErrors;
      }
      static assert(value) {
        if (!(value instanceof _ZodError)) {
          throw new Error(`Not a ZodError: ${value}`);
        }
      }
      toString() {
        return this.message;
      }
      get message() {
        return JSON.stringify(this.issues, util_js_1.util.jsonStringifyReplacer, 2);
      }
      get isEmpty() {
        return this.issues.length === 0;
      }
      flatten(mapper = (issue) => issue.message) {
        const fieldErrors = {};
        const formErrors = [];
        for (const sub of this.issues) {
          if (sub.path.length > 0) {
            fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
            fieldErrors[sub.path[0]].push(mapper(sub));
          } else {
            formErrors.push(mapper(sub));
          }
        }
        return { formErrors, fieldErrors };
      }
      get formErrors() {
        return this.flatten();
      }
    };
    exports.ZodError = ZodError2;
    ZodError2.create = (issues) => {
      const error = new ZodError2(issues);
      return error;
    };
  }
});

// ../../node_modules/zod/dist/cjs/v3/locales/en.js
var require_en = __commonJS({
  "../../node_modules/zod/dist/cjs/v3/locales/en.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    var ZodError_js_1 = require_ZodError();
    var util_js_1 = require_util();
    var errorMap2 = (issue, _ctx) => {
      let message;
      switch (issue.code) {
        case ZodError_js_1.ZodIssueCode.invalid_type:
          if (issue.received === util_js_1.ZodParsedType.undefined) {
            message = "Required";
          } else {
            message = `Expected ${issue.expected}, received ${issue.received}`;
          }
          break;
        case ZodError_js_1.ZodIssueCode.invalid_literal:
          message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util_js_1.util.jsonStringifyReplacer)}`;
          break;
        case ZodError_js_1.ZodIssueCode.unrecognized_keys:
          message = `Unrecognized key(s) in object: ${util_js_1.util.joinValues(issue.keys, ", ")}`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_union:
          message = `Invalid input`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_union_discriminator:
          message = `Invalid discriminator value. Expected ${util_js_1.util.joinValues(issue.options)}`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_enum_value:
          message = `Invalid enum value. Expected ${util_js_1.util.joinValues(issue.options)}, received '${issue.received}'`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_arguments:
          message = `Invalid function arguments`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_return_type:
          message = `Invalid function return type`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_date:
          message = `Invalid date`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_string:
          if (typeof issue.validation === "object") {
            if ("includes" in issue.validation) {
              message = `Invalid input: must include "${issue.validation.includes}"`;
              if (typeof issue.validation.position === "number") {
                message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
              }
            } else if ("startsWith" in issue.validation) {
              message = `Invalid input: must start with "${issue.validation.startsWith}"`;
            } else if ("endsWith" in issue.validation) {
              message = `Invalid input: must end with "${issue.validation.endsWith}"`;
            } else {
              util_js_1.util.assertNever(issue.validation);
            }
          } else if (issue.validation !== "regex") {
            message = `Invalid ${issue.validation}`;
          } else {
            message = "Invalid";
          }
          break;
        case ZodError_js_1.ZodIssueCode.too_small:
          if (issue.type === "array")
            message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
          else if (issue.type === "string")
            message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
          else if (issue.type === "number")
            message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
          else if (issue.type === "date")
            message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
          else
            message = "Invalid input";
          break;
        case ZodError_js_1.ZodIssueCode.too_big:
          if (issue.type === "array")
            message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
          else if (issue.type === "string")
            message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
          else if (issue.type === "number")
            message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
          else if (issue.type === "bigint")
            message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
          else if (issue.type === "date")
            message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
          else
            message = "Invalid input";
          break;
        case ZodError_js_1.ZodIssueCode.custom:
          message = `Invalid input`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_intersection_types:
          message = `Intersection results could not be merged`;
          break;
        case ZodError_js_1.ZodIssueCode.not_multiple_of:
          message = `Number must be a multiple of ${issue.multipleOf}`;
          break;
        case ZodError_js_1.ZodIssueCode.not_finite:
          message = "Number must be finite";
          break;
        default:
          message = _ctx.defaultError;
          util_js_1.util.assertNever(issue);
      }
      return { message };
    };
    exports.default = errorMap2;
  }
});

// ../../node_modules/zod/dist/cjs/v3/errors.js
var require_errors = __commonJS({
  "../../node_modules/zod/dist/cjs/v3/errors.js"(exports) {
    "use strict";
    init_esm();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultErrorMap = void 0;
    exports.setErrorMap = setErrorMap2;
    exports.getErrorMap = getErrorMap2;
    var en_js_1 = __importDefault(require_en());
    exports.defaultErrorMap = en_js_1.default;
    var overrideErrorMap2 = en_js_1.default;
    function setErrorMap2(map) {
      overrideErrorMap2 = map;
    }
    function getErrorMap2() {
      return overrideErrorMap2;
    }
  }
});

// ../../node_modules/zod/dist/cjs/v3/helpers/parseUtil.js
var require_parseUtil = __commonJS({
  "../../node_modules/zod/dist/cjs/v3/helpers/parseUtil.js"(exports) {
    "use strict";
    init_esm();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isAsync = exports.isValid = exports.isDirty = exports.isAborted = exports.OK = exports.DIRTY = exports.INVALID = exports.ParseStatus = exports.EMPTY_PATH = exports.makeIssue = void 0;
    exports.addIssueToContext = addIssueToContext2;
    var errors_js_1 = require_errors();
    var en_js_1 = __importDefault(require_en());
    var makeIssue2 = (params) => {
      const { data, path, errorMaps, issueData } = params;
      const fullPath = [...path, ...issueData.path || []];
      const fullIssue = {
        ...issueData,
        path: fullPath
      };
      if (issueData.message !== void 0) {
        return {
          ...issueData,
          path: fullPath,
          message: issueData.message
        };
      }
      let errorMessage = "";
      const maps = errorMaps.filter((m) => !!m).slice().reverse();
      for (const map of maps) {
        errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
      }
      return {
        ...issueData,
        path: fullPath,
        message: errorMessage
      };
    };
    exports.makeIssue = makeIssue2;
    exports.EMPTY_PATH = [];
    function addIssueToContext2(ctx, issueData) {
      const overrideMap = (0, errors_js_1.getErrorMap)();
      const issue = (0, exports.makeIssue)({
        issueData,
        data: ctx.data,
        path: ctx.path,
        errorMaps: [
          ctx.common.contextualErrorMap,
          // contextual error map is first priority
          ctx.schemaErrorMap,
          // then schema-bound map if available
          overrideMap,
          // then global override map
          overrideMap === en_js_1.default ? void 0 : en_js_1.default
          // then global default map
        ].filter((x) => !!x)
      });
      ctx.common.issues.push(issue);
    }
    var ParseStatus2 = class _ParseStatus {
      constructor() {
        this.value = "valid";
      }
      dirty() {
        if (this.value === "valid")
          this.value = "dirty";
      }
      abort() {
        if (this.value !== "aborted")
          this.value = "aborted";
      }
      static mergeArray(status, results) {
        const arrayValue = [];
        for (const s of results) {
          if (s.status === "aborted")
            return exports.INVALID;
          if (s.status === "dirty")
            status.dirty();
          arrayValue.push(s.value);
        }
        return { status: status.value, value: arrayValue };
      }
      static async mergeObjectAsync(status, pairs) {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value
          });
        }
        return _ParseStatus.mergeObjectSync(status, syncPairs);
      }
      static mergeObjectSync(status, pairs) {
        const finalObject = {};
        for (const pair of pairs) {
          const { key, value } = pair;
          if (key.status === "aborted")
            return exports.INVALID;
          if (value.status === "aborted")
            return exports.INVALID;
          if (key.status === "dirty")
            status.dirty();
          if (value.status === "dirty")
            status.dirty();
          if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
            finalObject[key.value] = value.value;
          }
        }
        return { status: status.value, value: finalObject };
      }
    };
    exports.ParseStatus = ParseStatus2;
    exports.INVALID = Object.freeze({
      status: "aborted"
    });
    var DIRTY2 = (value) => ({ status: "dirty", value });
    exports.DIRTY = DIRTY2;
    var OK2 = (value) => ({ status: "valid", value });
    exports.OK = OK2;
    var isAborted2 = (x) => x.status === "aborted";
    exports.isAborted = isAborted2;
    var isDirty2 = (x) => x.status === "dirty";
    exports.isDirty = isDirty2;
    var isValid2 = (x) => x.status === "valid";
    exports.isValid = isValid2;
    var isAsync2 = (x) => typeof Promise !== "undefined" && x instanceof Promise;
    exports.isAsync = isAsync2;
  }
});

// ../../node_modules/zod/dist/cjs/v3/helpers/typeAliases.js
var require_typeAliases = __commonJS({
  "../../node_modules/zod/dist/cjs/v3/helpers/typeAliases.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../node_modules/zod/dist/cjs/v3/helpers/errorUtil.js
var require_errorUtil = __commonJS({
  "../../node_modules/zod/dist/cjs/v3/helpers/errorUtil.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.errorUtil = void 0;
    var errorUtil2;
    (function(errorUtil3) {
      errorUtil3.errToObj = (message) => typeof message === "string" ? { message } : message || {};
      errorUtil3.toString = (message) => typeof message === "string" ? message : message?.message;
    })(errorUtil2 || (exports.errorUtil = errorUtil2 = {}));
  }
});

// ../../node_modules/zod/dist/cjs/v3/types.js
var require_types = __commonJS({
  "../../node_modules/zod/dist/cjs/v3/types.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.discriminatedUnion = exports.date = exports.boolean = exports.bigint = exports.array = exports.any = exports.coerce = exports.ZodFirstPartyTypeKind = exports.late = exports.ZodSchema = exports.Schema = exports.ZodReadonly = exports.ZodPipeline = exports.ZodBranded = exports.BRAND = exports.ZodNaN = exports.ZodCatch = exports.ZodDefault = exports.ZodNullable = exports.ZodOptional = exports.ZodTransformer = exports.ZodEffects = exports.ZodPromise = exports.ZodNativeEnum = exports.ZodEnum = exports.ZodLiteral = exports.ZodLazy = exports.ZodFunction = exports.ZodSet = exports.ZodMap = exports.ZodRecord = exports.ZodTuple = exports.ZodIntersection = exports.ZodDiscriminatedUnion = exports.ZodUnion = exports.ZodObject = exports.ZodArray = exports.ZodVoid = exports.ZodNever = exports.ZodUnknown = exports.ZodAny = exports.ZodNull = exports.ZodUndefined = exports.ZodSymbol = exports.ZodDate = exports.ZodBoolean = exports.ZodBigInt = exports.ZodNumber = exports.ZodString = exports.ZodType = void 0;
    exports.NEVER = exports.void = exports.unknown = exports.union = exports.undefined = exports.tuple = exports.transformer = exports.symbol = exports.string = exports.strictObject = exports.set = exports.record = exports.promise = exports.preprocess = exports.pipeline = exports.ostring = exports.optional = exports.onumber = exports.oboolean = exports.object = exports.number = exports.nullable = exports.null = exports.never = exports.nativeEnum = exports.nan = exports.map = exports.literal = exports.lazy = exports.intersection = exports.instanceof = exports.function = exports.enum = exports.effect = void 0;
    exports.datetimeRegex = datetimeRegex2;
    exports.custom = custom2;
    var ZodError_js_1 = require_ZodError();
    var errors_js_1 = require_errors();
    var errorUtil_js_1 = require_errorUtil();
    var parseUtil_js_1 = require_parseUtil();
    var util_js_1 = require_util();
    var ParseInputLazyPath2 = class {
      constructor(parent, value, path, key) {
        this._cachedPath = [];
        this.parent = parent;
        this.data = value;
        this._path = path;
        this._key = key;
      }
      get path() {
        if (!this._cachedPath.length) {
          if (Array.isArray(this._key)) {
            this._cachedPath.push(...this._path, ...this._key);
          } else {
            this._cachedPath.push(...this._path, this._key);
          }
        }
        return this._cachedPath;
      }
    };
    var handleResult2 = (ctx, result) => {
      if ((0, parseUtil_js_1.isValid)(result)) {
        return { success: true, data: result.value };
      } else {
        if (!ctx.common.issues.length) {
          throw new Error("Validation failed but no issues detected.");
        }
        return {
          success: false,
          get error() {
            if (this._error)
              return this._error;
            const error = new ZodError_js_1.ZodError(ctx.common.issues);
            this._error = error;
            return this._error;
          }
        };
      }
    };
    function processCreateParams2(params) {
      if (!params)
        return {};
      const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
      if (errorMap2 && (invalid_type_error || required_error)) {
        throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
      }
      if (errorMap2)
        return { errorMap: errorMap2, description };
      const customMap = (iss, ctx) => {
        const { message } = params;
        if (iss.code === "invalid_enum_value") {
          return { message: message ?? ctx.defaultError };
        }
        if (typeof ctx.data === "undefined") {
          return { message: message ?? required_error ?? ctx.defaultError };
        }
        if (iss.code !== "invalid_type")
          return { message: ctx.defaultError };
        return { message: message ?? invalid_type_error ?? ctx.defaultError };
      };
      return { errorMap: customMap, description };
    }
    var ZodType2 = class {
      get description() {
        return this._def.description;
      }
      _getType(input) {
        return (0, util_js_1.getParsedType)(input.data);
      }
      _getOrReturnCtx(input, ctx) {
        return ctx || {
          common: input.parent.common,
          data: input.data,
          parsedType: (0, util_js_1.getParsedType)(input.data),
          schemaErrorMap: this._def.errorMap,
          path: input.path,
          parent: input.parent
        };
      }
      _processInputParams(input) {
        return {
          status: new parseUtil_js_1.ParseStatus(),
          ctx: {
            common: input.parent.common,
            data: input.data,
            parsedType: (0, util_js_1.getParsedType)(input.data),
            schemaErrorMap: this._def.errorMap,
            path: input.path,
            parent: input.parent
          }
        };
      }
      _parseSync(input) {
        const result = this._parse(input);
        if ((0, parseUtil_js_1.isAsync)(result)) {
          throw new Error("Synchronous parse encountered promise.");
        }
        return result;
      }
      _parseAsync(input) {
        const result = this._parse(input);
        return Promise.resolve(result);
      }
      parse(data, params) {
        const result = this.safeParse(data, params);
        if (result.success)
          return result.data;
        throw result.error;
      }
      safeParse(data, params) {
        const ctx = {
          common: {
            issues: [],
            async: params?.async ?? false,
            contextualErrorMap: params?.errorMap
          },
          path: params?.path || [],
          schemaErrorMap: this._def.errorMap,
          parent: null,
          data,
          parsedType: (0, util_js_1.getParsedType)(data)
        };
        const result = this._parseSync({ data, path: ctx.path, parent: ctx });
        return handleResult2(ctx, result);
      }
      "~validate"(data) {
        const ctx = {
          common: {
            issues: [],
            async: !!this["~standard"].async
          },
          path: [],
          schemaErrorMap: this._def.errorMap,
          parent: null,
          data,
          parsedType: (0, util_js_1.getParsedType)(data)
        };
        if (!this["~standard"].async) {
          try {
            const result = this._parseSync({ data, path: [], parent: ctx });
            return (0, parseUtil_js_1.isValid)(result) ? {
              value: result.value
            } : {
              issues: ctx.common.issues
            };
          } catch (err) {
            if (err?.message?.toLowerCase()?.includes("encountered")) {
              this["~standard"].async = true;
            }
            ctx.common = {
              issues: [],
              async: true
            };
          }
        }
        return this._parseAsync({ data, path: [], parent: ctx }).then((result) => (0, parseUtil_js_1.isValid)(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        });
      }
      async parseAsync(data, params) {
        const result = await this.safeParseAsync(data, params);
        if (result.success)
          return result.data;
        throw result.error;
      }
      async safeParseAsync(data, params) {
        const ctx = {
          common: {
            issues: [],
            contextualErrorMap: params?.errorMap,
            async: true
          },
          path: params?.path || [],
          schemaErrorMap: this._def.errorMap,
          parent: null,
          data,
          parsedType: (0, util_js_1.getParsedType)(data)
        };
        const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
        const result = await ((0, parseUtil_js_1.isAsync)(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
        return handleResult2(ctx, result);
      }
      refine(check, message) {
        const getIssueProperties = (val) => {
          if (typeof message === "string" || typeof message === "undefined") {
            return { message };
          } else if (typeof message === "function") {
            return message(val);
          } else {
            return message;
          }
        };
        return this._refinement((val, ctx) => {
          const result = check(val);
          const setError = () => ctx.addIssue({
            code: ZodError_js_1.ZodIssueCode.custom,
            ...getIssueProperties(val)
          });
          if (typeof Promise !== "undefined" && result instanceof Promise) {
            return result.then((data) => {
              if (!data) {
                setError();
                return false;
              } else {
                return true;
              }
            });
          }
          if (!result) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      refinement(check, refinementData) {
        return this._refinement((val, ctx) => {
          if (!check(val)) {
            ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
            return false;
          } else {
            return true;
          }
        });
      }
      _refinement(refinement) {
        return new ZodEffects2({
          schema: this,
          typeName: ZodFirstPartyTypeKind2.ZodEffects,
          effect: { type: "refinement", refinement }
        });
      }
      superRefine(refinement) {
        return this._refinement(refinement);
      }
      constructor(def) {
        this.spa = this.safeParseAsync;
        this._def = def;
        this.parse = this.parse.bind(this);
        this.safeParse = this.safeParse.bind(this);
        this.parseAsync = this.parseAsync.bind(this);
        this.safeParseAsync = this.safeParseAsync.bind(this);
        this.spa = this.spa.bind(this);
        this.refine = this.refine.bind(this);
        this.refinement = this.refinement.bind(this);
        this.superRefine = this.superRefine.bind(this);
        this.optional = this.optional.bind(this);
        this.nullable = this.nullable.bind(this);
        this.nullish = this.nullish.bind(this);
        this.array = this.array.bind(this);
        this.promise = this.promise.bind(this);
        this.or = this.or.bind(this);
        this.and = this.and.bind(this);
        this.transform = this.transform.bind(this);
        this.brand = this.brand.bind(this);
        this.default = this.default.bind(this);
        this.catch = this.catch.bind(this);
        this.describe = this.describe.bind(this);
        this.pipe = this.pipe.bind(this);
        this.readonly = this.readonly.bind(this);
        this.isNullable = this.isNullable.bind(this);
        this.isOptional = this.isOptional.bind(this);
        this["~standard"] = {
          version: 1,
          vendor: "zod",
          validate: (data) => this["~validate"](data)
        };
      }
      optional() {
        return ZodOptional2.create(this, this._def);
      }
      nullable() {
        return ZodNullable2.create(this, this._def);
      }
      nullish() {
        return this.nullable().optional();
      }
      array() {
        return ZodArray2.create(this);
      }
      promise() {
        return ZodPromise2.create(this, this._def);
      }
      or(option) {
        return ZodUnion2.create([this, option], this._def);
      }
      and(incoming) {
        return ZodIntersection2.create(this, incoming, this._def);
      }
      transform(transform) {
        return new ZodEffects2({
          ...processCreateParams2(this._def),
          schema: this,
          typeName: ZodFirstPartyTypeKind2.ZodEffects,
          effect: { type: "transform", transform }
        });
      }
      default(def) {
        const defaultValueFunc = typeof def === "function" ? def : () => def;
        return new ZodDefault2({
          ...processCreateParams2(this._def),
          innerType: this,
          defaultValue: defaultValueFunc,
          typeName: ZodFirstPartyTypeKind2.ZodDefault
        });
      }
      brand() {
        return new ZodBranded2({
          typeName: ZodFirstPartyTypeKind2.ZodBranded,
          type: this,
          ...processCreateParams2(this._def)
        });
      }
      catch(def) {
        const catchValueFunc = typeof def === "function" ? def : () => def;
        return new ZodCatch2({
          ...processCreateParams2(this._def),
          innerType: this,
          catchValue: catchValueFunc,
          typeName: ZodFirstPartyTypeKind2.ZodCatch
        });
      }
      describe(description) {
        const This = this.constructor;
        return new This({
          ...this._def,
          description
        });
      }
      pipe(target) {
        return ZodPipeline2.create(this, target);
      }
      readonly() {
        return ZodReadonly2.create(this);
      }
      isOptional() {
        return this.safeParse(void 0).success;
      }
      isNullable() {
        return this.safeParse(null).success;
      }
    };
    exports.ZodType = ZodType2;
    exports.Schema = ZodType2;
    exports.ZodSchema = ZodType2;
    var cuidRegex2 = /^c[^\s-]{8,}$/i;
    var cuid2Regex2 = /^[0-9a-z]+$/;
    var ulidRegex2 = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
    var uuidRegex2 = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
    var nanoidRegex2 = /^[a-z0-9_-]{21}$/i;
    var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    var durationRegex2 = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
    var emailRegex2 = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
    var _emojiRegex2 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
    var emojiRegex2;
    var ipv4Regex2 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
    var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
    var ipv6Regex2 = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
    var base64Regex2 = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
    var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
    var dateRegexSource2 = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
    var dateRegex2 = new RegExp(`^${dateRegexSource2}$`);
    function timeRegexSource2(args) {
      let secondsRegexSource = `[0-5]\\d`;
      if (args.precision) {
        secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
      } else if (args.precision == null) {
        secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
      }
      const secondsQuantifier = args.precision ? "+" : "?";
      return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
    }
    function timeRegex2(args) {
      return new RegExp(`^${timeRegexSource2(args)}$`);
    }
    function datetimeRegex2(args) {
      let regex = `${dateRegexSource2}T${timeRegexSource2(args)}`;
      const opts = [];
      opts.push(args.local ? `Z?` : `Z`);
      if (args.offset)
        opts.push(`([+-]\\d{2}:?\\d{2})`);
      regex = `${regex}(${opts.join("|")})`;
      return new RegExp(`^${regex}$`);
    }
    function isValidIP2(ip, version) {
      if ((version === "v4" || !version) && ipv4Regex2.test(ip)) {
        return true;
      }
      if ((version === "v6" || !version) && ipv6Regex2.test(ip)) {
        return true;
      }
      return false;
    }
    function isValidJWT(jwt, alg) {
      if (!jwtRegex.test(jwt))
        return false;
      try {
        const [header] = jwt.split(".");
        const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
        const decoded = JSON.parse(atob(base64));
        if (typeof decoded !== "object" || decoded === null)
          return false;
        if ("typ" in decoded && decoded?.typ !== "JWT")
          return false;
        if (!decoded.alg)
          return false;
        if (alg && decoded.alg !== alg)
          return false;
        return true;
      } catch {
        return false;
      }
    }
    function isValidCidr(ip, version) {
      if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
        return true;
      }
      if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
        return true;
      }
      return false;
    }
    var ZodString2 = class _ZodString extends ZodType2 {
      _parse(input) {
        if (this._def.coerce) {
          input.data = String(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.string) {
          const ctx2 = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx2, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.string,
            received: ctx2.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        const status = new parseUtil_js_1.ParseStatus();
        let ctx = void 0;
        for (const check of this._def.checks) {
          if (check.kind === "min") {
            if (input.data.length < check.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_small,
                minimum: check.value,
                type: "string",
                inclusive: true,
                exact: false,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "max") {
            if (input.data.length > check.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_big,
                maximum: check.value,
                type: "string",
                inclusive: true,
                exact: false,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "length") {
            const tooBig = input.data.length > check.value;
            const tooSmall = input.data.length < check.value;
            if (tooBig || tooSmall) {
              ctx = this._getOrReturnCtx(input, ctx);
              if (tooBig) {
                (0, parseUtil_js_1.addIssueToContext)(ctx, {
                  code: ZodError_js_1.ZodIssueCode.too_big,
                  maximum: check.value,
                  type: "string",
                  inclusive: true,
                  exact: true,
                  message: check.message
                });
              } else if (tooSmall) {
                (0, parseUtil_js_1.addIssueToContext)(ctx, {
                  code: ZodError_js_1.ZodIssueCode.too_small,
                  minimum: check.value,
                  type: "string",
                  inclusive: true,
                  exact: true,
                  message: check.message
                });
              }
              status.dirty();
            }
          } else if (check.kind === "email") {
            if (!emailRegex2.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "email",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "emoji") {
            if (!emojiRegex2) {
              emojiRegex2 = new RegExp(_emojiRegex2, "u");
            }
            if (!emojiRegex2.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "emoji",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "uuid") {
            if (!uuidRegex2.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "uuid",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "nanoid") {
            if (!nanoidRegex2.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "nanoid",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "cuid") {
            if (!cuidRegex2.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "cuid",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "cuid2") {
            if (!cuid2Regex2.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "cuid2",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "ulid") {
            if (!ulidRegex2.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "ulid",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "url") {
            try {
              new URL(input.data);
            } catch {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "url",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "regex") {
            check.regex.lastIndex = 0;
            const testResult = check.regex.test(input.data);
            if (!testResult) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "regex",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "trim") {
            input.data = input.data.trim();
          } else if (check.kind === "includes") {
            if (!input.data.includes(check.value, check.position)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                validation: { includes: check.value, position: check.position },
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "toLowerCase") {
            input.data = input.data.toLowerCase();
          } else if (check.kind === "toUpperCase") {
            input.data = input.data.toUpperCase();
          } else if (check.kind === "startsWith") {
            if (!input.data.startsWith(check.value)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                validation: { startsWith: check.value },
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "endsWith") {
            if (!input.data.endsWith(check.value)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                validation: { endsWith: check.value },
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "datetime") {
            const regex = datetimeRegex2(check);
            if (!regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                validation: "datetime",
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "date") {
            const regex = dateRegex2;
            if (!regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                validation: "date",
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "time") {
            const regex = timeRegex2(check);
            if (!regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                validation: "time",
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "duration") {
            if (!durationRegex2.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "duration",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "ip") {
            if (!isValidIP2(input.data, check.version)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "ip",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "jwt") {
            if (!isValidJWT(input.data, check.alg)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "jwt",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "cidr") {
            if (!isValidCidr(input.data, check.version)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "cidr",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "base64") {
            if (!base64Regex2.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "base64",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "base64url") {
            if (!base64urlRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "base64url",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else {
            util_js_1.util.assertNever(check);
          }
        }
        return { status: status.value, value: input.data };
      }
      _regex(regex, validation, message) {
        return this.refinement((data) => regex.test(data), {
          validation,
          code: ZodError_js_1.ZodIssueCode.invalid_string,
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      _addCheck(check) {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, check]
        });
      }
      email(message) {
        return this._addCheck({ kind: "email", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      url(message) {
        return this._addCheck({ kind: "url", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      emoji(message) {
        return this._addCheck({ kind: "emoji", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      uuid(message) {
        return this._addCheck({ kind: "uuid", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      nanoid(message) {
        return this._addCheck({ kind: "nanoid", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      cuid(message) {
        return this._addCheck({ kind: "cuid", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      cuid2(message) {
        return this._addCheck({ kind: "cuid2", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      ulid(message) {
        return this._addCheck({ kind: "ulid", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      base64(message) {
        return this._addCheck({ kind: "base64", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      base64url(message) {
        return this._addCheck({
          kind: "base64url",
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      jwt(options) {
        return this._addCheck({ kind: "jwt", ...errorUtil_js_1.errorUtil.errToObj(options) });
      }
      ip(options) {
        return this._addCheck({ kind: "ip", ...errorUtil_js_1.errorUtil.errToObj(options) });
      }
      cidr(options) {
        return this._addCheck({ kind: "cidr", ...errorUtil_js_1.errorUtil.errToObj(options) });
      }
      datetime(options) {
        if (typeof options === "string") {
          return this._addCheck({
            kind: "datetime",
            precision: null,
            offset: false,
            local: false,
            message: options
          });
        }
        return this._addCheck({
          kind: "datetime",
          precision: typeof options?.precision === "undefined" ? null : options?.precision,
          offset: options?.offset ?? false,
          local: options?.local ?? false,
          ...errorUtil_js_1.errorUtil.errToObj(options?.message)
        });
      }
      date(message) {
        return this._addCheck({ kind: "date", message });
      }
      time(options) {
        if (typeof options === "string") {
          return this._addCheck({
            kind: "time",
            precision: null,
            message: options
          });
        }
        return this._addCheck({
          kind: "time",
          precision: typeof options?.precision === "undefined" ? null : options?.precision,
          ...errorUtil_js_1.errorUtil.errToObj(options?.message)
        });
      }
      duration(message) {
        return this._addCheck({ kind: "duration", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      regex(regex, message) {
        return this._addCheck({
          kind: "regex",
          regex,
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      includes(value, options) {
        return this._addCheck({
          kind: "includes",
          value,
          position: options?.position,
          ...errorUtil_js_1.errorUtil.errToObj(options?.message)
        });
      }
      startsWith(value, message) {
        return this._addCheck({
          kind: "startsWith",
          value,
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      endsWith(value, message) {
        return this._addCheck({
          kind: "endsWith",
          value,
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      min(minLength, message) {
        return this._addCheck({
          kind: "min",
          value: minLength,
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      max(maxLength, message) {
        return this._addCheck({
          kind: "max",
          value: maxLength,
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      length(len, message) {
        return this._addCheck({
          kind: "length",
          value: len,
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      /**
       * Equivalent to `.min(1)`
       */
      nonempty(message) {
        return this.min(1, errorUtil_js_1.errorUtil.errToObj(message));
      }
      trim() {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, { kind: "trim" }]
        });
      }
      toLowerCase() {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, { kind: "toLowerCase" }]
        });
      }
      toUpperCase() {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, { kind: "toUpperCase" }]
        });
      }
      get isDatetime() {
        return !!this._def.checks.find((ch) => ch.kind === "datetime");
      }
      get isDate() {
        return !!this._def.checks.find((ch) => ch.kind === "date");
      }
      get isTime() {
        return !!this._def.checks.find((ch) => ch.kind === "time");
      }
      get isDuration() {
        return !!this._def.checks.find((ch) => ch.kind === "duration");
      }
      get isEmail() {
        return !!this._def.checks.find((ch) => ch.kind === "email");
      }
      get isURL() {
        return !!this._def.checks.find((ch) => ch.kind === "url");
      }
      get isEmoji() {
        return !!this._def.checks.find((ch) => ch.kind === "emoji");
      }
      get isUUID() {
        return !!this._def.checks.find((ch) => ch.kind === "uuid");
      }
      get isNANOID() {
        return !!this._def.checks.find((ch) => ch.kind === "nanoid");
      }
      get isCUID() {
        return !!this._def.checks.find((ch) => ch.kind === "cuid");
      }
      get isCUID2() {
        return !!this._def.checks.find((ch) => ch.kind === "cuid2");
      }
      get isULID() {
        return !!this._def.checks.find((ch) => ch.kind === "ulid");
      }
      get isIP() {
        return !!this._def.checks.find((ch) => ch.kind === "ip");
      }
      get isCIDR() {
        return !!this._def.checks.find((ch) => ch.kind === "cidr");
      }
      get isBase64() {
        return !!this._def.checks.find((ch) => ch.kind === "base64");
      }
      get isBase64url() {
        return !!this._def.checks.find((ch) => ch.kind === "base64url");
      }
      get minLength() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min;
      }
      get maxLength() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max;
      }
    };
    exports.ZodString = ZodString2;
    ZodString2.create = (params) => {
      return new ZodString2({
        checks: [],
        typeName: ZodFirstPartyTypeKind2.ZodString,
        coerce: params?.coerce ?? false,
        ...processCreateParams2(params)
      });
    };
    function floatSafeRemainder2(val, step) {
      const valDecCount = (val.toString().split(".")[1] || "").length;
      const stepDecCount = (step.toString().split(".")[1] || "").length;
      const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
      const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
      const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
      return valInt % stepInt / 10 ** decCount;
    }
    var ZodNumber2 = class _ZodNumber extends ZodType2 {
      constructor() {
        super(...arguments);
        this.min = this.gte;
        this.max = this.lte;
        this.step = this.multipleOf;
      }
      _parse(input) {
        if (this._def.coerce) {
          input.data = Number(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.number) {
          const ctx2 = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx2, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.number,
            received: ctx2.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        let ctx = void 0;
        const status = new parseUtil_js_1.ParseStatus();
        for (const check of this._def.checks) {
          if (check.kind === "int") {
            if (!util_js_1.util.isInteger(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.invalid_type,
                expected: "integer",
                received: "float",
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "min") {
            const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
            if (tooSmall) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_small,
                minimum: check.value,
                type: "number",
                inclusive: check.inclusive,
                exact: false,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "max") {
            const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
            if (tooBig) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_big,
                maximum: check.value,
                type: "number",
                inclusive: check.inclusive,
                exact: false,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "multipleOf") {
            if (floatSafeRemainder2(input.data, check.value) !== 0) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.not_multiple_of,
                multipleOf: check.value,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "finite") {
            if (!Number.isFinite(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.not_finite,
                message: check.message
              });
              status.dirty();
            }
          } else {
            util_js_1.util.assertNever(check);
          }
        }
        return { status: status.value, value: input.data };
      }
      gte(value, message) {
        return this.setLimit("min", value, true, errorUtil_js_1.errorUtil.toString(message));
      }
      gt(value, message) {
        return this.setLimit("min", value, false, errorUtil_js_1.errorUtil.toString(message));
      }
      lte(value, message) {
        return this.setLimit("max", value, true, errorUtil_js_1.errorUtil.toString(message));
      }
      lt(value, message) {
        return this.setLimit("max", value, false, errorUtil_js_1.errorUtil.toString(message));
      }
      setLimit(kind, value, inclusive, message) {
        return new _ZodNumber({
          ...this._def,
          checks: [
            ...this._def.checks,
            {
              kind,
              value,
              inclusive,
              message: errorUtil_js_1.errorUtil.toString(message)
            }
          ]
        });
      }
      _addCheck(check) {
        return new _ZodNumber({
          ...this._def,
          checks: [...this._def.checks, check]
        });
      }
      int(message) {
        return this._addCheck({
          kind: "int",
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      positive(message) {
        return this._addCheck({
          kind: "min",
          value: 0,
          inclusive: false,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      negative(message) {
        return this._addCheck({
          kind: "max",
          value: 0,
          inclusive: false,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      nonpositive(message) {
        return this._addCheck({
          kind: "max",
          value: 0,
          inclusive: true,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      nonnegative(message) {
        return this._addCheck({
          kind: "min",
          value: 0,
          inclusive: true,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      multipleOf(value, message) {
        return this._addCheck({
          kind: "multipleOf",
          value,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      finite(message) {
        return this._addCheck({
          kind: "finite",
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      safe(message) {
        return this._addCheck({
          kind: "min",
          inclusive: true,
          value: Number.MIN_SAFE_INTEGER,
          message: errorUtil_js_1.errorUtil.toString(message)
        })._addCheck({
          kind: "max",
          inclusive: true,
          value: Number.MAX_SAFE_INTEGER,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      get minValue() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min;
      }
      get maxValue() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max;
      }
      get isInt() {
        return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util_js_1.util.isInteger(ch.value));
      }
      get isFinite() {
        let max = null;
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
            return true;
          } else if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          } else if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return Number.isFinite(min) && Number.isFinite(max);
      }
    };
    exports.ZodNumber = ZodNumber2;
    ZodNumber2.create = (params) => {
      return new ZodNumber2({
        checks: [],
        typeName: ZodFirstPartyTypeKind2.ZodNumber,
        coerce: params?.coerce || false,
        ...processCreateParams2(params)
      });
    };
    var ZodBigInt2 = class _ZodBigInt extends ZodType2 {
      constructor() {
        super(...arguments);
        this.min = this.gte;
        this.max = this.lte;
      }
      _parse(input) {
        if (this._def.coerce) {
          try {
            input.data = BigInt(input.data);
          } catch {
            return this._getInvalidInput(input);
          }
        }
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.bigint) {
          return this._getInvalidInput(input);
        }
        let ctx = void 0;
        const status = new parseUtil_js_1.ParseStatus();
        for (const check of this._def.checks) {
          if (check.kind === "min") {
            const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
            if (tooSmall) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_small,
                type: "bigint",
                minimum: check.value,
                inclusive: check.inclusive,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "max") {
            const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
            if (tooBig) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_big,
                type: "bigint",
                maximum: check.value,
                inclusive: check.inclusive,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "multipleOf") {
            if (input.data % check.value !== BigInt(0)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.not_multiple_of,
                multipleOf: check.value,
                message: check.message
              });
              status.dirty();
            }
          } else {
            util_js_1.util.assertNever(check);
          }
        }
        return { status: status.value, value: input.data };
      }
      _getInvalidInput(input) {
        const ctx = this._getOrReturnCtx(input);
        (0, parseUtil_js_1.addIssueToContext)(ctx, {
          code: ZodError_js_1.ZodIssueCode.invalid_type,
          expected: util_js_1.ZodParsedType.bigint,
          received: ctx.parsedType
        });
        return parseUtil_js_1.INVALID;
      }
      gte(value, message) {
        return this.setLimit("min", value, true, errorUtil_js_1.errorUtil.toString(message));
      }
      gt(value, message) {
        return this.setLimit("min", value, false, errorUtil_js_1.errorUtil.toString(message));
      }
      lte(value, message) {
        return this.setLimit("max", value, true, errorUtil_js_1.errorUtil.toString(message));
      }
      lt(value, message) {
        return this.setLimit("max", value, false, errorUtil_js_1.errorUtil.toString(message));
      }
      setLimit(kind, value, inclusive, message) {
        return new _ZodBigInt({
          ...this._def,
          checks: [
            ...this._def.checks,
            {
              kind,
              value,
              inclusive,
              message: errorUtil_js_1.errorUtil.toString(message)
            }
          ]
        });
      }
      _addCheck(check) {
        return new _ZodBigInt({
          ...this._def,
          checks: [...this._def.checks, check]
        });
      }
      positive(message) {
        return this._addCheck({
          kind: "min",
          value: BigInt(0),
          inclusive: false,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      negative(message) {
        return this._addCheck({
          kind: "max",
          value: BigInt(0),
          inclusive: false,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      nonpositive(message) {
        return this._addCheck({
          kind: "max",
          value: BigInt(0),
          inclusive: true,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      nonnegative(message) {
        return this._addCheck({
          kind: "min",
          value: BigInt(0),
          inclusive: true,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      multipleOf(value, message) {
        return this._addCheck({
          kind: "multipleOf",
          value,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      get minValue() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min;
      }
      get maxValue() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max;
      }
    };
    exports.ZodBigInt = ZodBigInt2;
    ZodBigInt2.create = (params) => {
      return new ZodBigInt2({
        checks: [],
        typeName: ZodFirstPartyTypeKind2.ZodBigInt,
        coerce: params?.coerce ?? false,
        ...processCreateParams2(params)
      });
    };
    var ZodBoolean2 = class extends ZodType2 {
      _parse(input) {
        if (this._def.coerce) {
          input.data = Boolean(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.boolean) {
          const ctx = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.boolean,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        return (0, parseUtil_js_1.OK)(input.data);
      }
    };
    exports.ZodBoolean = ZodBoolean2;
    ZodBoolean2.create = (params) => {
      return new ZodBoolean2({
        typeName: ZodFirstPartyTypeKind2.ZodBoolean,
        coerce: params?.coerce || false,
        ...processCreateParams2(params)
      });
    };
    var ZodDate2 = class _ZodDate extends ZodType2 {
      _parse(input) {
        if (this._def.coerce) {
          input.data = new Date(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.date) {
          const ctx2 = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx2, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.date,
            received: ctx2.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        if (Number.isNaN(input.data.getTime())) {
          const ctx2 = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx2, {
            code: ZodError_js_1.ZodIssueCode.invalid_date
          });
          return parseUtil_js_1.INVALID;
        }
        const status = new parseUtil_js_1.ParseStatus();
        let ctx = void 0;
        for (const check of this._def.checks) {
          if (check.kind === "min") {
            if (input.data.getTime() < check.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_small,
                message: check.message,
                inclusive: true,
                exact: false,
                minimum: check.value,
                type: "date"
              });
              status.dirty();
            }
          } else if (check.kind === "max") {
            if (input.data.getTime() > check.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_big,
                message: check.message,
                inclusive: true,
                exact: false,
                maximum: check.value,
                type: "date"
              });
              status.dirty();
            }
          } else {
            util_js_1.util.assertNever(check);
          }
        }
        return {
          status: status.value,
          value: new Date(input.data.getTime())
        };
      }
      _addCheck(check) {
        return new _ZodDate({
          ...this._def,
          checks: [...this._def.checks, check]
        });
      }
      min(minDate, message) {
        return this._addCheck({
          kind: "min",
          value: minDate.getTime(),
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      max(maxDate, message) {
        return this._addCheck({
          kind: "max",
          value: maxDate.getTime(),
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      get minDate() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min != null ? new Date(min) : null;
      }
      get maxDate() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max != null ? new Date(max) : null;
      }
    };
    exports.ZodDate = ZodDate2;
    ZodDate2.create = (params) => {
      return new ZodDate2({
        checks: [],
        coerce: params?.coerce || false,
        typeName: ZodFirstPartyTypeKind2.ZodDate,
        ...processCreateParams2(params)
      });
    };
    var ZodSymbol2 = class extends ZodType2 {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.symbol) {
          const ctx = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.symbol,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        return (0, parseUtil_js_1.OK)(input.data);
      }
    };
    exports.ZodSymbol = ZodSymbol2;
    ZodSymbol2.create = (params) => {
      return new ZodSymbol2({
        typeName: ZodFirstPartyTypeKind2.ZodSymbol,
        ...processCreateParams2(params)
      });
    };
    var ZodUndefined2 = class extends ZodType2 {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.undefined) {
          const ctx = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.undefined,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        return (0, parseUtil_js_1.OK)(input.data);
      }
    };
    exports.ZodUndefined = ZodUndefined2;
    ZodUndefined2.create = (params) => {
      return new ZodUndefined2({
        typeName: ZodFirstPartyTypeKind2.ZodUndefined,
        ...processCreateParams2(params)
      });
    };
    var ZodNull2 = class extends ZodType2 {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.null) {
          const ctx = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.null,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        return (0, parseUtil_js_1.OK)(input.data);
      }
    };
    exports.ZodNull = ZodNull2;
    ZodNull2.create = (params) => {
      return new ZodNull2({
        typeName: ZodFirstPartyTypeKind2.ZodNull,
        ...processCreateParams2(params)
      });
    };
    var ZodAny2 = class extends ZodType2 {
      constructor() {
        super(...arguments);
        this._any = true;
      }
      _parse(input) {
        return (0, parseUtil_js_1.OK)(input.data);
      }
    };
    exports.ZodAny = ZodAny2;
    ZodAny2.create = (params) => {
      return new ZodAny2({
        typeName: ZodFirstPartyTypeKind2.ZodAny,
        ...processCreateParams2(params)
      });
    };
    var ZodUnknown2 = class extends ZodType2 {
      constructor() {
        super(...arguments);
        this._unknown = true;
      }
      _parse(input) {
        return (0, parseUtil_js_1.OK)(input.data);
      }
    };
    exports.ZodUnknown = ZodUnknown2;
    ZodUnknown2.create = (params) => {
      return new ZodUnknown2({
        typeName: ZodFirstPartyTypeKind2.ZodUnknown,
        ...processCreateParams2(params)
      });
    };
    var ZodNever2 = class extends ZodType2 {
      _parse(input) {
        const ctx = this._getOrReturnCtx(input);
        (0, parseUtil_js_1.addIssueToContext)(ctx, {
          code: ZodError_js_1.ZodIssueCode.invalid_type,
          expected: util_js_1.ZodParsedType.never,
          received: ctx.parsedType
        });
        return parseUtil_js_1.INVALID;
      }
    };
    exports.ZodNever = ZodNever2;
    ZodNever2.create = (params) => {
      return new ZodNever2({
        typeName: ZodFirstPartyTypeKind2.ZodNever,
        ...processCreateParams2(params)
      });
    };
    var ZodVoid2 = class extends ZodType2 {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.undefined) {
          const ctx = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.void,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        return (0, parseUtil_js_1.OK)(input.data);
      }
    };
    exports.ZodVoid = ZodVoid2;
    ZodVoid2.create = (params) => {
      return new ZodVoid2({
        typeName: ZodFirstPartyTypeKind2.ZodVoid,
        ...processCreateParams2(params)
      });
    };
    var ZodArray2 = class _ZodArray extends ZodType2 {
      _parse(input) {
        const { ctx, status } = this._processInputParams(input);
        const def = this._def;
        if (ctx.parsedType !== util_js_1.ZodParsedType.array) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.array,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        if (def.exactLength !== null) {
          const tooBig = ctx.data.length > def.exactLength.value;
          const tooSmall = ctx.data.length < def.exactLength.value;
          if (tooBig || tooSmall) {
            (0, parseUtil_js_1.addIssueToContext)(ctx, {
              code: tooBig ? ZodError_js_1.ZodIssueCode.too_big : ZodError_js_1.ZodIssueCode.too_small,
              minimum: tooSmall ? def.exactLength.value : void 0,
              maximum: tooBig ? def.exactLength.value : void 0,
              type: "array",
              inclusive: true,
              exact: true,
              message: def.exactLength.message
            });
            status.dirty();
          }
        }
        if (def.minLength !== null) {
          if (ctx.data.length < def.minLength.value) {
            (0, parseUtil_js_1.addIssueToContext)(ctx, {
              code: ZodError_js_1.ZodIssueCode.too_small,
              minimum: def.minLength.value,
              type: "array",
              inclusive: true,
              exact: false,
              message: def.minLength.message
            });
            status.dirty();
          }
        }
        if (def.maxLength !== null) {
          if (ctx.data.length > def.maxLength.value) {
            (0, parseUtil_js_1.addIssueToContext)(ctx, {
              code: ZodError_js_1.ZodIssueCode.too_big,
              maximum: def.maxLength.value,
              type: "array",
              inclusive: true,
              exact: false,
              message: def.maxLength.message
            });
            status.dirty();
          }
        }
        if (ctx.common.async) {
          return Promise.all([...ctx.data].map((item, i) => {
            return def.type._parseAsync(new ParseInputLazyPath2(ctx, item, ctx.path, i));
          })).then((result2) => {
            return parseUtil_js_1.ParseStatus.mergeArray(status, result2);
          });
        }
        const result = [...ctx.data].map((item, i) => {
          return def.type._parseSync(new ParseInputLazyPath2(ctx, item, ctx.path, i));
        });
        return parseUtil_js_1.ParseStatus.mergeArray(status, result);
      }
      get element() {
        return this._def.type;
      }
      min(minLength, message) {
        return new _ZodArray({
          ...this._def,
          minLength: { value: minLength, message: errorUtil_js_1.errorUtil.toString(message) }
        });
      }
      max(maxLength, message) {
        return new _ZodArray({
          ...this._def,
          maxLength: { value: maxLength, message: errorUtil_js_1.errorUtil.toString(message) }
        });
      }
      length(len, message) {
        return new _ZodArray({
          ...this._def,
          exactLength: { value: len, message: errorUtil_js_1.errorUtil.toString(message) }
        });
      }
      nonempty(message) {
        return this.min(1, message);
      }
    };
    exports.ZodArray = ZodArray2;
    ZodArray2.create = (schema, params) => {
      return new ZodArray2({
        type: schema,
        minLength: null,
        maxLength: null,
        exactLength: null,
        typeName: ZodFirstPartyTypeKind2.ZodArray,
        ...processCreateParams2(params)
      });
    };
    function deepPartialify2(schema) {
      if (schema instanceof ZodObject2) {
        const newShape = {};
        for (const key in schema.shape) {
          const fieldSchema = schema.shape[key];
          newShape[key] = ZodOptional2.create(deepPartialify2(fieldSchema));
        }
        return new ZodObject2({
          ...schema._def,
          shape: () => newShape
        });
      } else if (schema instanceof ZodArray2) {
        return new ZodArray2({
          ...schema._def,
          type: deepPartialify2(schema.element)
        });
      } else if (schema instanceof ZodOptional2) {
        return ZodOptional2.create(deepPartialify2(schema.unwrap()));
      } else if (schema instanceof ZodNullable2) {
        return ZodNullable2.create(deepPartialify2(schema.unwrap()));
      } else if (schema instanceof ZodTuple2) {
        return ZodTuple2.create(schema.items.map((item) => deepPartialify2(item)));
      } else {
        return schema;
      }
    }
    var ZodObject2 = class _ZodObject extends ZodType2 {
      constructor() {
        super(...arguments);
        this._cached = null;
        this.nonstrict = this.passthrough;
        this.augment = this.extend;
      }
      _getCached() {
        if (this._cached !== null)
          return this._cached;
        const shape = this._def.shape();
        const keys = util_js_1.util.objectKeys(shape);
        this._cached = { shape, keys };
        return this._cached;
      }
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.object) {
          const ctx2 = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx2, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.object,
            received: ctx2.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        const { status, ctx } = this._processInputParams(input);
        const { shape, keys: shapeKeys } = this._getCached();
        const extraKeys = [];
        if (!(this._def.catchall instanceof ZodNever2 && this._def.unknownKeys === "strip")) {
          for (const key in ctx.data) {
            if (!shapeKeys.includes(key)) {
              extraKeys.push(key);
            }
          }
        }
        const pairs = [];
        for (const key of shapeKeys) {
          const keyValidator = shape[key];
          const value = ctx.data[key];
          pairs.push({
            key: { status: "valid", value: key },
            value: keyValidator._parse(new ParseInputLazyPath2(ctx, value, ctx.path, key)),
            alwaysSet: key in ctx.data
          });
        }
        if (this._def.catchall instanceof ZodNever2) {
          const unknownKeys = this._def.unknownKeys;
          if (unknownKeys === "passthrough") {
            for (const key of extraKeys) {
              pairs.push({
                key: { status: "valid", value: key },
                value: { status: "valid", value: ctx.data[key] }
              });
            }
          } else if (unknownKeys === "strict") {
            if (extraKeys.length > 0) {
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.unrecognized_keys,
                keys: extraKeys
              });
              status.dirty();
            }
          } else if (unknownKeys === "strip") {
          } else {
            throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
          }
        } else {
          const catchall = this._def.catchall;
          for (const key of extraKeys) {
            const value = ctx.data[key];
            pairs.push({
              key: { status: "valid", value: key },
              value: catchall._parse(
                new ParseInputLazyPath2(ctx, value, ctx.path, key)
                //, ctx.child(key), value, getParsedType(value)
              ),
              alwaysSet: key in ctx.data
            });
          }
        }
        if (ctx.common.async) {
          return Promise.resolve().then(async () => {
            const syncPairs = [];
            for (const pair of pairs) {
              const key = await pair.key;
              const value = await pair.value;
              syncPairs.push({
                key,
                value,
                alwaysSet: pair.alwaysSet
              });
            }
            return syncPairs;
          }).then((syncPairs) => {
            return parseUtil_js_1.ParseStatus.mergeObjectSync(status, syncPairs);
          });
        } else {
          return parseUtil_js_1.ParseStatus.mergeObjectSync(status, pairs);
        }
      }
      get shape() {
        return this._def.shape();
      }
      strict(message) {
        errorUtil_js_1.errorUtil.errToObj;
        return new _ZodObject({
          ...this._def,
          unknownKeys: "strict",
          ...message !== void 0 ? {
            errorMap: (issue, ctx) => {
              const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
              if (issue.code === "unrecognized_keys")
                return {
                  message: errorUtil_js_1.errorUtil.errToObj(message).message ?? defaultError
                };
              return {
                message: defaultError
              };
            }
          } : {}
        });
      }
      strip() {
        return new _ZodObject({
          ...this._def,
          unknownKeys: "strip"
        });
      }
      passthrough() {
        return new _ZodObject({
          ...this._def,
          unknownKeys: "passthrough"
        });
      }
      // const AugmentFactory =
      //   <Def extends ZodObjectDef>(def: Def) =>
      //   <Augmentation extends ZodRawShape>(
      //     augmentation: Augmentation
      //   ): ZodObject<
      //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
      //     Def["unknownKeys"],
      //     Def["catchall"]
      //   > => {
      //     return new ZodObject({
      //       ...def,
      //       shape: () => ({
      //         ...def.shape(),
      //         ...augmentation,
      //       }),
      //     }) as any;
      //   };
      extend(augmentation) {
        return new _ZodObject({
          ...this._def,
          shape: () => ({
            ...this._def.shape(),
            ...augmentation
          })
        });
      }
      /**
       * Prior to zod@1.0.12 there was a bug in the
       * inferred type of merged objects. Please
       * upgrade if you are experiencing issues.
       */
      merge(merging) {
        const merged = new _ZodObject({
          unknownKeys: merging._def.unknownKeys,
          catchall: merging._def.catchall,
          shape: () => ({
            ...this._def.shape(),
            ...merging._def.shape()
          }),
          typeName: ZodFirstPartyTypeKind2.ZodObject
        });
        return merged;
      }
      // merge<
      //   Incoming extends AnyZodObject,
      //   Augmentation extends Incoming["shape"],
      //   NewOutput extends {
      //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
      //       ? Augmentation[k]["_output"]
      //       : k extends keyof Output
      //       ? Output[k]
      //       : never;
      //   },
      //   NewInput extends {
      //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
      //       ? Augmentation[k]["_input"]
      //       : k extends keyof Input
      //       ? Input[k]
      //       : never;
      //   }
      // >(
      //   merging: Incoming
      // ): ZodObject<
      //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
      //   Incoming["_def"]["unknownKeys"],
      //   Incoming["_def"]["catchall"],
      //   NewOutput,
      //   NewInput
      // > {
      //   const merged: any = new ZodObject({
      //     unknownKeys: merging._def.unknownKeys,
      //     catchall: merging._def.catchall,
      //     shape: () =>
      //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
      //     typeName: ZodFirstPartyTypeKind.ZodObject,
      //   }) as any;
      //   return merged;
      // }
      setKey(key, schema) {
        return this.augment({ [key]: schema });
      }
      // merge<Incoming extends AnyZodObject>(
      //   merging: Incoming
      // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
      // ZodObject<
      //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
      //   Incoming["_def"]["unknownKeys"],
      //   Incoming["_def"]["catchall"]
      // > {
      //   // const mergedShape = objectUtil.mergeShapes(
      //   //   this._def.shape(),
      //   //   merging._def.shape()
      //   // );
      //   const merged: any = new ZodObject({
      //     unknownKeys: merging._def.unknownKeys,
      //     catchall: merging._def.catchall,
      //     shape: () =>
      //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
      //     typeName: ZodFirstPartyTypeKind.ZodObject,
      //   }) as any;
      //   return merged;
      // }
      catchall(index) {
        return new _ZodObject({
          ...this._def,
          catchall: index
        });
      }
      pick(mask) {
        const shape = {};
        for (const key of util_js_1.util.objectKeys(mask)) {
          if (mask[key] && this.shape[key]) {
            shape[key] = this.shape[key];
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => shape
        });
      }
      omit(mask) {
        const shape = {};
        for (const key of util_js_1.util.objectKeys(this.shape)) {
          if (!mask[key]) {
            shape[key] = this.shape[key];
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => shape
        });
      }
      /**
       * @deprecated
       */
      deepPartial() {
        return deepPartialify2(this);
      }
      partial(mask) {
        const newShape = {};
        for (const key of util_js_1.util.objectKeys(this.shape)) {
          const fieldSchema = this.shape[key];
          if (mask && !mask[key]) {
            newShape[key] = fieldSchema;
          } else {
            newShape[key] = fieldSchema.optional();
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => newShape
        });
      }
      required(mask) {
        const newShape = {};
        for (const key of util_js_1.util.objectKeys(this.shape)) {
          if (mask && !mask[key]) {
            newShape[key] = this.shape[key];
          } else {
            const fieldSchema = this.shape[key];
            let newField = fieldSchema;
            while (newField instanceof ZodOptional2) {
              newField = newField._def.innerType;
            }
            newShape[key] = newField;
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => newShape
        });
      }
      keyof() {
        return createZodEnum2(util_js_1.util.objectKeys(this.shape));
      }
    };
    exports.ZodObject = ZodObject2;
    ZodObject2.create = (shape, params) => {
      return new ZodObject2({
        shape: () => shape,
        unknownKeys: "strip",
        catchall: ZodNever2.create(),
        typeName: ZodFirstPartyTypeKind2.ZodObject,
        ...processCreateParams2(params)
      });
    };
    ZodObject2.strictCreate = (shape, params) => {
      return new ZodObject2({
        shape: () => shape,
        unknownKeys: "strict",
        catchall: ZodNever2.create(),
        typeName: ZodFirstPartyTypeKind2.ZodObject,
        ...processCreateParams2(params)
      });
    };
    ZodObject2.lazycreate = (shape, params) => {
      return new ZodObject2({
        shape,
        unknownKeys: "strip",
        catchall: ZodNever2.create(),
        typeName: ZodFirstPartyTypeKind2.ZodObject,
        ...processCreateParams2(params)
      });
    };
    var ZodUnion2 = class extends ZodType2 {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const options = this._def.options;
        function handleResults(results) {
          for (const result of results) {
            if (result.result.status === "valid") {
              return result.result;
            }
          }
          for (const result of results) {
            if (result.result.status === "dirty") {
              ctx.common.issues.push(...result.ctx.common.issues);
              return result.result;
            }
          }
          const unionErrors = results.map((result) => new ZodError_js_1.ZodError(result.ctx.common.issues));
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_union,
            unionErrors
          });
          return parseUtil_js_1.INVALID;
        }
        if (ctx.common.async) {
          return Promise.all(options.map(async (option) => {
            const childCtx = {
              ...ctx,
              common: {
                ...ctx.common,
                issues: []
              },
              parent: null
            };
            return {
              result: await option._parseAsync({
                data: ctx.data,
                path: ctx.path,
                parent: childCtx
              }),
              ctx: childCtx
            };
          })).then(handleResults);
        } else {
          let dirty = void 0;
          const issues = [];
          for (const option of options) {
            const childCtx = {
              ...ctx,
              common: {
                ...ctx.common,
                issues: []
              },
              parent: null
            };
            const result = option._parseSync({
              data: ctx.data,
              path: ctx.path,
              parent: childCtx
            });
            if (result.status === "valid") {
              return result;
            } else if (result.status === "dirty" && !dirty) {
              dirty = { result, ctx: childCtx };
            }
            if (childCtx.common.issues.length) {
              issues.push(childCtx.common.issues);
            }
          }
          if (dirty) {
            ctx.common.issues.push(...dirty.ctx.common.issues);
            return dirty.result;
          }
          const unionErrors = issues.map((issues2) => new ZodError_js_1.ZodError(issues2));
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_union,
            unionErrors
          });
          return parseUtil_js_1.INVALID;
        }
      }
      get options() {
        return this._def.options;
      }
    };
    exports.ZodUnion = ZodUnion2;
    ZodUnion2.create = (types, params) => {
      return new ZodUnion2({
        options: types,
        typeName: ZodFirstPartyTypeKind2.ZodUnion,
        ...processCreateParams2(params)
      });
    };
    var getDiscriminator2 = (type) => {
      if (type instanceof ZodLazy2) {
        return getDiscriminator2(type.schema);
      } else if (type instanceof ZodEffects2) {
        return getDiscriminator2(type.innerType());
      } else if (type instanceof ZodLiteral2) {
        return [type.value];
      } else if (type instanceof ZodEnum2) {
        return type.options;
      } else if (type instanceof ZodNativeEnum2) {
        return util_js_1.util.objectValues(type.enum);
      } else if (type instanceof ZodDefault2) {
        return getDiscriminator2(type._def.innerType);
      } else if (type instanceof ZodUndefined2) {
        return [void 0];
      } else if (type instanceof ZodNull2) {
        return [null];
      } else if (type instanceof ZodOptional2) {
        return [void 0, ...getDiscriminator2(type.unwrap())];
      } else if (type instanceof ZodNullable2) {
        return [null, ...getDiscriminator2(type.unwrap())];
      } else if (type instanceof ZodBranded2) {
        return getDiscriminator2(type.unwrap());
      } else if (type instanceof ZodReadonly2) {
        return getDiscriminator2(type.unwrap());
      } else if (type instanceof ZodCatch2) {
        return getDiscriminator2(type._def.innerType);
      } else {
        return [];
      }
    };
    var ZodDiscriminatedUnion2 = class _ZodDiscriminatedUnion extends ZodType2 {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.object) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.object,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        const discriminator = this.discriminator;
        const discriminatorValue = ctx.data[discriminator];
        const option = this.optionsMap.get(discriminatorValue);
        if (!option) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_union_discriminator,
            options: Array.from(this.optionsMap.keys()),
            path: [discriminator]
          });
          return parseUtil_js_1.INVALID;
        }
        if (ctx.common.async) {
          return option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
        } else {
          return option._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
        }
      }
      get discriminator() {
        return this._def.discriminator;
      }
      get options() {
        return this._def.options;
      }
      get optionsMap() {
        return this._def.optionsMap;
      }
      /**
       * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
       * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
       * have a different value for each object in the union.
       * @param discriminator the name of the discriminator property
       * @param types an array of object schemas
       * @param params
       */
      static create(discriminator, options, params) {
        const optionsMap = /* @__PURE__ */ new Map();
        for (const type of options) {
          const discriminatorValues = getDiscriminator2(type.shape[discriminator]);
          if (!discriminatorValues.length) {
            throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
          }
          for (const value of discriminatorValues) {
            if (optionsMap.has(value)) {
              throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
            }
            optionsMap.set(value, type);
          }
        }
        return new _ZodDiscriminatedUnion({
          typeName: ZodFirstPartyTypeKind2.ZodDiscriminatedUnion,
          discriminator,
          options,
          optionsMap,
          ...processCreateParams2(params)
        });
      }
    };
    exports.ZodDiscriminatedUnion = ZodDiscriminatedUnion2;
    function mergeValues2(a, b) {
      const aType = (0, util_js_1.getParsedType)(a);
      const bType = (0, util_js_1.getParsedType)(b);
      if (a === b) {
        return { valid: true, data: a };
      } else if (aType === util_js_1.ZodParsedType.object && bType === util_js_1.ZodParsedType.object) {
        const bKeys = util_js_1.util.objectKeys(b);
        const sharedKeys = util_js_1.util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
        const newObj = { ...a, ...b };
        for (const key of sharedKeys) {
          const sharedValue = mergeValues2(a[key], b[key]);
          if (!sharedValue.valid) {
            return { valid: false };
          }
          newObj[key] = sharedValue.data;
        }
        return { valid: true, data: newObj };
      } else if (aType === util_js_1.ZodParsedType.array && bType === util_js_1.ZodParsedType.array) {
        if (a.length !== b.length) {
          return { valid: false };
        }
        const newArray = [];
        for (let index = 0; index < a.length; index++) {
          const itemA = a[index];
          const itemB = b[index];
          const sharedValue = mergeValues2(itemA, itemB);
          if (!sharedValue.valid) {
            return { valid: false };
          }
          newArray.push(sharedValue.data);
        }
        return { valid: true, data: newArray };
      } else if (aType === util_js_1.ZodParsedType.date && bType === util_js_1.ZodParsedType.date && +a === +b) {
        return { valid: true, data: a };
      } else {
        return { valid: false };
      }
    }
    var ZodIntersection2 = class extends ZodType2 {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        const handleParsed = (parsedLeft, parsedRight) => {
          if ((0, parseUtil_js_1.isAborted)(parsedLeft) || (0, parseUtil_js_1.isAborted)(parsedRight)) {
            return parseUtil_js_1.INVALID;
          }
          const merged = mergeValues2(parsedLeft.value, parsedRight.value);
          if (!merged.valid) {
            (0, parseUtil_js_1.addIssueToContext)(ctx, {
              code: ZodError_js_1.ZodIssueCode.invalid_intersection_types
            });
            return parseUtil_js_1.INVALID;
          }
          if ((0, parseUtil_js_1.isDirty)(parsedLeft) || (0, parseUtil_js_1.isDirty)(parsedRight)) {
            status.dirty();
          }
          return { status: status.value, value: merged.data };
        };
        if (ctx.common.async) {
          return Promise.all([
            this._def.left._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            }),
            this._def.right._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            })
          ]).then(([left, right]) => handleParsed(left, right));
        } else {
          return handleParsed(this._def.left._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          }), this._def.right._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          }));
        }
      }
    };
    exports.ZodIntersection = ZodIntersection2;
    ZodIntersection2.create = (left, right, params) => {
      return new ZodIntersection2({
        left,
        right,
        typeName: ZodFirstPartyTypeKind2.ZodIntersection,
        ...processCreateParams2(params)
      });
    };
    var ZodTuple2 = class _ZodTuple extends ZodType2 {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.array) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.array,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        if (ctx.data.length < this._def.items.length) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.too_small,
            minimum: this._def.items.length,
            inclusive: true,
            exact: false,
            type: "array"
          });
          return parseUtil_js_1.INVALID;
        }
        const rest = this._def.rest;
        if (!rest && ctx.data.length > this._def.items.length) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.too_big,
            maximum: this._def.items.length,
            inclusive: true,
            exact: false,
            type: "array"
          });
          status.dirty();
        }
        const items = [...ctx.data].map((item, itemIndex) => {
          const schema = this._def.items[itemIndex] || this._def.rest;
          if (!schema)
            return null;
          return schema._parse(new ParseInputLazyPath2(ctx, item, ctx.path, itemIndex));
        }).filter((x) => !!x);
        if (ctx.common.async) {
          return Promise.all(items).then((results) => {
            return parseUtil_js_1.ParseStatus.mergeArray(status, results);
          });
        } else {
          return parseUtil_js_1.ParseStatus.mergeArray(status, items);
        }
      }
      get items() {
        return this._def.items;
      }
      rest(rest) {
        return new _ZodTuple({
          ...this._def,
          rest
        });
      }
    };
    exports.ZodTuple = ZodTuple2;
    ZodTuple2.create = (schemas, params) => {
      if (!Array.isArray(schemas)) {
        throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
      }
      return new ZodTuple2({
        items: schemas,
        typeName: ZodFirstPartyTypeKind2.ZodTuple,
        rest: null,
        ...processCreateParams2(params)
      });
    };
    var ZodRecord2 = class _ZodRecord extends ZodType2 {
      get keySchema() {
        return this._def.keyType;
      }
      get valueSchema() {
        return this._def.valueType;
      }
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.object) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.object,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        const pairs = [];
        const keyType = this._def.keyType;
        const valueType = this._def.valueType;
        for (const key in ctx.data) {
          pairs.push({
            key: keyType._parse(new ParseInputLazyPath2(ctx, key, ctx.path, key)),
            value: valueType._parse(new ParseInputLazyPath2(ctx, ctx.data[key], ctx.path, key)),
            alwaysSet: key in ctx.data
          });
        }
        if (ctx.common.async) {
          return parseUtil_js_1.ParseStatus.mergeObjectAsync(status, pairs);
        } else {
          return parseUtil_js_1.ParseStatus.mergeObjectSync(status, pairs);
        }
      }
      get element() {
        return this._def.valueType;
      }
      static create(first, second, third) {
        if (second instanceof ZodType2) {
          return new _ZodRecord({
            keyType: first,
            valueType: second,
            typeName: ZodFirstPartyTypeKind2.ZodRecord,
            ...processCreateParams2(third)
          });
        }
        return new _ZodRecord({
          keyType: ZodString2.create(),
          valueType: first,
          typeName: ZodFirstPartyTypeKind2.ZodRecord,
          ...processCreateParams2(second)
        });
      }
    };
    exports.ZodRecord = ZodRecord2;
    var ZodMap2 = class extends ZodType2 {
      get keySchema() {
        return this._def.keyType;
      }
      get valueSchema() {
        return this._def.valueType;
      }
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.map) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.map,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        const keyType = this._def.keyType;
        const valueType = this._def.valueType;
        const pairs = [...ctx.data.entries()].map(([key, value], index) => {
          return {
            key: keyType._parse(new ParseInputLazyPath2(ctx, key, ctx.path, [index, "key"])),
            value: valueType._parse(new ParseInputLazyPath2(ctx, value, ctx.path, [index, "value"]))
          };
        });
        if (ctx.common.async) {
          const finalMap = /* @__PURE__ */ new Map();
          return Promise.resolve().then(async () => {
            for (const pair of pairs) {
              const key = await pair.key;
              const value = await pair.value;
              if (key.status === "aborted" || value.status === "aborted") {
                return parseUtil_js_1.INVALID;
              }
              if (key.status === "dirty" || value.status === "dirty") {
                status.dirty();
              }
              finalMap.set(key.value, value.value);
            }
            return { status: status.value, value: finalMap };
          });
        } else {
          const finalMap = /* @__PURE__ */ new Map();
          for (const pair of pairs) {
            const key = pair.key;
            const value = pair.value;
            if (key.status === "aborted" || value.status === "aborted") {
              return parseUtil_js_1.INVALID;
            }
            if (key.status === "dirty" || value.status === "dirty") {
              status.dirty();
            }
            finalMap.set(key.value, value.value);
          }
          return { status: status.value, value: finalMap };
        }
      }
    };
    exports.ZodMap = ZodMap2;
    ZodMap2.create = (keyType, valueType, params) => {
      return new ZodMap2({
        valueType,
        keyType,
        typeName: ZodFirstPartyTypeKind2.ZodMap,
        ...processCreateParams2(params)
      });
    };
    var ZodSet2 = class _ZodSet extends ZodType2 {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.set) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.set,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        const def = this._def;
        if (def.minSize !== null) {
          if (ctx.data.size < def.minSize.value) {
            (0, parseUtil_js_1.addIssueToContext)(ctx, {
              code: ZodError_js_1.ZodIssueCode.too_small,
              minimum: def.minSize.value,
              type: "set",
              inclusive: true,
              exact: false,
              message: def.minSize.message
            });
            status.dirty();
          }
        }
        if (def.maxSize !== null) {
          if (ctx.data.size > def.maxSize.value) {
            (0, parseUtil_js_1.addIssueToContext)(ctx, {
              code: ZodError_js_1.ZodIssueCode.too_big,
              maximum: def.maxSize.value,
              type: "set",
              inclusive: true,
              exact: false,
              message: def.maxSize.message
            });
            status.dirty();
          }
        }
        const valueType = this._def.valueType;
        function finalizeSet(elements2) {
          const parsedSet = /* @__PURE__ */ new Set();
          for (const element of elements2) {
            if (element.status === "aborted")
              return parseUtil_js_1.INVALID;
            if (element.status === "dirty")
              status.dirty();
            parsedSet.add(element.value);
          }
          return { status: status.value, value: parsedSet };
        }
        const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath2(ctx, item, ctx.path, i)));
        if (ctx.common.async) {
          return Promise.all(elements).then((elements2) => finalizeSet(elements2));
        } else {
          return finalizeSet(elements);
        }
      }
      min(minSize, message) {
        return new _ZodSet({
          ...this._def,
          minSize: { value: minSize, message: errorUtil_js_1.errorUtil.toString(message) }
        });
      }
      max(maxSize, message) {
        return new _ZodSet({
          ...this._def,
          maxSize: { value: maxSize, message: errorUtil_js_1.errorUtil.toString(message) }
        });
      }
      size(size, message) {
        return this.min(size, message).max(size, message);
      }
      nonempty(message) {
        return this.min(1, message);
      }
    };
    exports.ZodSet = ZodSet2;
    ZodSet2.create = (valueType, params) => {
      return new ZodSet2({
        valueType,
        minSize: null,
        maxSize: null,
        typeName: ZodFirstPartyTypeKind2.ZodSet,
        ...processCreateParams2(params)
      });
    };
    var ZodFunction2 = class _ZodFunction extends ZodType2 {
      constructor() {
        super(...arguments);
        this.validate = this.implement;
      }
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.function) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.function,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        function makeArgsIssue(args, error) {
          return (0, parseUtil_js_1.makeIssue)({
            data: args,
            path: ctx.path,
            errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, (0, errors_js_1.getErrorMap)(), errors_js_1.defaultErrorMap].filter((x) => !!x),
            issueData: {
              code: ZodError_js_1.ZodIssueCode.invalid_arguments,
              argumentsError: error
            }
          });
        }
        function makeReturnsIssue(returns, error) {
          return (0, parseUtil_js_1.makeIssue)({
            data: returns,
            path: ctx.path,
            errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, (0, errors_js_1.getErrorMap)(), errors_js_1.defaultErrorMap].filter((x) => !!x),
            issueData: {
              code: ZodError_js_1.ZodIssueCode.invalid_return_type,
              returnTypeError: error
            }
          });
        }
        const params = { errorMap: ctx.common.contextualErrorMap };
        const fn = ctx.data;
        if (this._def.returns instanceof ZodPromise2) {
          const me = this;
          return (0, parseUtil_js_1.OK)(async function(...args) {
            const error = new ZodError_js_1.ZodError([]);
            const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
              error.addIssue(makeArgsIssue(args, e));
              throw error;
            });
            const result = await Reflect.apply(fn, this, parsedArgs);
            const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
              error.addIssue(makeReturnsIssue(result, e));
              throw error;
            });
            return parsedReturns;
          });
        } else {
          const me = this;
          return (0, parseUtil_js_1.OK)(function(...args) {
            const parsedArgs = me._def.args.safeParse(args, params);
            if (!parsedArgs.success) {
              throw new ZodError_js_1.ZodError([makeArgsIssue(args, parsedArgs.error)]);
            }
            const result = Reflect.apply(fn, this, parsedArgs.data);
            const parsedReturns = me._def.returns.safeParse(result, params);
            if (!parsedReturns.success) {
              throw new ZodError_js_1.ZodError([makeReturnsIssue(result, parsedReturns.error)]);
            }
            return parsedReturns.data;
          });
        }
      }
      parameters() {
        return this._def.args;
      }
      returnType() {
        return this._def.returns;
      }
      args(...items) {
        return new _ZodFunction({
          ...this._def,
          args: ZodTuple2.create(items).rest(ZodUnknown2.create())
        });
      }
      returns(returnType) {
        return new _ZodFunction({
          ...this._def,
          returns: returnType
        });
      }
      implement(func) {
        const validatedFunc = this.parse(func);
        return validatedFunc;
      }
      strictImplement(func) {
        const validatedFunc = this.parse(func);
        return validatedFunc;
      }
      static create(args, returns, params) {
        return new _ZodFunction({
          args: args ? args : ZodTuple2.create([]).rest(ZodUnknown2.create()),
          returns: returns || ZodUnknown2.create(),
          typeName: ZodFirstPartyTypeKind2.ZodFunction,
          ...processCreateParams2(params)
        });
      }
    };
    exports.ZodFunction = ZodFunction2;
    var ZodLazy2 = class extends ZodType2 {
      get schema() {
        return this._def.getter();
      }
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const lazySchema = this._def.getter();
        return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
      }
    };
    exports.ZodLazy = ZodLazy2;
    ZodLazy2.create = (getter, params) => {
      return new ZodLazy2({
        getter,
        typeName: ZodFirstPartyTypeKind2.ZodLazy,
        ...processCreateParams2(params)
      });
    };
    var ZodLiteral2 = class extends ZodType2 {
      _parse(input) {
        if (input.data !== this._def.value) {
          const ctx = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            received: ctx.data,
            code: ZodError_js_1.ZodIssueCode.invalid_literal,
            expected: this._def.value
          });
          return parseUtil_js_1.INVALID;
        }
        return { status: "valid", value: input.data };
      }
      get value() {
        return this._def.value;
      }
    };
    exports.ZodLiteral = ZodLiteral2;
    ZodLiteral2.create = (value, params) => {
      return new ZodLiteral2({
        value,
        typeName: ZodFirstPartyTypeKind2.ZodLiteral,
        ...processCreateParams2(params)
      });
    };
    function createZodEnum2(values, params) {
      return new ZodEnum2({
        values,
        typeName: ZodFirstPartyTypeKind2.ZodEnum,
        ...processCreateParams2(params)
      });
    }
    var ZodEnum2 = class _ZodEnum extends ZodType2 {
      _parse(input) {
        if (typeof input.data !== "string") {
          const ctx = this._getOrReturnCtx(input);
          const expectedValues = this._def.values;
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            expected: util_js_1.util.joinValues(expectedValues),
            received: ctx.parsedType,
            code: ZodError_js_1.ZodIssueCode.invalid_type
          });
          return parseUtil_js_1.INVALID;
        }
        if (!this._cache) {
          this._cache = new Set(this._def.values);
        }
        if (!this._cache.has(input.data)) {
          const ctx = this._getOrReturnCtx(input);
          const expectedValues = this._def.values;
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            received: ctx.data,
            code: ZodError_js_1.ZodIssueCode.invalid_enum_value,
            options: expectedValues
          });
          return parseUtil_js_1.INVALID;
        }
        return (0, parseUtil_js_1.OK)(input.data);
      }
      get options() {
        return this._def.values;
      }
      get enum() {
        const enumValues = {};
        for (const val of this._def.values) {
          enumValues[val] = val;
        }
        return enumValues;
      }
      get Values() {
        const enumValues = {};
        for (const val of this._def.values) {
          enumValues[val] = val;
        }
        return enumValues;
      }
      get Enum() {
        const enumValues = {};
        for (const val of this._def.values) {
          enumValues[val] = val;
        }
        return enumValues;
      }
      extract(values, newDef = this._def) {
        return _ZodEnum.create(values, {
          ...this._def,
          ...newDef
        });
      }
      exclude(values, newDef = this._def) {
        return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
          ...this._def,
          ...newDef
        });
      }
    };
    exports.ZodEnum = ZodEnum2;
    ZodEnum2.create = createZodEnum2;
    var ZodNativeEnum2 = class extends ZodType2 {
      _parse(input) {
        const nativeEnumValues = util_js_1.util.getValidEnumValues(this._def.values);
        const ctx = this._getOrReturnCtx(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.string && ctx.parsedType !== util_js_1.ZodParsedType.number) {
          const expectedValues = util_js_1.util.objectValues(nativeEnumValues);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            expected: util_js_1.util.joinValues(expectedValues),
            received: ctx.parsedType,
            code: ZodError_js_1.ZodIssueCode.invalid_type
          });
          return parseUtil_js_1.INVALID;
        }
        if (!this._cache) {
          this._cache = new Set(util_js_1.util.getValidEnumValues(this._def.values));
        }
        if (!this._cache.has(input.data)) {
          const expectedValues = util_js_1.util.objectValues(nativeEnumValues);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            received: ctx.data,
            code: ZodError_js_1.ZodIssueCode.invalid_enum_value,
            options: expectedValues
          });
          return parseUtil_js_1.INVALID;
        }
        return (0, parseUtil_js_1.OK)(input.data);
      }
      get enum() {
        return this._def.values;
      }
    };
    exports.ZodNativeEnum = ZodNativeEnum2;
    ZodNativeEnum2.create = (values, params) => {
      return new ZodNativeEnum2({
        values,
        typeName: ZodFirstPartyTypeKind2.ZodNativeEnum,
        ...processCreateParams2(params)
      });
    };
    var ZodPromise2 = class extends ZodType2 {
      unwrap() {
        return this._def.type;
      }
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.promise && ctx.common.async === false) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.promise,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        const promisified = ctx.parsedType === util_js_1.ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
        return (0, parseUtil_js_1.OK)(promisified.then((data) => {
          return this._def.type.parseAsync(data, {
            path: ctx.path,
            errorMap: ctx.common.contextualErrorMap
          });
        }));
      }
    };
    exports.ZodPromise = ZodPromise2;
    ZodPromise2.create = (schema, params) => {
      return new ZodPromise2({
        type: schema,
        typeName: ZodFirstPartyTypeKind2.ZodPromise,
        ...processCreateParams2(params)
      });
    };
    var ZodEffects2 = class extends ZodType2 {
      innerType() {
        return this._def.schema;
      }
      sourceType() {
        return this._def.schema._def.typeName === ZodFirstPartyTypeKind2.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
      }
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        const effect = this._def.effect || null;
        const checkCtx = {
          addIssue: (arg) => {
            (0, parseUtil_js_1.addIssueToContext)(ctx, arg);
            if (arg.fatal) {
              status.abort();
            } else {
              status.dirty();
            }
          },
          get path() {
            return ctx.path;
          }
        };
        checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
        if (effect.type === "preprocess") {
          const processed = effect.transform(ctx.data, checkCtx);
          if (ctx.common.async) {
            return Promise.resolve(processed).then(async (processed2) => {
              if (status.value === "aborted")
                return parseUtil_js_1.INVALID;
              const result = await this._def.schema._parseAsync({
                data: processed2,
                path: ctx.path,
                parent: ctx
              });
              if (result.status === "aborted")
                return parseUtil_js_1.INVALID;
              if (result.status === "dirty")
                return (0, parseUtil_js_1.DIRTY)(result.value);
              if (status.value === "dirty")
                return (0, parseUtil_js_1.DIRTY)(result.value);
              return result;
            });
          } else {
            if (status.value === "aborted")
              return parseUtil_js_1.INVALID;
            const result = this._def.schema._parseSync({
              data: processed,
              path: ctx.path,
              parent: ctx
            });
            if (result.status === "aborted")
              return parseUtil_js_1.INVALID;
            if (result.status === "dirty")
              return (0, parseUtil_js_1.DIRTY)(result.value);
            if (status.value === "dirty")
              return (0, parseUtil_js_1.DIRTY)(result.value);
            return result;
          }
        }
        if (effect.type === "refinement") {
          const executeRefinement = (acc) => {
            const result = effect.refinement(acc, checkCtx);
            if (ctx.common.async) {
              return Promise.resolve(result);
            }
            if (result instanceof Promise) {
              throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
            }
            return acc;
          };
          if (ctx.common.async === false) {
            const inner = this._def.schema._parseSync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            });
            if (inner.status === "aborted")
              return parseUtil_js_1.INVALID;
            if (inner.status === "dirty")
              status.dirty();
            executeRefinement(inner.value);
            return { status: status.value, value: inner.value };
          } else {
            return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
              if (inner.status === "aborted")
                return parseUtil_js_1.INVALID;
              if (inner.status === "dirty")
                status.dirty();
              return executeRefinement(inner.value).then(() => {
                return { status: status.value, value: inner.value };
              });
            });
          }
        }
        if (effect.type === "transform") {
          if (ctx.common.async === false) {
            const base = this._def.schema._parseSync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            });
            if (!(0, parseUtil_js_1.isValid)(base))
              return parseUtil_js_1.INVALID;
            const result = effect.transform(base.value, checkCtx);
            if (result instanceof Promise) {
              throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
            }
            return { status: status.value, value: result };
          } else {
            return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
              if (!(0, parseUtil_js_1.isValid)(base))
                return parseUtil_js_1.INVALID;
              return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
                status: status.value,
                value: result
              }));
            });
          }
        }
        util_js_1.util.assertNever(effect);
      }
    };
    exports.ZodEffects = ZodEffects2;
    exports.ZodTransformer = ZodEffects2;
    ZodEffects2.create = (schema, effect, params) => {
      return new ZodEffects2({
        schema,
        typeName: ZodFirstPartyTypeKind2.ZodEffects,
        effect,
        ...processCreateParams2(params)
      });
    };
    ZodEffects2.createWithPreprocess = (preprocess, schema, params) => {
      return new ZodEffects2({
        schema,
        effect: { type: "preprocess", transform: preprocess },
        typeName: ZodFirstPartyTypeKind2.ZodEffects,
        ...processCreateParams2(params)
      });
    };
    var ZodOptional2 = class extends ZodType2 {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType === util_js_1.ZodParsedType.undefined) {
          return (0, parseUtil_js_1.OK)(void 0);
        }
        return this._def.innerType._parse(input);
      }
      unwrap() {
        return this._def.innerType;
      }
    };
    exports.ZodOptional = ZodOptional2;
    ZodOptional2.create = (type, params) => {
      return new ZodOptional2({
        innerType: type,
        typeName: ZodFirstPartyTypeKind2.ZodOptional,
        ...processCreateParams2(params)
      });
    };
    var ZodNullable2 = class extends ZodType2 {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType === util_js_1.ZodParsedType.null) {
          return (0, parseUtil_js_1.OK)(null);
        }
        return this._def.innerType._parse(input);
      }
      unwrap() {
        return this._def.innerType;
      }
    };
    exports.ZodNullable = ZodNullable2;
    ZodNullable2.create = (type, params) => {
      return new ZodNullable2({
        innerType: type,
        typeName: ZodFirstPartyTypeKind2.ZodNullable,
        ...processCreateParams2(params)
      });
    };
    var ZodDefault2 = class extends ZodType2 {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        let data = ctx.data;
        if (ctx.parsedType === util_js_1.ZodParsedType.undefined) {
          data = this._def.defaultValue();
        }
        return this._def.innerType._parse({
          data,
          path: ctx.path,
          parent: ctx
        });
      }
      removeDefault() {
        return this._def.innerType;
      }
    };
    exports.ZodDefault = ZodDefault2;
    ZodDefault2.create = (type, params) => {
      return new ZodDefault2({
        innerType: type,
        typeName: ZodFirstPartyTypeKind2.ZodDefault,
        defaultValue: typeof params.default === "function" ? params.default : () => params.default,
        ...processCreateParams2(params)
      });
    };
    var ZodCatch2 = class extends ZodType2 {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const newCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          }
        };
        const result = this._def.innerType._parse({
          data: newCtx.data,
          path: newCtx.path,
          parent: {
            ...newCtx
          }
        });
        if ((0, parseUtil_js_1.isAsync)(result)) {
          return result.then((result2) => {
            return {
              status: "valid",
              value: result2.status === "valid" ? result2.value : this._def.catchValue({
                get error() {
                  return new ZodError_js_1.ZodError(newCtx.common.issues);
                },
                input: newCtx.data
              })
            };
          });
        } else {
          return {
            status: "valid",
            value: result.status === "valid" ? result.value : this._def.catchValue({
              get error() {
                return new ZodError_js_1.ZodError(newCtx.common.issues);
              },
              input: newCtx.data
            })
          };
        }
      }
      removeCatch() {
        return this._def.innerType;
      }
    };
    exports.ZodCatch = ZodCatch2;
    ZodCatch2.create = (type, params) => {
      return new ZodCatch2({
        innerType: type,
        typeName: ZodFirstPartyTypeKind2.ZodCatch,
        catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
        ...processCreateParams2(params)
      });
    };
    var ZodNaN2 = class extends ZodType2 {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.nan) {
          const ctx = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.nan,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        return { status: "valid", value: input.data };
      }
    };
    exports.ZodNaN = ZodNaN2;
    ZodNaN2.create = (params) => {
      return new ZodNaN2({
        typeName: ZodFirstPartyTypeKind2.ZodNaN,
        ...processCreateParams2(params)
      });
    };
    exports.BRAND = Symbol("zod_brand");
    var ZodBranded2 = class extends ZodType2 {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const data = ctx.data;
        return this._def.type._parse({
          data,
          path: ctx.path,
          parent: ctx
        });
      }
      unwrap() {
        return this._def.type;
      }
    };
    exports.ZodBranded = ZodBranded2;
    var ZodPipeline2 = class _ZodPipeline extends ZodType2 {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.common.async) {
          const handleAsync = async () => {
            const inResult = await this._def.in._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            });
            if (inResult.status === "aborted")
              return parseUtil_js_1.INVALID;
            if (inResult.status === "dirty") {
              status.dirty();
              return (0, parseUtil_js_1.DIRTY)(inResult.value);
            } else {
              return this._def.out._parseAsync({
                data: inResult.value,
                path: ctx.path,
                parent: ctx
              });
            }
          };
          return handleAsync();
        } else {
          const inResult = this._def.in._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (inResult.status === "aborted")
            return parseUtil_js_1.INVALID;
          if (inResult.status === "dirty") {
            status.dirty();
            return {
              status: "dirty",
              value: inResult.value
            };
          } else {
            return this._def.out._parseSync({
              data: inResult.value,
              path: ctx.path,
              parent: ctx
            });
          }
        }
      }
      static create(a, b) {
        return new _ZodPipeline({
          in: a,
          out: b,
          typeName: ZodFirstPartyTypeKind2.ZodPipeline
        });
      }
    };
    exports.ZodPipeline = ZodPipeline2;
    var ZodReadonly2 = class extends ZodType2 {
      _parse(input) {
        const result = this._def.innerType._parse(input);
        const freeze = (data) => {
          if ((0, parseUtil_js_1.isValid)(data)) {
            data.value = Object.freeze(data.value);
          }
          return data;
        };
        return (0, parseUtil_js_1.isAsync)(result) ? result.then((data) => freeze(data)) : freeze(result);
      }
      unwrap() {
        return this._def.innerType;
      }
    };
    exports.ZodReadonly = ZodReadonly2;
    ZodReadonly2.create = (type, params) => {
      return new ZodReadonly2({
        innerType: type,
        typeName: ZodFirstPartyTypeKind2.ZodReadonly,
        ...processCreateParams2(params)
      });
    };
    function cleanParams(params, data) {
      const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
      const p2 = typeof p === "string" ? { message: p } : p;
      return p2;
    }
    function custom2(check, _params = {}, fatal) {
      if (check)
        return ZodAny2.create().superRefine((data, ctx) => {
          const r = check(data);
          if (r instanceof Promise) {
            return r.then((r2) => {
              if (!r2) {
                const params = cleanParams(_params, data);
                const _fatal = params.fatal ?? fatal ?? true;
                ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
              }
            });
          }
          if (!r) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
          return;
        });
      return ZodAny2.create();
    }
    exports.late = {
      object: ZodObject2.lazycreate
    };
    var ZodFirstPartyTypeKind2;
    (function(ZodFirstPartyTypeKind3) {
      ZodFirstPartyTypeKind3["ZodString"] = "ZodString";
      ZodFirstPartyTypeKind3["ZodNumber"] = "ZodNumber";
      ZodFirstPartyTypeKind3["ZodNaN"] = "ZodNaN";
      ZodFirstPartyTypeKind3["ZodBigInt"] = "ZodBigInt";
      ZodFirstPartyTypeKind3["ZodBoolean"] = "ZodBoolean";
      ZodFirstPartyTypeKind3["ZodDate"] = "ZodDate";
      ZodFirstPartyTypeKind3["ZodSymbol"] = "ZodSymbol";
      ZodFirstPartyTypeKind3["ZodUndefined"] = "ZodUndefined";
      ZodFirstPartyTypeKind3["ZodNull"] = "ZodNull";
      ZodFirstPartyTypeKind3["ZodAny"] = "ZodAny";
      ZodFirstPartyTypeKind3["ZodUnknown"] = "ZodUnknown";
      ZodFirstPartyTypeKind3["ZodNever"] = "ZodNever";
      ZodFirstPartyTypeKind3["ZodVoid"] = "ZodVoid";
      ZodFirstPartyTypeKind3["ZodArray"] = "ZodArray";
      ZodFirstPartyTypeKind3["ZodObject"] = "ZodObject";
      ZodFirstPartyTypeKind3["ZodUnion"] = "ZodUnion";
      ZodFirstPartyTypeKind3["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
      ZodFirstPartyTypeKind3["ZodIntersection"] = "ZodIntersection";
      ZodFirstPartyTypeKind3["ZodTuple"] = "ZodTuple";
      ZodFirstPartyTypeKind3["ZodRecord"] = "ZodRecord";
      ZodFirstPartyTypeKind3["ZodMap"] = "ZodMap";
      ZodFirstPartyTypeKind3["ZodSet"] = "ZodSet";
      ZodFirstPartyTypeKind3["ZodFunction"] = "ZodFunction";
      ZodFirstPartyTypeKind3["ZodLazy"] = "ZodLazy";
      ZodFirstPartyTypeKind3["ZodLiteral"] = "ZodLiteral";
      ZodFirstPartyTypeKind3["ZodEnum"] = "ZodEnum";
      ZodFirstPartyTypeKind3["ZodEffects"] = "ZodEffects";
      ZodFirstPartyTypeKind3["ZodNativeEnum"] = "ZodNativeEnum";
      ZodFirstPartyTypeKind3["ZodOptional"] = "ZodOptional";
      ZodFirstPartyTypeKind3["ZodNullable"] = "ZodNullable";
      ZodFirstPartyTypeKind3["ZodDefault"] = "ZodDefault";
      ZodFirstPartyTypeKind3["ZodCatch"] = "ZodCatch";
      ZodFirstPartyTypeKind3["ZodPromise"] = "ZodPromise";
      ZodFirstPartyTypeKind3["ZodBranded"] = "ZodBranded";
      ZodFirstPartyTypeKind3["ZodPipeline"] = "ZodPipeline";
      ZodFirstPartyTypeKind3["ZodReadonly"] = "ZodReadonly";
    })(ZodFirstPartyTypeKind2 || (exports.ZodFirstPartyTypeKind = ZodFirstPartyTypeKind2 = {}));
    var instanceOfType2 = (cls, params = {
      message: `Input not instance of ${cls.name}`
    }) => custom2((data) => data instanceof cls, params);
    exports.instanceof = instanceOfType2;
    var stringType2 = ZodString2.create;
    exports.string = stringType2;
    var numberType2 = ZodNumber2.create;
    exports.number = numberType2;
    var nanType2 = ZodNaN2.create;
    exports.nan = nanType2;
    var bigIntType2 = ZodBigInt2.create;
    exports.bigint = bigIntType2;
    var booleanType2 = ZodBoolean2.create;
    exports.boolean = booleanType2;
    var dateType2 = ZodDate2.create;
    exports.date = dateType2;
    var symbolType2 = ZodSymbol2.create;
    exports.symbol = symbolType2;
    var undefinedType2 = ZodUndefined2.create;
    exports.undefined = undefinedType2;
    var nullType2 = ZodNull2.create;
    exports.null = nullType2;
    var anyType2 = ZodAny2.create;
    exports.any = anyType2;
    var unknownType2 = ZodUnknown2.create;
    exports.unknown = unknownType2;
    var neverType2 = ZodNever2.create;
    exports.never = neverType2;
    var voidType2 = ZodVoid2.create;
    exports.void = voidType2;
    var arrayType2 = ZodArray2.create;
    exports.array = arrayType2;
    var objectType2 = ZodObject2.create;
    exports.object = objectType2;
    var strictObjectType2 = ZodObject2.strictCreate;
    exports.strictObject = strictObjectType2;
    var unionType2 = ZodUnion2.create;
    exports.union = unionType2;
    var discriminatedUnionType2 = ZodDiscriminatedUnion2.create;
    exports.discriminatedUnion = discriminatedUnionType2;
    var intersectionType2 = ZodIntersection2.create;
    exports.intersection = intersectionType2;
    var tupleType2 = ZodTuple2.create;
    exports.tuple = tupleType2;
    var recordType2 = ZodRecord2.create;
    exports.record = recordType2;
    var mapType2 = ZodMap2.create;
    exports.map = mapType2;
    var setType2 = ZodSet2.create;
    exports.set = setType2;
    var functionType2 = ZodFunction2.create;
    exports.function = functionType2;
    var lazyType2 = ZodLazy2.create;
    exports.lazy = lazyType2;
    var literalType2 = ZodLiteral2.create;
    exports.literal = literalType2;
    var enumType2 = ZodEnum2.create;
    exports.enum = enumType2;
    var nativeEnumType2 = ZodNativeEnum2.create;
    exports.nativeEnum = nativeEnumType2;
    var promiseType2 = ZodPromise2.create;
    exports.promise = promiseType2;
    var effectsType2 = ZodEffects2.create;
    exports.effect = effectsType2;
    exports.transformer = effectsType2;
    var optionalType2 = ZodOptional2.create;
    exports.optional = optionalType2;
    var nullableType2 = ZodNullable2.create;
    exports.nullable = nullableType2;
    var preprocessType2 = ZodEffects2.createWithPreprocess;
    exports.preprocess = preprocessType2;
    var pipelineType2 = ZodPipeline2.create;
    exports.pipeline = pipelineType2;
    var ostring2 = () => stringType2().optional();
    exports.ostring = ostring2;
    var onumber2 = () => numberType2().optional();
    exports.onumber = onumber2;
    var oboolean2 = () => booleanType2().optional();
    exports.oboolean = oboolean2;
    exports.coerce = {
      string: (arg) => ZodString2.create({ ...arg, coerce: true }),
      number: (arg) => ZodNumber2.create({ ...arg, coerce: true }),
      boolean: (arg) => ZodBoolean2.create({
        ...arg,
        coerce: true
      }),
      bigint: (arg) => ZodBigInt2.create({ ...arg, coerce: true }),
      date: (arg) => ZodDate2.create({ ...arg, coerce: true })
    };
    exports.NEVER = parseUtil_js_1.INVALID;
  }
});

// ../../node_modules/zod/dist/cjs/v3/external.js
var require_external = __commonJS({
  "../../node_modules/zod/dist/cjs/v3/external.js"(exports) {
    "use strict";
    init_esm();
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(require_errors(), exports);
    __exportStar(require_parseUtil(), exports);
    __exportStar(require_typeAliases(), exports);
    __exportStar(require_util(), exports);
    __exportStar(require_types(), exports);
    __exportStar(require_ZodError(), exports);
  }
});

// ../../node_modules/zod/dist/cjs/v3/index.js
var require_v3 = __commonJS({
  "../../node_modules/zod/dist/cjs/v3/index.js"(exports) {
    "use strict";
    init_esm();
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports && exports.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.z = void 0;
    var z2 = __importStar(require_external());
    exports.z = z2;
    __exportStar(require_external(), exports);
    exports.default = z2;
  }
});

// ../../node_modules/zod/dist/cjs/index.js
var require_cjs = __commonJS({
  "../../node_modules/zod/dist/cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var index_js_1 = __importDefault(require_v3());
    __exportStar(require_v3(), exports);
    exports.default = index_js_1.default;
  }
});

// ../../node_modules/zod-validation-error/dist/cjs/utils/joinPath.js
var require_joinPath = __commonJS({
  "../../node_modules/zod-validation-error/dist/cjs/utils/joinPath.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.joinPath = void 0;
    var identifierRegex = /[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*/u;
    function joinPath(path) {
      if (path.length === 1) {
        return path[0].toString();
      }
      return path.reduce((acc, item) => {
        if (typeof item === "number") {
          return acc + "[" + item.toString() + "]";
        }
        if (item.includes('"')) {
          return acc + '["' + escapeQuotes(item) + '"]';
        }
        if (!identifierRegex.test(item)) {
          return acc + '["' + item + '"]';
        }
        const separator = acc.length === 0 ? "" : ".";
        return acc + separator + item;
      }, "");
    }
    exports.joinPath = joinPath;
    function escapeQuotes(str) {
      return str.replace(/"/g, '\\"');
    }
  }
});

// ../../node_modules/zod-validation-error/dist/cjs/utils/NonEmptyArray.js
var require_NonEmptyArray = __commonJS({
  "../../node_modules/zod-validation-error/dist/cjs/utils/NonEmptyArray.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isNonEmptyArray = void 0;
    function isNonEmptyArray(value) {
      return value.length !== 0;
    }
    exports.isNonEmptyArray = isNonEmptyArray;
  }
});

// ../../node_modules/zod-validation-error/dist/cjs/ValidationError.js
var require_ValidationError = __commonJS({
  "../../node_modules/zod-validation-error/dist/cjs/ValidationError.js"(exports) {
    "use strict";
    init_esm();
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports && exports.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.errorMap = exports.isValidationErrorLike = exports.isValidationError = exports.toValidationError = exports.fromZodError = exports.fromZodIssue = exports.ValidationError = void 0;
    var zod = __importStar(require_cjs());
    var joinPath_1 = require_joinPath();
    var NonEmptyArray_1 = require_NonEmptyArray();
    var MAX_ISSUES_IN_MESSAGE = 99;
    var ISSUE_SEPARATOR = "; ";
    var UNION_SEPARATOR = ", or ";
    var PREFIX = "Validation error";
    var PREFIX_SEPARATOR = ": ";
    var ValidationError2 = class extends Error {
      details;
      name;
      constructor(message, details = []) {
        super(message);
        this.details = details;
        this.name = "ZodValidationError";
      }
      toString() {
        return this.message;
      }
    };
    exports.ValidationError = ValidationError2;
    function getMessageFromZodIssue(issue, issueSeparator, unionSeparator) {
      if (issue.code === "invalid_union") {
        return issue.unionErrors.reduce((acc, zodError) => {
          const newIssues = zodError.issues.map((issue2) => getMessageFromZodIssue(issue2, issueSeparator, unionSeparator)).join(issueSeparator);
          if (!acc.includes(newIssues)) {
            acc.push(newIssues);
          }
          return acc;
        }, []).join(unionSeparator);
      }
      if ((0, NonEmptyArray_1.isNonEmptyArray)(issue.path)) {
        if (issue.path.length === 1) {
          const identifier = issue.path[0];
          if (typeof identifier === "number") {
            return `${issue.message} at index ${identifier}`;
          }
        }
        return `${issue.message} at "${(0, joinPath_1.joinPath)(issue.path)}"`;
      }
      return issue.message;
    }
    function conditionallyPrefixMessage(reason, prefix, prefixSeparator) {
      if (prefix !== null) {
        if (reason.length > 0) {
          return [prefix, reason].join(prefixSeparator);
        }
        return prefix;
      }
      if (reason.length > 0) {
        return reason;
      }
      return PREFIX;
    }
    function fromZodIssue(issue, options = {}) {
      const { issueSeparator = ISSUE_SEPARATOR, unionSeparator = UNION_SEPARATOR, prefixSeparator = PREFIX_SEPARATOR, prefix = PREFIX } = options;
      const reason = getMessageFromZodIssue(issue, issueSeparator, unionSeparator);
      const message = conditionallyPrefixMessage(reason, prefix, prefixSeparator);
      return new ValidationError2(message, [issue]);
    }
    exports.fromZodIssue = fromZodIssue;
    function fromZodError2(zodError, options = {}) {
      const { maxIssuesInMessage = MAX_ISSUES_IN_MESSAGE, issueSeparator = ISSUE_SEPARATOR, unionSeparator = UNION_SEPARATOR, prefixSeparator = PREFIX_SEPARATOR, prefix = PREFIX } = options;
      const reason = zodError.errors.slice(0, maxIssuesInMessage).map((issue) => getMessageFromZodIssue(issue, issueSeparator, unionSeparator)).join(issueSeparator);
      const message = conditionallyPrefixMessage(reason, prefix, prefixSeparator);
      return new ValidationError2(message, zodError.errors);
    }
    exports.fromZodError = fromZodError2;
    var toValidationError = (options = {}) => (err) => {
      if (err instanceof zod.ZodError) {
        return fromZodError2(err, options);
      }
      if (err instanceof Error) {
        return err;
      }
      return new Error("Unknown error");
    };
    exports.toValidationError = toValidationError;
    function isValidationError(err) {
      return err instanceof ValidationError2;
    }
    exports.isValidationError = isValidationError;
    function isValidationErrorLike(err) {
      return err instanceof Error && err.name === "ZodValidationError";
    }
    exports.isValidationErrorLike = isValidationErrorLike;
    var errorMap2 = (issue, ctx) => {
      const error = fromZodIssue({
        ...issue,
        message: issue.message ?? ctx.defaultError
      });
      return {
        message: error.message
      };
    };
    exports.errorMap = errorMap2;
  }
});

// ../../node_modules/zod-validation-error/dist/cjs/index.js
var require_cjs2 = __commonJS({
  "../../node_modules/zod-validation-error/dist/cjs/index.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.errorMap = exports.fromZodIssue = exports.fromZodError = exports.isValidationErrorLike = exports.isValidationError = exports.toValidationError = exports.ValidationError = void 0;
    var ValidationError_1 = require_ValidationError();
    Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function() {
      return ValidationError_1.ValidationError;
    } });
    Object.defineProperty(exports, "toValidationError", { enumerable: true, get: function() {
      return ValidationError_1.toValidationError;
    } });
    Object.defineProperty(exports, "isValidationError", { enumerable: true, get: function() {
      return ValidationError_1.isValidationError;
    } });
    Object.defineProperty(exports, "isValidationErrorLike", { enumerable: true, get: function() {
      return ValidationError_1.isValidationErrorLike;
    } });
    Object.defineProperty(exports, "fromZodError", { enumerable: true, get: function() {
      return ValidationError_1.fromZodError;
    } });
    Object.defineProperty(exports, "fromZodIssue", { enumerable: true, get: function() {
      return ValidationError_1.fromZodIssue;
    } });
    Object.defineProperty(exports, "errorMap", { enumerable: true, get: function() {
      return ValidationError_1.errorMap;
    } });
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/platform/node/globalThis.js
var _globalThis2;
var init_globalThis = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/platform/node/globalThis.js"() {
    init_esm();
    _globalThis2 = typeof globalThis === "object" ? globalThis : global;
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/platform/node/index.js
var init_node = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/platform/node/index.js"() {
    init_esm();
    init_globalThis();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/platform/index.js
var init_platform = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/platform/index.js"() {
    init_esm();
    init_node();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/version.js
var VERSION2;
var init_version = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/version.js"() {
    init_esm();
    VERSION2 = "1.9.0";
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/internal/semver.js
function _makeCompatibilityCheck(ownVersion) {
  var acceptedVersions = /* @__PURE__ */ new Set([ownVersion]);
  var rejectedVersions = /* @__PURE__ */ new Set();
  var myVersionMatch = ownVersion.match(re);
  if (!myVersionMatch) {
    return function() {
      return false;
    };
  }
  var ownVersionParsed = {
    major: +myVersionMatch[1],
    minor: +myVersionMatch[2],
    patch: +myVersionMatch[3],
    prerelease: myVersionMatch[4]
  };
  if (ownVersionParsed.prerelease != null) {
    return function isExactmatch(globalVersion) {
      return globalVersion === ownVersion;
    };
  }
  function _reject(v) {
    rejectedVersions.add(v);
    return false;
  }
  function _accept(v) {
    acceptedVersions.add(v);
    return true;
  }
  return function isCompatible2(globalVersion) {
    if (acceptedVersions.has(globalVersion)) {
      return true;
    }
    if (rejectedVersions.has(globalVersion)) {
      return false;
    }
    var globalVersionMatch = globalVersion.match(re);
    if (!globalVersionMatch) {
      return _reject(globalVersion);
    }
    var globalVersionParsed = {
      major: +globalVersionMatch[1],
      minor: +globalVersionMatch[2],
      patch: +globalVersionMatch[3],
      prerelease: globalVersionMatch[4]
    };
    if (globalVersionParsed.prerelease != null) {
      return _reject(globalVersion);
    }
    if (ownVersionParsed.major !== globalVersionParsed.major) {
      return _reject(globalVersion);
    }
    if (ownVersionParsed.major === 0) {
      if (ownVersionParsed.minor === globalVersionParsed.minor && ownVersionParsed.patch <= globalVersionParsed.patch) {
        return _accept(globalVersion);
      }
      return _reject(globalVersion);
    }
    if (ownVersionParsed.minor <= globalVersionParsed.minor) {
      return _accept(globalVersion);
    }
    return _reject(globalVersion);
  };
}
var re, isCompatible;
var init_semver = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/internal/semver.js"() {
    init_esm();
    init_version();
    re = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;
    isCompatible = _makeCompatibilityCheck(VERSION2);
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/internal/global-utils.js
function registerGlobal2(type, instance, diag3, allowOverride) {
  var _a;
  if (allowOverride === void 0) {
    allowOverride = false;
  }
  var api = _global2[GLOBAL_OPENTELEMETRY_API_KEY] = (_a = _global2[GLOBAL_OPENTELEMETRY_API_KEY]) !== null && _a !== void 0 ? _a : {
    version: VERSION2
  };
  if (!allowOverride && api[type]) {
    var err = new Error("@opentelemetry/api: Attempted duplicate registration of API: " + type);
    diag3.error(err.stack || err.message);
    return false;
  }
  if (api.version !== VERSION2) {
    var err = new Error("@opentelemetry/api: Registration of version v" + api.version + " for " + type + " does not match previously registered API v" + VERSION2);
    diag3.error(err.stack || err.message);
    return false;
  }
  api[type] = instance;
  diag3.debug("@opentelemetry/api: Registered a global for " + type + " v" + VERSION2 + ".");
  return true;
}
function getGlobal2(type) {
  var _a, _b;
  var globalVersion = (_a = _global2[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _a === void 0 ? void 0 : _a.version;
  if (!globalVersion || !isCompatible(globalVersion)) {
    return;
  }
  return (_b = _global2[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _b === void 0 ? void 0 : _b[type];
}
function unregisterGlobal2(type, diag3) {
  diag3.debug("@opentelemetry/api: Unregistering a global for " + type + " v" + VERSION2 + ".");
  var api = _global2[GLOBAL_OPENTELEMETRY_API_KEY];
  if (api) {
    delete api[type];
  }
}
var major, GLOBAL_OPENTELEMETRY_API_KEY, _global2;
var init_global_utils = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/internal/global-utils.js"() {
    init_esm();
    init_platform();
    init_version();
    init_semver();
    major = VERSION2.split(".")[0];
    GLOBAL_OPENTELEMETRY_API_KEY = Symbol.for("opentelemetry.js.api." + major);
    _global2 = _globalThis2;
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/diag/ComponentLogger.js
function logProxy(funcName, namespace, args) {
  var logger2 = getGlobal2("diag");
  if (!logger2) {
    return;
  }
  args.unshift(namespace);
  return logger2[funcName].apply(logger2, __spreadArray([], __read(args), false));
}
var __read, __spreadArray, DiagComponentLogger;
var init_ComponentLogger = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/diag/ComponentLogger.js"() {
    init_esm();
    init_global_utils();
    __read = function(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o), r, ar = [], e;
      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      } catch (error) {
        e = { error };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }
      return ar;
    };
    __spreadArray = function(to, from, pack) {
      if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
      return to.concat(ar || Array.prototype.slice.call(from));
    };
    DiagComponentLogger = /** @class */
    function() {
      function DiagComponentLogger2(props) {
        this._namespace = props.namespace || "DiagComponentLogger";
      }
      DiagComponentLogger2.prototype.debug = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("debug", this._namespace, args);
      };
      DiagComponentLogger2.prototype.error = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("error", this._namespace, args);
      };
      DiagComponentLogger2.prototype.info = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("info", this._namespace, args);
      };
      DiagComponentLogger2.prototype.warn = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("warn", this._namespace, args);
      };
      DiagComponentLogger2.prototype.verbose = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("verbose", this._namespace, args);
      };
      return DiagComponentLogger2;
    }();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/diag/types.js
var DiagLogLevel;
var init_types = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/diag/types.js"() {
    init_esm();
    (function(DiagLogLevel2) {
      DiagLogLevel2[DiagLogLevel2["NONE"] = 0] = "NONE";
      DiagLogLevel2[DiagLogLevel2["ERROR"] = 30] = "ERROR";
      DiagLogLevel2[DiagLogLevel2["WARN"] = 50] = "WARN";
      DiagLogLevel2[DiagLogLevel2["INFO"] = 60] = "INFO";
      DiagLogLevel2[DiagLogLevel2["DEBUG"] = 70] = "DEBUG";
      DiagLogLevel2[DiagLogLevel2["VERBOSE"] = 80] = "VERBOSE";
      DiagLogLevel2[DiagLogLevel2["ALL"] = 9999] = "ALL";
    })(DiagLogLevel || (DiagLogLevel = {}));
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/diag/internal/logLevelLogger.js
function createLogLevelDiagLogger(maxLevel, logger2) {
  if (maxLevel < DiagLogLevel.NONE) {
    maxLevel = DiagLogLevel.NONE;
  } else if (maxLevel > DiagLogLevel.ALL) {
    maxLevel = DiagLogLevel.ALL;
  }
  logger2 = logger2 || {};
  function _filterFunc(funcName, theLevel) {
    var theFunc = logger2[funcName];
    if (typeof theFunc === "function" && maxLevel >= theLevel) {
      return theFunc.bind(logger2);
    }
    return function() {
    };
  }
  return {
    error: _filterFunc("error", DiagLogLevel.ERROR),
    warn: _filterFunc("warn", DiagLogLevel.WARN),
    info: _filterFunc("info", DiagLogLevel.INFO),
    debug: _filterFunc("debug", DiagLogLevel.DEBUG),
    verbose: _filterFunc("verbose", DiagLogLevel.VERBOSE)
  };
}
var init_logLevelLogger = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/diag/internal/logLevelLogger.js"() {
    init_esm();
    init_types();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/api/diag.js
var __read2, __spreadArray2, API_NAME2, DiagAPI;
var init_diag = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/api/diag.js"() {
    init_esm();
    init_ComponentLogger();
    init_logLevelLogger();
    init_types();
    init_global_utils();
    __read2 = function(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o), r, ar = [], e;
      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      } catch (error) {
        e = { error };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }
      return ar;
    };
    __spreadArray2 = function(to, from, pack) {
      if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
      return to.concat(ar || Array.prototype.slice.call(from));
    };
    API_NAME2 = "diag";
    DiagAPI = /** @class */
    function() {
      function DiagAPI2() {
        function _logProxy(funcName) {
          return function() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
            }
            var logger2 = getGlobal2("diag");
            if (!logger2)
              return;
            return logger2[funcName].apply(logger2, __spreadArray2([], __read2(args), false));
          };
        }
        var self = this;
        var setLogger = function(logger2, optionsOrLogLevel) {
          var _a, _b, _c;
          if (optionsOrLogLevel === void 0) {
            optionsOrLogLevel = { logLevel: DiagLogLevel.INFO };
          }
          if (logger2 === self) {
            var err = new Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
            self.error((_a = err.stack) !== null && _a !== void 0 ? _a : err.message);
            return false;
          }
          if (typeof optionsOrLogLevel === "number") {
            optionsOrLogLevel = {
              logLevel: optionsOrLogLevel
            };
          }
          var oldLogger = getGlobal2("diag");
          var newLogger = createLogLevelDiagLogger((_b = optionsOrLogLevel.logLevel) !== null && _b !== void 0 ? _b : DiagLogLevel.INFO, logger2);
          if (oldLogger && !optionsOrLogLevel.suppressOverrideMessage) {
            var stack = (_c = new Error().stack) !== null && _c !== void 0 ? _c : "<failed to generate stacktrace>";
            oldLogger.warn("Current logger will be overwritten from " + stack);
            newLogger.warn("Current logger will overwrite one already registered from " + stack);
          }
          return registerGlobal2("diag", newLogger, self, true);
        };
        self.setLogger = setLogger;
        self.disable = function() {
          unregisterGlobal2(API_NAME2, self);
        };
        self.createComponentLogger = function(options) {
          return new DiagComponentLogger(options);
        };
        self.verbose = _logProxy("verbose");
        self.debug = _logProxy("debug");
        self.info = _logProxy("info");
        self.warn = _logProxy("warn");
        self.error = _logProxy("error");
      }
      DiagAPI2.instance = function() {
        if (!this._instance) {
          this._instance = new DiagAPI2();
        }
        return this._instance;
      };
      return DiagAPI2;
    }();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/baggage/internal/baggage-impl.js
var __read3, __values, BaggageImpl;
var init_baggage_impl = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/baggage/internal/baggage-impl.js"() {
    init_esm();
    __read3 = function(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o), r, ar = [], e;
      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      } catch (error) {
        e = { error };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }
      return ar;
    };
    __values = function(o) {
      var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
      if (m) return m.call(o);
      if (o && typeof o.length === "number") return {
        next: function() {
          if (o && i >= o.length) o = void 0;
          return { value: o && o[i++], done: !o };
        }
      };
      throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    };
    BaggageImpl = /** @class */
    function() {
      function BaggageImpl2(entries) {
        this._entries = entries ? new Map(entries) : /* @__PURE__ */ new Map();
      }
      BaggageImpl2.prototype.getEntry = function(key) {
        var entry = this._entries.get(key);
        if (!entry) {
          return void 0;
        }
        return Object.assign({}, entry);
      };
      BaggageImpl2.prototype.getAllEntries = function() {
        return Array.from(this._entries.entries()).map(function(_a) {
          var _b = __read3(_a, 2), k = _b[0], v = _b[1];
          return [k, v];
        });
      };
      BaggageImpl2.prototype.setEntry = function(key, entry) {
        var newBaggage = new BaggageImpl2(this._entries);
        newBaggage._entries.set(key, entry);
        return newBaggage;
      };
      BaggageImpl2.prototype.removeEntry = function(key) {
        var newBaggage = new BaggageImpl2(this._entries);
        newBaggage._entries.delete(key);
        return newBaggage;
      };
      BaggageImpl2.prototype.removeEntries = function() {
        var e_1, _a;
        var keys = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          keys[_i] = arguments[_i];
        }
        var newBaggage = new BaggageImpl2(this._entries);
        try {
          for (var keys_1 = __values(keys), keys_1_1 = keys_1.next(); !keys_1_1.done; keys_1_1 = keys_1.next()) {
            var key = keys_1_1.value;
            newBaggage._entries.delete(key);
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (keys_1_1 && !keys_1_1.done && (_a = keys_1.return)) _a.call(keys_1);
          } finally {
            if (e_1) throw e_1.error;
          }
        }
        return newBaggage;
      };
      BaggageImpl2.prototype.clear = function() {
        return new BaggageImpl2();
      };
      return BaggageImpl2;
    }();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/baggage/internal/symbol.js
var baggageEntryMetadataSymbol;
var init_symbol = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/baggage/internal/symbol.js"() {
    init_esm();
    baggageEntryMetadataSymbol = Symbol("BaggageEntryMetadata");
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/baggage/utils.js
function createBaggage(entries) {
  if (entries === void 0) {
    entries = {};
  }
  return new BaggageImpl(new Map(Object.entries(entries)));
}
function baggageEntryMetadataFromString(str) {
  if (typeof str !== "string") {
    diag.error("Cannot create baggage metadata from unknown type: " + typeof str);
    str = "";
  }
  return {
    __TYPE__: baggageEntryMetadataSymbol,
    toString: function() {
      return str;
    }
  };
}
var diag;
var init_utils = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/baggage/utils.js"() {
    init_esm();
    init_diag();
    init_baggage_impl();
    init_symbol();
    diag = DiagAPI.instance();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/context/context.js
function createContextKey(description) {
  return Symbol.for(description);
}
var BaseContext, ROOT_CONTEXT;
var init_context = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/context/context.js"() {
    init_esm();
    BaseContext = /** @class */
    /* @__PURE__ */ function() {
      function BaseContext2(parentContext) {
        var self = this;
        self._currentContext = parentContext ? new Map(parentContext) : /* @__PURE__ */ new Map();
        self.getValue = function(key) {
          return self._currentContext.get(key);
        };
        self.setValue = function(key, value) {
          var context2 = new BaseContext2(self._currentContext);
          context2._currentContext.set(key, value);
          return context2;
        };
        self.deleteValue = function(key) {
          var context2 = new BaseContext2(self._currentContext);
          context2._currentContext.delete(key);
          return context2;
        };
      }
      return BaseContext2;
    }();
    ROOT_CONTEXT = new BaseContext();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/diag/consoleLogger.js
var consoleMap, DiagConsoleLogger;
var init_consoleLogger = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/diag/consoleLogger.js"() {
    init_esm();
    consoleMap = [
      { n: "error", c: "error" },
      { n: "warn", c: "warn" },
      { n: "info", c: "info" },
      { n: "debug", c: "debug" },
      { n: "verbose", c: "trace" }
    ];
    DiagConsoleLogger = /** @class */
    /* @__PURE__ */ function() {
      function DiagConsoleLogger2() {
        function _consoleFunc(funcName) {
          return function() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
            }
            if (console) {
              var theFunc = console[funcName];
              if (typeof theFunc !== "function") {
                theFunc = console.log;
              }
              if (typeof theFunc === "function") {
                return theFunc.apply(console, args);
              }
            }
          };
        }
        for (var i = 0; i < consoleMap.length; i++) {
          this[consoleMap[i].n] = _consoleFunc(consoleMap[i].c);
        }
      }
      return DiagConsoleLogger2;
    }();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/metrics/NoopMeter.js
function createNoopMeter() {
  return NOOP_METER;
}
var __extends, NoopMeter, NoopMetric, NoopCounterMetric, NoopUpDownCounterMetric, NoopGaugeMetric, NoopHistogramMetric, NoopObservableMetric, NoopObservableCounterMetric, NoopObservableGaugeMetric, NoopObservableUpDownCounterMetric, NOOP_METER, NOOP_COUNTER_METRIC, NOOP_GAUGE_METRIC, NOOP_HISTOGRAM_METRIC, NOOP_UP_DOWN_COUNTER_METRIC, NOOP_OBSERVABLE_COUNTER_METRIC, NOOP_OBSERVABLE_GAUGE_METRIC, NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
var init_NoopMeter = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/metrics/NoopMeter.js"() {
    init_esm();
    __extends = /* @__PURE__ */ function() {
      var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
          d2.__proto__ = b2;
        } || function(d2, b2) {
          for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
        };
        return extendStatics(d, b);
      };
      return function(d, b) {
        if (typeof b !== "function" && b !== null)
          throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    }();
    NoopMeter = /** @class */
    function() {
      function NoopMeter2() {
      }
      NoopMeter2.prototype.createGauge = function(_name, _options) {
        return NOOP_GAUGE_METRIC;
      };
      NoopMeter2.prototype.createHistogram = function(_name, _options) {
        return NOOP_HISTOGRAM_METRIC;
      };
      NoopMeter2.prototype.createCounter = function(_name, _options) {
        return NOOP_COUNTER_METRIC;
      };
      NoopMeter2.prototype.createUpDownCounter = function(_name, _options) {
        return NOOP_UP_DOWN_COUNTER_METRIC;
      };
      NoopMeter2.prototype.createObservableGauge = function(_name, _options) {
        return NOOP_OBSERVABLE_GAUGE_METRIC;
      };
      NoopMeter2.prototype.createObservableCounter = function(_name, _options) {
        return NOOP_OBSERVABLE_COUNTER_METRIC;
      };
      NoopMeter2.prototype.createObservableUpDownCounter = function(_name, _options) {
        return NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
      };
      NoopMeter2.prototype.addBatchObservableCallback = function(_callback, _observables) {
      };
      NoopMeter2.prototype.removeBatchObservableCallback = function(_callback) {
      };
      return NoopMeter2;
    }();
    NoopMetric = /** @class */
    /* @__PURE__ */ function() {
      function NoopMetric2() {
      }
      return NoopMetric2;
    }();
    NoopCounterMetric = /** @class */
    function(_super) {
      __extends(NoopCounterMetric2, _super);
      function NoopCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopCounterMetric2.prototype.add = function(_value, _attributes) {
      };
      return NoopCounterMetric2;
    }(NoopMetric);
    NoopUpDownCounterMetric = /** @class */
    function(_super) {
      __extends(NoopUpDownCounterMetric2, _super);
      function NoopUpDownCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopUpDownCounterMetric2.prototype.add = function(_value, _attributes) {
      };
      return NoopUpDownCounterMetric2;
    }(NoopMetric);
    NoopGaugeMetric = /** @class */
    function(_super) {
      __extends(NoopGaugeMetric2, _super);
      function NoopGaugeMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopGaugeMetric2.prototype.record = function(_value, _attributes) {
      };
      return NoopGaugeMetric2;
    }(NoopMetric);
    NoopHistogramMetric = /** @class */
    function(_super) {
      __extends(NoopHistogramMetric2, _super);
      function NoopHistogramMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopHistogramMetric2.prototype.record = function(_value, _attributes) {
      };
      return NoopHistogramMetric2;
    }(NoopMetric);
    NoopObservableMetric = /** @class */
    function() {
      function NoopObservableMetric2() {
      }
      NoopObservableMetric2.prototype.addCallback = function(_callback) {
      };
      NoopObservableMetric2.prototype.removeCallback = function(_callback) {
      };
      return NoopObservableMetric2;
    }();
    NoopObservableCounterMetric = /** @class */
    function(_super) {
      __extends(NoopObservableCounterMetric2, _super);
      function NoopObservableCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      return NoopObservableCounterMetric2;
    }(NoopObservableMetric);
    NoopObservableGaugeMetric = /** @class */
    function(_super) {
      __extends(NoopObservableGaugeMetric2, _super);
      function NoopObservableGaugeMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      return NoopObservableGaugeMetric2;
    }(NoopObservableMetric);
    NoopObservableUpDownCounterMetric = /** @class */
    function(_super) {
      __extends(NoopObservableUpDownCounterMetric2, _super);
      function NoopObservableUpDownCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      return NoopObservableUpDownCounterMetric2;
    }(NoopObservableMetric);
    NOOP_METER = new NoopMeter();
    NOOP_COUNTER_METRIC = new NoopCounterMetric();
    NOOP_GAUGE_METRIC = new NoopGaugeMetric();
    NOOP_HISTOGRAM_METRIC = new NoopHistogramMetric();
    NOOP_UP_DOWN_COUNTER_METRIC = new NoopUpDownCounterMetric();
    NOOP_OBSERVABLE_COUNTER_METRIC = new NoopObservableCounterMetric();
    NOOP_OBSERVABLE_GAUGE_METRIC = new NoopObservableGaugeMetric();
    NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC = new NoopObservableUpDownCounterMetric();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/metrics/Metric.js
var ValueType;
var init_Metric = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/metrics/Metric.js"() {
    init_esm();
    (function(ValueType2) {
      ValueType2[ValueType2["INT"] = 0] = "INT";
      ValueType2[ValueType2["DOUBLE"] = 1] = "DOUBLE";
    })(ValueType || (ValueType = {}));
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/propagation/TextMapPropagator.js
var defaultTextMapGetter, defaultTextMapSetter;
var init_TextMapPropagator = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/propagation/TextMapPropagator.js"() {
    init_esm();
    defaultTextMapGetter = {
      get: function(carrier, key) {
        if (carrier == null) {
          return void 0;
        }
        return carrier[key];
      },
      keys: function(carrier) {
        if (carrier == null) {
          return [];
        }
        return Object.keys(carrier);
      }
    };
    defaultTextMapSetter = {
      set: function(carrier, key, value) {
        if (carrier == null) {
          return;
        }
        carrier[key] = value;
      }
    };
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/context/NoopContextManager.js
var __read4, __spreadArray3, NoopContextManager;
var init_NoopContextManager = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/context/NoopContextManager.js"() {
    init_esm();
    init_context();
    __read4 = function(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o), r, ar = [], e;
      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      } catch (error) {
        e = { error };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }
      return ar;
    };
    __spreadArray3 = function(to, from, pack) {
      if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
      return to.concat(ar || Array.prototype.slice.call(from));
    };
    NoopContextManager = /** @class */
    function() {
      function NoopContextManager2() {
      }
      NoopContextManager2.prototype.active = function() {
        return ROOT_CONTEXT;
      };
      NoopContextManager2.prototype.with = function(_context, fn, thisArg) {
        var args = [];
        for (var _i = 3; _i < arguments.length; _i++) {
          args[_i - 3] = arguments[_i];
        }
        return fn.call.apply(fn, __spreadArray3([thisArg], __read4(args), false));
      };
      NoopContextManager2.prototype.bind = function(_context, target) {
        return target;
      };
      NoopContextManager2.prototype.enable = function() {
        return this;
      };
      NoopContextManager2.prototype.disable = function() {
        return this;
      };
      return NoopContextManager2;
    }();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/api/context.js
var __read5, __spreadArray4, API_NAME3, NOOP_CONTEXT_MANAGER, ContextAPI;
var init_context2 = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/api/context.js"() {
    init_esm();
    init_NoopContextManager();
    init_global_utils();
    init_diag();
    __read5 = function(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o), r, ar = [], e;
      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      } catch (error) {
        e = { error };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }
      return ar;
    };
    __spreadArray4 = function(to, from, pack) {
      if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
      return to.concat(ar || Array.prototype.slice.call(from));
    };
    API_NAME3 = "context";
    NOOP_CONTEXT_MANAGER = new NoopContextManager();
    ContextAPI = /** @class */
    function() {
      function ContextAPI2() {
      }
      ContextAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new ContextAPI2();
        }
        return this._instance;
      };
      ContextAPI2.prototype.setGlobalContextManager = function(contextManager) {
        return registerGlobal2(API_NAME3, contextManager, DiagAPI.instance());
      };
      ContextAPI2.prototype.active = function() {
        return this._getContextManager().active();
      };
      ContextAPI2.prototype.with = function(context2, fn, thisArg) {
        var _a;
        var args = [];
        for (var _i = 3; _i < arguments.length; _i++) {
          args[_i - 3] = arguments[_i];
        }
        return (_a = this._getContextManager()).with.apply(_a, __spreadArray4([context2, fn, thisArg], __read5(args), false));
      };
      ContextAPI2.prototype.bind = function(context2, target) {
        return this._getContextManager().bind(context2, target);
      };
      ContextAPI2.prototype._getContextManager = function() {
        return getGlobal2(API_NAME3) || NOOP_CONTEXT_MANAGER;
      };
      ContextAPI2.prototype.disable = function() {
        this._getContextManager().disable();
        unregisterGlobal2(API_NAME3, DiagAPI.instance());
      };
      return ContextAPI2;
    }();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/trace/trace_flags.js
var TraceFlags;
var init_trace_flags = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/trace/trace_flags.js"() {
    init_esm();
    (function(TraceFlags2) {
      TraceFlags2[TraceFlags2["NONE"] = 0] = "NONE";
      TraceFlags2[TraceFlags2["SAMPLED"] = 1] = "SAMPLED";
    })(TraceFlags || (TraceFlags = {}));
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/trace/invalid-span-constants.js
var INVALID_SPANID, INVALID_TRACEID, INVALID_SPAN_CONTEXT;
var init_invalid_span_constants = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/trace/invalid-span-constants.js"() {
    init_esm();
    init_trace_flags();
    INVALID_SPANID = "0000000000000000";
    INVALID_TRACEID = "00000000000000000000000000000000";
    INVALID_SPAN_CONTEXT = {
      traceId: INVALID_TRACEID,
      spanId: INVALID_SPANID,
      traceFlags: TraceFlags.NONE
    };
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/trace/NonRecordingSpan.js
var NonRecordingSpan;
var init_NonRecordingSpan = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/trace/NonRecordingSpan.js"() {
    init_esm();
    init_invalid_span_constants();
    NonRecordingSpan = /** @class */
    function() {
      function NonRecordingSpan2(_spanContext) {
        if (_spanContext === void 0) {
          _spanContext = INVALID_SPAN_CONTEXT;
        }
        this._spanContext = _spanContext;
      }
      NonRecordingSpan2.prototype.spanContext = function() {
        return this._spanContext;
      };
      NonRecordingSpan2.prototype.setAttribute = function(_key, _value) {
        return this;
      };
      NonRecordingSpan2.prototype.setAttributes = function(_attributes) {
        return this;
      };
      NonRecordingSpan2.prototype.addEvent = function(_name, _attributes) {
        return this;
      };
      NonRecordingSpan2.prototype.addLink = function(_link) {
        return this;
      };
      NonRecordingSpan2.prototype.addLinks = function(_links) {
        return this;
      };
      NonRecordingSpan2.prototype.setStatus = function(_status) {
        return this;
      };
      NonRecordingSpan2.prototype.updateName = function(_name) {
        return this;
      };
      NonRecordingSpan2.prototype.end = function(_endTime) {
      };
      NonRecordingSpan2.prototype.isRecording = function() {
        return false;
      };
      NonRecordingSpan2.prototype.recordException = function(_exception, _time) {
      };
      return NonRecordingSpan2;
    }();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/trace/context-utils.js
function getSpan(context2) {
  return context2.getValue(SPAN_KEY) || void 0;
}
function getActiveSpan() {
  return getSpan(ContextAPI.getInstance().active());
}
function setSpan(context2, span) {
  return context2.setValue(SPAN_KEY, span);
}
function deleteSpan(context2) {
  return context2.deleteValue(SPAN_KEY);
}
function setSpanContext(context2, spanContext) {
  return setSpan(context2, new NonRecordingSpan(spanContext));
}
function getSpanContext(context2) {
  var _a;
  return (_a = getSpan(context2)) === null || _a === void 0 ? void 0 : _a.spanContext();
}
var SPAN_KEY;
var init_context_utils = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/trace/context-utils.js"() {
    init_esm();
    init_context();
    init_NonRecordingSpan();
    init_context2();
    SPAN_KEY = createContextKey("OpenTelemetry Context Key SPAN");
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/trace/spancontext-utils.js
function isValidTraceId(traceId) {
  return VALID_TRACEID_REGEX.test(traceId) && traceId !== INVALID_TRACEID;
}
function isValidSpanId(spanId) {
  return VALID_SPANID_REGEX.test(spanId) && spanId !== INVALID_SPANID;
}
function isSpanContextValid(spanContext) {
  return isValidTraceId(spanContext.traceId) && isValidSpanId(spanContext.spanId);
}
function wrapSpanContext(spanContext) {
  return new NonRecordingSpan(spanContext);
}
var VALID_TRACEID_REGEX, VALID_SPANID_REGEX;
var init_spancontext_utils = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/trace/spancontext-utils.js"() {
    init_esm();
    init_invalid_span_constants();
    init_NonRecordingSpan();
    VALID_TRACEID_REGEX = /^([0-9a-f]{32})$/i;
    VALID_SPANID_REGEX = /^[0-9a-f]{16}$/i;
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/trace/NoopTracer.js
function isSpanContext(spanContext) {
  return typeof spanContext === "object" && typeof spanContext["spanId"] === "string" && typeof spanContext["traceId"] === "string" && typeof spanContext["traceFlags"] === "number";
}
var contextApi, NoopTracer;
var init_NoopTracer = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/trace/NoopTracer.js"() {
    init_esm();
    init_context2();
    init_context_utils();
    init_NonRecordingSpan();
    init_spancontext_utils();
    contextApi = ContextAPI.getInstance();
    NoopTracer = /** @class */
    function() {
      function NoopTracer2() {
      }
      NoopTracer2.prototype.startSpan = function(name, options, context2) {
        if (context2 === void 0) {
          context2 = contextApi.active();
        }
        var root = Boolean(options === null || options === void 0 ? void 0 : options.root);
        if (root) {
          return new NonRecordingSpan();
        }
        var parentFromContext = context2 && getSpanContext(context2);
        if (isSpanContext(parentFromContext) && isSpanContextValid(parentFromContext)) {
          return new NonRecordingSpan(parentFromContext);
        } else {
          return new NonRecordingSpan();
        }
      };
      NoopTracer2.prototype.startActiveSpan = function(name, arg2, arg3, arg4) {
        var opts;
        var ctx;
        var fn;
        if (arguments.length < 2) {
          return;
        } else if (arguments.length === 2) {
          fn = arg2;
        } else if (arguments.length === 3) {
          opts = arg2;
          fn = arg3;
        } else {
          opts = arg2;
          ctx = arg3;
          fn = arg4;
        }
        var parentContext = ctx !== null && ctx !== void 0 ? ctx : contextApi.active();
        var span = this.startSpan(name, opts, parentContext);
        var contextWithSpanSet = setSpan(parentContext, span);
        return contextApi.with(contextWithSpanSet, fn, void 0, span);
      };
      return NoopTracer2;
    }();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/trace/ProxyTracer.js
var NOOP_TRACER, ProxyTracer;
var init_ProxyTracer = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/trace/ProxyTracer.js"() {
    init_esm();
    init_NoopTracer();
    NOOP_TRACER = new NoopTracer();
    ProxyTracer = /** @class */
    function() {
      function ProxyTracer2(_provider, name, version, options) {
        this._provider = _provider;
        this.name = name;
        this.version = version;
        this.options = options;
      }
      ProxyTracer2.prototype.startSpan = function(name, options, context2) {
        return this._getTracer().startSpan(name, options, context2);
      };
      ProxyTracer2.prototype.startActiveSpan = function(_name, _options, _context, _fn) {
        var tracer = this._getTracer();
        return Reflect.apply(tracer.startActiveSpan, tracer, arguments);
      };
      ProxyTracer2.prototype._getTracer = function() {
        if (this._delegate) {
          return this._delegate;
        }
        var tracer = this._provider.getDelegateTracer(this.name, this.version, this.options);
        if (!tracer) {
          return NOOP_TRACER;
        }
        this._delegate = tracer;
        return this._delegate;
      };
      return ProxyTracer2;
    }();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/trace/NoopTracerProvider.js
var NoopTracerProvider;
var init_NoopTracerProvider = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/trace/NoopTracerProvider.js"() {
    init_esm();
    init_NoopTracer();
    NoopTracerProvider = /** @class */
    function() {
      function NoopTracerProvider2() {
      }
      NoopTracerProvider2.prototype.getTracer = function(_name, _version, _options) {
        return new NoopTracer();
      };
      return NoopTracerProvider2;
    }();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/trace/ProxyTracerProvider.js
var NOOP_TRACER_PROVIDER, ProxyTracerProvider;
var init_ProxyTracerProvider = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/trace/ProxyTracerProvider.js"() {
    init_esm();
    init_ProxyTracer();
    init_NoopTracerProvider();
    NOOP_TRACER_PROVIDER = new NoopTracerProvider();
    ProxyTracerProvider = /** @class */
    function() {
      function ProxyTracerProvider2() {
      }
      ProxyTracerProvider2.prototype.getTracer = function(name, version, options) {
        var _a;
        return (_a = this.getDelegateTracer(name, version, options)) !== null && _a !== void 0 ? _a : new ProxyTracer(this, name, version, options);
      };
      ProxyTracerProvider2.prototype.getDelegate = function() {
        var _a;
        return (_a = this._delegate) !== null && _a !== void 0 ? _a : NOOP_TRACER_PROVIDER;
      };
      ProxyTracerProvider2.prototype.setDelegate = function(delegate) {
        this._delegate = delegate;
      };
      ProxyTracerProvider2.prototype.getDelegateTracer = function(name, version, options) {
        var _a;
        return (_a = this._delegate) === null || _a === void 0 ? void 0 : _a.getTracer(name, version, options);
      };
      return ProxyTracerProvider2;
    }();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/trace/SamplingResult.js
var SamplingDecision;
var init_SamplingResult = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/trace/SamplingResult.js"() {
    init_esm();
    (function(SamplingDecision2) {
      SamplingDecision2[SamplingDecision2["NOT_RECORD"] = 0] = "NOT_RECORD";
      SamplingDecision2[SamplingDecision2["RECORD"] = 1] = "RECORD";
      SamplingDecision2[SamplingDecision2["RECORD_AND_SAMPLED"] = 2] = "RECORD_AND_SAMPLED";
    })(SamplingDecision || (SamplingDecision = {}));
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/trace/span_kind.js
var SpanKind;
var init_span_kind = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/trace/span_kind.js"() {
    init_esm();
    (function(SpanKind2) {
      SpanKind2[SpanKind2["INTERNAL"] = 0] = "INTERNAL";
      SpanKind2[SpanKind2["SERVER"] = 1] = "SERVER";
      SpanKind2[SpanKind2["CLIENT"] = 2] = "CLIENT";
      SpanKind2[SpanKind2["PRODUCER"] = 3] = "PRODUCER";
      SpanKind2[SpanKind2["CONSUMER"] = 4] = "CONSUMER";
    })(SpanKind || (SpanKind = {}));
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/trace/status.js
var SpanStatusCode;
var init_status = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/trace/status.js"() {
    init_esm();
    (function(SpanStatusCode2) {
      SpanStatusCode2[SpanStatusCode2["UNSET"] = 0] = "UNSET";
      SpanStatusCode2[SpanStatusCode2["OK"] = 1] = "OK";
      SpanStatusCode2[SpanStatusCode2["ERROR"] = 2] = "ERROR";
    })(SpanStatusCode || (SpanStatusCode = {}));
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-validators.js
function validateKey(key) {
  return VALID_KEY_REGEX.test(key);
}
function validateValue(value) {
  return VALID_VALUE_BASE_REGEX.test(value) && !INVALID_VALUE_COMMA_EQUAL_REGEX.test(value);
}
var VALID_KEY_CHAR_RANGE, VALID_KEY, VALID_VENDOR_KEY, VALID_KEY_REGEX, VALID_VALUE_BASE_REGEX, INVALID_VALUE_COMMA_EQUAL_REGEX;
var init_tracestate_validators = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-validators.js"() {
    init_esm();
    VALID_KEY_CHAR_RANGE = "[_0-9a-z-*/]";
    VALID_KEY = "[a-z]" + VALID_KEY_CHAR_RANGE + "{0,255}";
    VALID_VENDOR_KEY = "[a-z0-9]" + VALID_KEY_CHAR_RANGE + "{0,240}@[a-z]" + VALID_KEY_CHAR_RANGE + "{0,13}";
    VALID_KEY_REGEX = new RegExp("^(?:" + VALID_KEY + "|" + VALID_VENDOR_KEY + ")$");
    VALID_VALUE_BASE_REGEX = /^[ -~]{0,255}[!-~]$/;
    INVALID_VALUE_COMMA_EQUAL_REGEX = /,|=/;
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-impl.js
var MAX_TRACE_STATE_ITEMS, MAX_TRACE_STATE_LEN, LIST_MEMBERS_SEPARATOR, LIST_MEMBER_KEY_VALUE_SPLITTER, TraceStateImpl;
var init_tracestate_impl = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-impl.js"() {
    init_esm();
    init_tracestate_validators();
    MAX_TRACE_STATE_ITEMS = 32;
    MAX_TRACE_STATE_LEN = 512;
    LIST_MEMBERS_SEPARATOR = ",";
    LIST_MEMBER_KEY_VALUE_SPLITTER = "=";
    TraceStateImpl = /** @class */
    function() {
      function TraceStateImpl2(rawTraceState) {
        this._internalState = /* @__PURE__ */ new Map();
        if (rawTraceState)
          this._parse(rawTraceState);
      }
      TraceStateImpl2.prototype.set = function(key, value) {
        var traceState = this._clone();
        if (traceState._internalState.has(key)) {
          traceState._internalState.delete(key);
        }
        traceState._internalState.set(key, value);
        return traceState;
      };
      TraceStateImpl2.prototype.unset = function(key) {
        var traceState = this._clone();
        traceState._internalState.delete(key);
        return traceState;
      };
      TraceStateImpl2.prototype.get = function(key) {
        return this._internalState.get(key);
      };
      TraceStateImpl2.prototype.serialize = function() {
        var _this = this;
        return this._keys().reduce(function(agg, key) {
          agg.push(key + LIST_MEMBER_KEY_VALUE_SPLITTER + _this.get(key));
          return agg;
        }, []).join(LIST_MEMBERS_SEPARATOR);
      };
      TraceStateImpl2.prototype._parse = function(rawTraceState) {
        if (rawTraceState.length > MAX_TRACE_STATE_LEN)
          return;
        this._internalState = rawTraceState.split(LIST_MEMBERS_SEPARATOR).reverse().reduce(function(agg, part) {
          var listMember = part.trim();
          var i = listMember.indexOf(LIST_MEMBER_KEY_VALUE_SPLITTER);
          if (i !== -1) {
            var key = listMember.slice(0, i);
            var value = listMember.slice(i + 1, part.length);
            if (validateKey(key) && validateValue(value)) {
              agg.set(key, value);
            } else {
            }
          }
          return agg;
        }, /* @__PURE__ */ new Map());
        if (this._internalState.size > MAX_TRACE_STATE_ITEMS) {
          this._internalState = new Map(Array.from(this._internalState.entries()).reverse().slice(0, MAX_TRACE_STATE_ITEMS));
        }
      };
      TraceStateImpl2.prototype._keys = function() {
        return Array.from(this._internalState.keys()).reverse();
      };
      TraceStateImpl2.prototype._clone = function() {
        var traceState = new TraceStateImpl2();
        traceState._internalState = new Map(this._internalState);
        return traceState;
      };
      return TraceStateImpl2;
    }();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/trace/internal/utils.js
function createTraceState(rawTraceState) {
  return new TraceStateImpl(rawTraceState);
}
var init_utils2 = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/trace/internal/utils.js"() {
    init_esm();
    init_tracestate_impl();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/context-api.js
var context;
var init_context_api = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/context-api.js"() {
    init_esm();
    init_context2();
    context = ContextAPI.getInstance();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/diag-api.js
var diag2;
var init_diag_api = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/diag-api.js"() {
    init_esm();
    init_diag();
    diag2 = DiagAPI.instance();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/metrics/NoopMeterProvider.js
var NoopMeterProvider, NOOP_METER_PROVIDER;
var init_NoopMeterProvider = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/metrics/NoopMeterProvider.js"() {
    init_esm();
    init_NoopMeter();
    NoopMeterProvider = /** @class */
    function() {
      function NoopMeterProvider2() {
      }
      NoopMeterProvider2.prototype.getMeter = function(_name, _version, _options) {
        return NOOP_METER;
      };
      return NoopMeterProvider2;
    }();
    NOOP_METER_PROVIDER = new NoopMeterProvider();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/api/metrics.js
var API_NAME4, MetricsAPI;
var init_metrics = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/api/metrics.js"() {
    init_esm();
    init_NoopMeterProvider();
    init_global_utils();
    init_diag();
    API_NAME4 = "metrics";
    MetricsAPI = /** @class */
    function() {
      function MetricsAPI2() {
      }
      MetricsAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new MetricsAPI2();
        }
        return this._instance;
      };
      MetricsAPI2.prototype.setGlobalMeterProvider = function(provider) {
        return registerGlobal2(API_NAME4, provider, DiagAPI.instance());
      };
      MetricsAPI2.prototype.getMeterProvider = function() {
        return getGlobal2(API_NAME4) || NOOP_METER_PROVIDER;
      };
      MetricsAPI2.prototype.getMeter = function(name, version, options) {
        return this.getMeterProvider().getMeter(name, version, options);
      };
      MetricsAPI2.prototype.disable = function() {
        unregisterGlobal2(API_NAME4, DiagAPI.instance());
      };
      return MetricsAPI2;
    }();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/metrics-api.js
var metrics;
var init_metrics_api = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/metrics-api.js"() {
    init_esm();
    init_metrics();
    metrics = MetricsAPI.getInstance();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/propagation/NoopTextMapPropagator.js
var NoopTextMapPropagator;
var init_NoopTextMapPropagator = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/propagation/NoopTextMapPropagator.js"() {
    init_esm();
    NoopTextMapPropagator = /** @class */
    function() {
      function NoopTextMapPropagator2() {
      }
      NoopTextMapPropagator2.prototype.inject = function(_context, _carrier) {
      };
      NoopTextMapPropagator2.prototype.extract = function(context2, _carrier) {
        return context2;
      };
      NoopTextMapPropagator2.prototype.fields = function() {
        return [];
      };
      return NoopTextMapPropagator2;
    }();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/baggage/context-helpers.js
function getBaggage(context2) {
  return context2.getValue(BAGGAGE_KEY) || void 0;
}
function getActiveBaggage() {
  return getBaggage(ContextAPI.getInstance().active());
}
function setBaggage(context2, baggage) {
  return context2.setValue(BAGGAGE_KEY, baggage);
}
function deleteBaggage(context2) {
  return context2.deleteValue(BAGGAGE_KEY);
}
var BAGGAGE_KEY;
var init_context_helpers = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/baggage/context-helpers.js"() {
    init_esm();
    init_context2();
    init_context();
    BAGGAGE_KEY = createContextKey("OpenTelemetry Baggage Key");
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/api/propagation.js
var API_NAME5, NOOP_TEXT_MAP_PROPAGATOR, PropagationAPI;
var init_propagation = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/api/propagation.js"() {
    init_esm();
    init_global_utils();
    init_NoopTextMapPropagator();
    init_TextMapPropagator();
    init_context_helpers();
    init_utils();
    init_diag();
    API_NAME5 = "propagation";
    NOOP_TEXT_MAP_PROPAGATOR = new NoopTextMapPropagator();
    PropagationAPI = /** @class */
    function() {
      function PropagationAPI2() {
        this.createBaggage = createBaggage;
        this.getBaggage = getBaggage;
        this.getActiveBaggage = getActiveBaggage;
        this.setBaggage = setBaggage;
        this.deleteBaggage = deleteBaggage;
      }
      PropagationAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new PropagationAPI2();
        }
        return this._instance;
      };
      PropagationAPI2.prototype.setGlobalPropagator = function(propagator) {
        return registerGlobal2(API_NAME5, propagator, DiagAPI.instance());
      };
      PropagationAPI2.prototype.inject = function(context2, carrier, setter) {
        if (setter === void 0) {
          setter = defaultTextMapSetter;
        }
        return this._getGlobalPropagator().inject(context2, carrier, setter);
      };
      PropagationAPI2.prototype.extract = function(context2, carrier, getter) {
        if (getter === void 0) {
          getter = defaultTextMapGetter;
        }
        return this._getGlobalPropagator().extract(context2, carrier, getter);
      };
      PropagationAPI2.prototype.fields = function() {
        return this._getGlobalPropagator().fields();
      };
      PropagationAPI2.prototype.disable = function() {
        unregisterGlobal2(API_NAME5, DiagAPI.instance());
      };
      PropagationAPI2.prototype._getGlobalPropagator = function() {
        return getGlobal2(API_NAME5) || NOOP_TEXT_MAP_PROPAGATOR;
      };
      return PropagationAPI2;
    }();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/propagation-api.js
var propagation;
var init_propagation_api = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/propagation-api.js"() {
    init_esm();
    init_propagation();
    propagation = PropagationAPI.getInstance();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/api/trace.js
var API_NAME6, TraceAPI;
var init_trace = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/api/trace.js"() {
    init_esm();
    init_global_utils();
    init_ProxyTracerProvider();
    init_spancontext_utils();
    init_context_utils();
    init_diag();
    API_NAME6 = "trace";
    TraceAPI = /** @class */
    function() {
      function TraceAPI2() {
        this._proxyTracerProvider = new ProxyTracerProvider();
        this.wrapSpanContext = wrapSpanContext;
        this.isSpanContextValid = isSpanContextValid;
        this.deleteSpan = deleteSpan;
        this.getSpan = getSpan;
        this.getActiveSpan = getActiveSpan;
        this.getSpanContext = getSpanContext;
        this.setSpan = setSpan;
        this.setSpanContext = setSpanContext;
      }
      TraceAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new TraceAPI2();
        }
        return this._instance;
      };
      TraceAPI2.prototype.setGlobalTracerProvider = function(provider) {
        var success = registerGlobal2(API_NAME6, this._proxyTracerProvider, DiagAPI.instance());
        if (success) {
          this._proxyTracerProvider.setDelegate(provider);
        }
        return success;
      };
      TraceAPI2.prototype.getTracerProvider = function() {
        return getGlobal2(API_NAME6) || this._proxyTracerProvider;
      };
      TraceAPI2.prototype.getTracer = function(name, version) {
        return this.getTracerProvider().getTracer(name, version);
      };
      TraceAPI2.prototype.disable = function() {
        unregisterGlobal2(API_NAME6, DiagAPI.instance());
        this._proxyTracerProvider = new ProxyTracerProvider();
      };
      return TraceAPI2;
    }();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/trace-api.js
var trace;
var init_trace_api = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/trace-api.js"() {
    init_esm();
    init_trace();
    trace = TraceAPI.getInstance();
  }
});

// ../../node_modules/@opentelemetry/api/build/esm/index.js
var esm_exports = {};
__export(esm_exports, {
  DiagConsoleLogger: () => DiagConsoleLogger,
  DiagLogLevel: () => DiagLogLevel,
  INVALID_SPANID: () => INVALID_SPANID,
  INVALID_SPAN_CONTEXT: () => INVALID_SPAN_CONTEXT,
  INVALID_TRACEID: () => INVALID_TRACEID,
  ProxyTracer: () => ProxyTracer,
  ProxyTracerProvider: () => ProxyTracerProvider,
  ROOT_CONTEXT: () => ROOT_CONTEXT,
  SamplingDecision: () => SamplingDecision,
  SpanKind: () => SpanKind,
  SpanStatusCode: () => SpanStatusCode,
  TraceFlags: () => TraceFlags,
  ValueType: () => ValueType,
  baggageEntryMetadataFromString: () => baggageEntryMetadataFromString,
  context: () => context,
  createContextKey: () => createContextKey,
  createNoopMeter: () => createNoopMeter,
  createTraceState: () => createTraceState,
  default: () => esm_default,
  defaultTextMapGetter: () => defaultTextMapGetter,
  defaultTextMapSetter: () => defaultTextMapSetter,
  diag: () => diag2,
  isSpanContextValid: () => isSpanContextValid,
  isValidSpanId: () => isValidSpanId,
  isValidTraceId: () => isValidTraceId,
  metrics: () => metrics,
  propagation: () => propagation,
  trace: () => trace
});
var esm_default;
var init_esm2 = __esm({
  "../../node_modules/@opentelemetry/api/build/esm/index.js"() {
    init_esm();
    init_utils();
    init_context();
    init_consoleLogger();
    init_types();
    init_NoopMeter();
    init_Metric();
    init_TextMapPropagator();
    init_ProxyTracer();
    init_ProxyTracerProvider();
    init_SamplingResult();
    init_span_kind();
    init_status();
    init_trace_flags();
    init_utils2();
    init_spancontext_utils();
    init_invalid_span_constants();
    init_context_api();
    init_diag_api();
    init_metrics_api();
    init_propagation_api();
    init_trace_api();
    esm_default = {
      context,
      diag: diag2,
      metrics,
      propagation,
      trace
    };
  }
});

// ../../node_modules/@google-cloud/precise-date/build/src/index.js
var require_src = __commonJS({
  "../../node_modules/@google-cloud/precise-date/build/src/index.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PreciseDate = void 0;
    var FULL_ISO_REG = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d{4,9}Z/;
    var NO_BIG_INT = "BigInt only available in Node >= v10.7. Consider using getFullTimeString instead.";
    var Sign;
    (function(Sign2) {
      Sign2[Sign2["NEGATIVE"] = -1] = "NEGATIVE";
      Sign2[Sign2["POSITIVE"] = 1] = "POSITIVE";
      Sign2[Sign2["ZERO"] = 0] = "ZERO";
    })(Sign || (Sign = {}));
    var PreciseDate2 = class _PreciseDate extends Date {
      constructor(time) {
        super();
        this._micros = 0;
        this._nanos = 0;
        if (time && typeof time !== "number" && !(time instanceof Date)) {
          this.setFullTime(_PreciseDate.parseFull(time));
          return;
        }
        const args = Array.from(arguments);
        const dateFields = args.slice(0, 7);
        const date = new Date(...dateFields);
        const nanos = args.length === 9 ? args.pop() : 0;
        const micros = args.length === 8 ? args.pop() : 0;
        this.setTime(date.getTime());
        this.setMicroseconds(micros);
        this.setNanoseconds(nanos);
      }
      /**
       * Returns the specified date represented in nanoseconds according to
       * universal time.
       *
       * **NOTE:** Because this method returns a `BigInt` it requires Node >= v10.7.
       * Use {@link PreciseDate#getFullTimeString} to get the time as a string.
       *
       * @see {@link https://github.com/tc39/proposal-bigint|BigInt}
       *
       * @throws {error} If `BigInt` is unavailable.
       * @returns {bigint}
       *
       * @example
       * const date = new PreciseDate('2019-02-08T10:34:29.481145231Z');
       *
       * console.log(date.getFullTime());
       * // expected output: 1549622069481145231n
       */
      getFullTime() {
        if (typeof BigInt !== "function") {
          throw new Error(NO_BIG_INT);
        }
        return BigInt(this.getFullTimeString());
      }
      /**
       * Returns a string of the specified date represented in nanoseconds according
       * to universal time.
       *
       * @returns {string}
       *
       * @example
       * const date = new PreciseDate('2019-02-08T10:34:29.481145231Z');
       *
       * console.log(date.getFullTimeString());
       * // expected output: "1549622069481145231"
       */
      getFullTimeString() {
        const seconds = this._getSeconds();
        let nanos = this._getNanos();
        if (nanos && Math.sign(seconds) === Sign.NEGATIVE) {
          nanos = 1e9 - nanos;
        }
        return `${seconds}${padLeft(nanos, 9)}`;
      }
      /**
       * Returns the microseconds in the specified date according to universal time.
       *
       * @returns {number}
       *
       * @example
       * const date = new PreciseDate('2019-02-08T10:34:29.481145Z');
       *
       * console.log(date.getMicroseconds());
       * // expected output: 145
       */
      getMicroseconds() {
        return this._micros;
      }
      /**
       * Returns the nanoseconds in the specified date according to universal time.
       *
       * @returns {number}
       *
       * @example
       * const date = new PreciseDate('2019-02-08T10:34:29.481145231Z');
       *
       * console.log(date.getNanoseconds());
       * // expected output: 231
       */
      getNanoseconds() {
        return this._nanos;
      }
      /**
       * Sets the microseconds for a specified date according to universal time.
       *
       * @param {number} microseconds A number representing the microseconds.
       * @returns {string} Returns a string representing the nanoseconds in the
       *     specified date according to universal time.
       *
       * @example
       * const date = new PreciseDate();
       *
       * date.setMicroseconds(149);
       *
       * console.log(date.getMicroseconds());
       * // expected output: 149
       */
      setMicroseconds(micros) {
        const abs = Math.abs(micros);
        let millis = this.getUTCMilliseconds();
        if (abs >= 1e3) {
          millis += Math.floor(abs / 1e3) * Math.sign(micros);
          micros %= 1e3;
        }
        if (Math.sign(micros) === Sign.NEGATIVE) {
          millis -= 1;
          micros += 1e3;
        }
        this._micros = micros;
        this.setUTCMilliseconds(millis);
        return this.getFullTimeString();
      }
      /**
       * Sets the nanoseconds for a specified date according to universal time.
       *
       * @param {number} nanoseconds A number representing the nanoseconds.
       * @returns {string} Returns a string representing the nanoseconds in the
       *     specified date according to universal time.
       *
       * @example
       * const date = new PreciseDate();
       *
       * date.setNanoseconds(231);
       *
       * console.log(date.getNanoseconds());
       * // expected output: 231
       */
      setNanoseconds(nanos) {
        const abs = Math.abs(nanos);
        let micros = this._micros;
        if (abs >= 1e3) {
          micros += Math.floor(abs / 1e3) * Math.sign(nanos);
          nanos %= 1e3;
        }
        if (Math.sign(nanos) === Sign.NEGATIVE) {
          micros -= 1;
          nanos += 1e3;
        }
        this._nanos = nanos;
        return this.setMicroseconds(micros);
      }
      /**
       * Sets the PreciseDate object to the time represented by a number of
       * nanoseconds since January 1, 1970, 00:00:00 UTC.
       *
       * @param {bigint|number|string} time Value representing the number of
       *     nanoseconds since January 1, 1970, 00:00:00 UTC.
       * @returns {string} Returns a string representing the nanoseconds in the
       *     specified date according to universal time (effectively, the value of
       *     the argument).
       *
       * @see {@link https://github.com/tc39/proposal-bigint|BigInt}
       *
       * @example <caption>With a nanosecond string.</caption>
       * const date = new PreciseDate();
       * date.setFullTime('1549622069481145231');
       *
       * @example <caption>With a BigInt</caption>
       * date.setFullTime(1549622069481145231n);
       */
      setFullTime(time) {
        if (typeof time !== "string") {
          time = time.toString();
        }
        const sign = Math.sign(Number(time));
        time = time.replace(/^-/, "");
        const seconds = Number(time.substr(0, time.length - 9)) * sign;
        const nanos = Number(time.substr(-9)) * sign;
        this.setTime(seconds * 1e3);
        return this.setNanoseconds(nanos);
      }
      /**
       * Sets the PreciseDate object to the time represented by a number of
       * milliseconds since January 1, 1970, 00:00:00 UTC. Calling this method will
       * reset both the microseconds and nanoseconds to 0.
       *
       * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/setTime|Date#setTime}
       *
       * @param {number} time Value representing the number of milliseconds since
       *     January 1, 1970, 00:00:00 UTC.
       * @returns {string} The number of milliseconds between January 1, 1970,
       *     00:00:00 UTC and the updated date (effectively, the value of the
       *     argument).
       */
      setTime(time) {
        this._micros = 0;
        this._nanos = 0;
        return super.setTime(time);
      }
      /**
       * Returns a string in RFC 3339 format. Unlike the native `Date#toISOString`,
       * this will return 9 digits to represent sub-second precision.
       *
       * @see {@link https://tools.ietf.org/html/rfc3339|RFC 3339}
       *
       * @returns {string}
       *
       * @example
       * const date = new PreciseDate(1549622069481145231n);
       *
       * console.log(date.toISOString());
       * // expected output: "2019-02-08T10:34:29.481145231Z"
       */
      toISOString() {
        const micros = padLeft(this._micros, 3);
        const nanos = padLeft(this._nanos, 3);
        return super.toISOString().replace(/z$/i, `${micros}${nanos}Z`);
      }
      /**
       * Returns an object representing the specified date according to universal
       * time.
       *
       * @see {@link https://developers.google.com/protocol-buffers/docs/reference/google.protobuf#timestamp|google.protobuf.Timestamp}
       *
       * @returns {DateStruct}
       *
       * @example
       * const date = new PreciseDate('2019-02-08T10:34:29.481145231Z');
       *
       * console.log(date.toStruct());
       * // expected output: {seconds: 1549622069, nanos: 481145231}
       */
      toStruct() {
        let seconds = this._getSeconds();
        const nanos = this._getNanos();
        const sign = Math.sign(seconds);
        if (sign === Sign.NEGATIVE && nanos) {
          seconds -= 1;
        }
        return { seconds, nanos };
      }
      /**
       * Returns a tuple representing the specified date according to universal
       * time.
       *
       * @returns {DateTuple}
       *
       * @example
       * const date = new PreciseDate('2019-02-08T10:34:29.481145231Z');
       *
       * console.log(date.toTuple());
       * // expected output: [1549622069, 481145231]
       */
      toTuple() {
        const { seconds, nanos } = this.toStruct();
        return [seconds, nanos];
      }
      /**
       * Returns the total number of seconds in the specified date since Unix epoch.
       * Numbers representing < epoch will be negative.
       *
       * @private
       *
       * @returns {number}
       */
      _getSeconds() {
        const time = this.getTime();
        const sign = Math.sign(time);
        return Math.floor(Math.abs(time) / 1e3) * sign;
      }
      /**
       * Returns the sub-second precision of the specified date. This will always be
       * a positive number.
       *
       * @private
       *
       * @returns {number}
       */
      _getNanos() {
        const msInNanos = this.getUTCMilliseconds() * 1e6;
        const microsInNanos = this._micros * 1e3;
        return this._nanos + msInNanos + microsInNanos;
      }
      /**
       * Parses a precise time.
       *
       * @static
       *
       * @param {string|bigint|DateTuple|DateStruct} time The precise time value.
       * @returns {string} Returns a string representing the nanoseconds in the
       *     specified date according to universal time.
       *
       * @example <caption>From a RFC 3339 formatted string.</caption>
       * const time = PreciseDate.parseFull('2019-02-08T10:34:29.481145231Z');
       * console.log(time); // expected output: "1549622069481145231"
       *
       * @example <caption>From a nanosecond timestamp string.</caption>
       * const time = PreciseDate.parseFull('1549622069481145231');
       * console.log(time); // expected output: "1549622069481145231"
       *
       * @example <caption>From a BigInt (requires Node >= v10.7)</caption>
       * const time = PreciseDate.parseFull(1549622069481145231n);
       * console.log(time); // expected output: "1549622069481145231"
       *
       * @example <caption>From a tuple.</caption>
       * const time = PreciseDate.parseFull([1549622069, 481145231]);
       * console.log(time); // expected output: "1549622069481145231"
       *
       * @example <caption>From an object.</caption>
       * const struct = {seconds: 1549622069, nanos: 481145231};
       * const time = PreciseDate.parseFull(struct);
       * console.log(time); // expected output: "1549622069481145231"
       */
      static parseFull(time) {
        const date = new _PreciseDate();
        if (Array.isArray(time)) {
          const [seconds, nanos] = time;
          time = { seconds, nanos };
        }
        if (isFullTime(time)) {
          date.setFullTime(time);
        } else if (isStruct(time)) {
          const { seconds, nanos } = parseProto(time);
          date.setTime(seconds * 1e3);
          date.setNanoseconds(nanos);
        } else if (isFullISOString(time)) {
          date.setFullTime(parseFullISO(time));
        } else {
          date.setTime(new Date(time).getTime());
        }
        return date.getFullTimeString();
      }
      /**
       * Accepts the same number parameters as the PreciseDate constructor, but
       * treats them as UTC. It returns a string that represents the number of
       * nanoseconds since January 1, 1970, 00:00:00 UTC.
       *
       * **NOTE:** Because this method returns a `BigInt` it requires Node >= v10.7.
       *
       * @see {@link https://github.com/tc39/proposal-bigint|BigInt}
       *
       * @static
       *
       * @throws {error} If `BigInt` is unavailable.
       *
       * @param {...number} [dateFields] The date fields.
       * @returns {bigint}
       *
       * @example
       * const time = PreciseDate.fullUTC(2019, 1, 8, 10, 34, 29, 481, 145, 231);
       * console.log(time); // expected output: 1549622069481145231n
       */
      static fullUTC(...args) {
        if (typeof BigInt !== "function") {
          throw new Error(NO_BIG_INT);
        }
        return BigInt(_PreciseDate.fullUTCString(...args));
      }
      /**
       * Accepts the same number parameters as the PreciseDate constructor, but
       * treats them as UTC. It returns a string that represents the number of
       * nanoseconds since January 1, 1970, 00:00:00 UTC.
       *
       * @static
       *
       * @param {...number} [dateFields] The date fields.
       * @returns {string}
       *
       * @example
       * const time = PreciseDate.fullUTCString(2019, 1, 8, 10, 34, 29, 481, 145,
       * 231); console.log(time); // expected output: '1549622069481145231'
       */
      static fullUTCString(...args) {
        const milliseconds = Date.UTC(...args.slice(0, 7));
        const date = new _PreciseDate(milliseconds);
        if (args.length === 9) {
          date.setNanoseconds(args.pop());
        }
        if (args.length === 8) {
          date.setMicroseconds(args.pop());
        }
        return date.getFullTimeString();
      }
    };
    exports.PreciseDate = PreciseDate2;
    function parseFullISO(time) {
      let digits = "0";
      time = time.replace(/\.(\d+)/, ($0, $1) => {
        digits = $1;
        return ".000";
      });
      const nanos = Number(padRight(digits, 9));
      const date = new PreciseDate2(time);
      return date.setNanoseconds(nanos);
    }
    function parseProto({ seconds = 0, nanos = 0 }) {
      if (typeof seconds.toNumber === "function") {
        seconds = seconds.toNumber();
      }
      seconds = Number(seconds);
      nanos = Number(nanos);
      return { seconds, nanos };
    }
    function isFullTime(time) {
      return typeof time === "bigint" || typeof time === "string" && /^\d+$/.test(time);
    }
    function isStruct(time) {
      return typeof time === "object" && typeof time.seconds !== "undefined" || typeof time.nanos === "number";
    }
    function isFullISOString(time) {
      return typeof time === "string" && FULL_ISO_REG.test(time);
    }
    function padLeft(n, min) {
      const padding = getPadding(n, min);
      return `${padding}${n}`;
    }
    function padRight(n, min) {
      const padding = getPadding(n, min);
      return `${n}${padding}`;
    }
    function getPadding(n, min) {
      const size = Math.max(min - n.toString().length, 0);
      return "0".repeat(size);
    }
  }
});

// ../../node_modules/@opentelemetry/api-logs/build/src/types/Logger.js
var require_Logger = __commonJS({
  "../../node_modules/@opentelemetry/api-logs/build/src/types/Logger.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../node_modules/@opentelemetry/api-logs/build/src/types/LoggerProvider.js
var require_LoggerProvider = __commonJS({
  "../../node_modules/@opentelemetry/api-logs/build/src/types/LoggerProvider.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../node_modules/@opentelemetry/api-logs/build/src/types/LogRecord.js
var require_LogRecord = __commonJS({
  "../../node_modules/@opentelemetry/api-logs/build/src/types/LogRecord.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SeverityNumber = void 0;
    var SeverityNumber3;
    (function(SeverityNumber4) {
      SeverityNumber4[SeverityNumber4["UNSPECIFIED"] = 0] = "UNSPECIFIED";
      SeverityNumber4[SeverityNumber4["TRACE"] = 1] = "TRACE";
      SeverityNumber4[SeverityNumber4["TRACE2"] = 2] = "TRACE2";
      SeverityNumber4[SeverityNumber4["TRACE3"] = 3] = "TRACE3";
      SeverityNumber4[SeverityNumber4["TRACE4"] = 4] = "TRACE4";
      SeverityNumber4[SeverityNumber4["DEBUG"] = 5] = "DEBUG";
      SeverityNumber4[SeverityNumber4["DEBUG2"] = 6] = "DEBUG2";
      SeverityNumber4[SeverityNumber4["DEBUG3"] = 7] = "DEBUG3";
      SeverityNumber4[SeverityNumber4["DEBUG4"] = 8] = "DEBUG4";
      SeverityNumber4[SeverityNumber4["INFO"] = 9] = "INFO";
      SeverityNumber4[SeverityNumber4["INFO2"] = 10] = "INFO2";
      SeverityNumber4[SeverityNumber4["INFO3"] = 11] = "INFO3";
      SeverityNumber4[SeverityNumber4["INFO4"] = 12] = "INFO4";
      SeverityNumber4[SeverityNumber4["WARN"] = 13] = "WARN";
      SeverityNumber4[SeverityNumber4["WARN2"] = 14] = "WARN2";
      SeverityNumber4[SeverityNumber4["WARN3"] = 15] = "WARN3";
      SeverityNumber4[SeverityNumber4["WARN4"] = 16] = "WARN4";
      SeverityNumber4[SeverityNumber4["ERROR"] = 17] = "ERROR";
      SeverityNumber4[SeverityNumber4["ERROR2"] = 18] = "ERROR2";
      SeverityNumber4[SeverityNumber4["ERROR3"] = 19] = "ERROR3";
      SeverityNumber4[SeverityNumber4["ERROR4"] = 20] = "ERROR4";
      SeverityNumber4[SeverityNumber4["FATAL"] = 21] = "FATAL";
      SeverityNumber4[SeverityNumber4["FATAL2"] = 22] = "FATAL2";
      SeverityNumber4[SeverityNumber4["FATAL3"] = 23] = "FATAL3";
      SeverityNumber4[SeverityNumber4["FATAL4"] = 24] = "FATAL4";
    })(SeverityNumber3 = exports.SeverityNumber || (exports.SeverityNumber = {}));
  }
});

// ../../node_modules/@opentelemetry/api-logs/build/src/types/LoggerOptions.js
var require_LoggerOptions = __commonJS({
  "../../node_modules/@opentelemetry/api-logs/build/src/types/LoggerOptions.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../node_modules/@opentelemetry/api-logs/build/src/types/AnyValue.js
var require_AnyValue = __commonJS({
  "../../node_modules/@opentelemetry/api-logs/build/src/types/AnyValue.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../node_modules/@opentelemetry/api-logs/build/src/NoopLogger.js
var require_NoopLogger = __commonJS({
  "../../node_modules/@opentelemetry/api-logs/build/src/NoopLogger.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NOOP_LOGGER = exports.NoopLogger = void 0;
    var NoopLogger = class {
      emit(_logRecord) {
      }
    };
    exports.NoopLogger = NoopLogger;
    exports.NOOP_LOGGER = new NoopLogger();
  }
});

// ../../node_modules/@opentelemetry/api-logs/build/src/NoopLoggerProvider.js
var require_NoopLoggerProvider = __commonJS({
  "../../node_modules/@opentelemetry/api-logs/build/src/NoopLoggerProvider.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NOOP_LOGGER_PROVIDER = exports.NoopLoggerProvider = void 0;
    var NoopLogger_1 = require_NoopLogger();
    var NoopLoggerProvider = class {
      getLogger(_name, _version, _options) {
        return new NoopLogger_1.NoopLogger();
      }
    };
    exports.NoopLoggerProvider = NoopLoggerProvider;
    exports.NOOP_LOGGER_PROVIDER = new NoopLoggerProvider();
  }
});

// ../../node_modules/@opentelemetry/api-logs/build/src/platform/node/globalThis.js
var require_globalThis = __commonJS({
  "../../node_modules/@opentelemetry/api-logs/build/src/platform/node/globalThis.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports._globalThis = void 0;
    exports._globalThis = typeof globalThis === "object" ? globalThis : global;
  }
});

// ../../node_modules/@opentelemetry/api-logs/build/src/platform/node/index.js
var require_node = __commonJS({
  "../../node_modules/@opentelemetry/api-logs/build/src/platform/node/index.js"(exports) {
    "use strict";
    init_esm();
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      Object.defineProperty(o, k2, { enumerable: true, get: function() {
        return m[k];
      } });
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(require_globalThis(), exports);
  }
});

// ../../node_modules/@opentelemetry/api-logs/build/src/platform/index.js
var require_platform = __commonJS({
  "../../node_modules/@opentelemetry/api-logs/build/src/platform/index.js"(exports) {
    "use strict";
    init_esm();
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      Object.defineProperty(o, k2, { enumerable: true, get: function() {
        return m[k];
      } });
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(require_node(), exports);
  }
});

// ../../node_modules/@opentelemetry/api-logs/build/src/internal/global-utils.js
var require_global_utils = __commonJS({
  "../../node_modules/@opentelemetry/api-logs/build/src/internal/global-utils.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.API_BACKWARDS_COMPATIBILITY_VERSION = exports.makeGetter = exports._global = exports.GLOBAL_LOGS_API_KEY = void 0;
    var platform_1 = require_platform();
    exports.GLOBAL_LOGS_API_KEY = Symbol.for("io.opentelemetry.js.api.logs");
    exports._global = platform_1._globalThis;
    function makeGetter(requiredVersion, instance, fallback) {
      return (version) => version === requiredVersion ? instance : fallback;
    }
    exports.makeGetter = makeGetter;
    exports.API_BACKWARDS_COMPATIBILITY_VERSION = 1;
  }
});

// ../../node_modules/@opentelemetry/api-logs/build/src/api/logs.js
var require_logs = __commonJS({
  "../../node_modules/@opentelemetry/api-logs/build/src/api/logs.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.LogsAPI = void 0;
    var global_utils_1 = require_global_utils();
    var NoopLoggerProvider_1 = require_NoopLoggerProvider();
    var LogsAPI = class _LogsAPI {
      constructor() {
      }
      static getInstance() {
        if (!this._instance) {
          this._instance = new _LogsAPI();
        }
        return this._instance;
      }
      setGlobalLoggerProvider(provider) {
        if (global_utils_1._global[global_utils_1.GLOBAL_LOGS_API_KEY]) {
          return this.getLoggerProvider();
        }
        global_utils_1._global[global_utils_1.GLOBAL_LOGS_API_KEY] = (0, global_utils_1.makeGetter)(global_utils_1.API_BACKWARDS_COMPATIBILITY_VERSION, provider, NoopLoggerProvider_1.NOOP_LOGGER_PROVIDER);
        return provider;
      }
      /**
       * Returns the global logger provider.
       *
       * @returns LoggerProvider
       */
      getLoggerProvider() {
        var _a, _b;
        return (_b = (_a = global_utils_1._global[global_utils_1.GLOBAL_LOGS_API_KEY]) === null || _a === void 0 ? void 0 : _a.call(global_utils_1._global, global_utils_1.API_BACKWARDS_COMPATIBILITY_VERSION)) !== null && _b !== void 0 ? _b : NoopLoggerProvider_1.NOOP_LOGGER_PROVIDER;
      }
      /**
       * Returns a logger from the global logger provider.
       *
       * @returns Logger
       */
      getLogger(name, version, options) {
        return this.getLoggerProvider().getLogger(name, version, options);
      }
      /** Remove the global logger provider */
      disable() {
        delete global_utils_1._global[global_utils_1.GLOBAL_LOGS_API_KEY];
      }
    };
    exports.LogsAPI = LogsAPI;
  }
});

// ../../node_modules/@opentelemetry/api-logs/build/src/index.js
var require_src2 = __commonJS({
  "../../node_modules/@opentelemetry/api-logs/build/src/index.js"(exports) {
    "use strict";
    init_esm();
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      Object.defineProperty(o, k2, { enumerable: true, get: function() {
        return m[k];
      } });
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.logs = void 0;
    __exportStar(require_Logger(), exports);
    __exportStar(require_LoggerProvider(), exports);
    __exportStar(require_LogRecord(), exports);
    __exportStar(require_LoggerOptions(), exports);
    __exportStar(require_AnyValue(), exports);
    __exportStar(require_NoopLogger(), exports);
    __exportStar(require_NoopLoggerProvider(), exports);
    var logs_1 = require_logs();
    exports.logs = logs_1.LogsAPI.getInstance();
  }
});

// ../../node_modules/@jsonhero/path/lib/path/query-result.js
var require_query_result = __commonJS({
  "../../node_modules/@jsonhero/path/lib/path/query-result.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    var QueryResult = (
      /** @class */
      function() {
        function QueryResult2(depth, path, object) {
          this.depth = 0;
          this.depth = depth;
          this.path = path;
          this.object = object;
        }
        QueryResult2.prototype.flatten = function() {
          var flattenedObject = this.object;
          if (typeof this.object === "object" && Array.isArray(this.object) && this.depth > 0) {
            flattenedObject = this.object.flat(this.depth);
          }
          return new QueryResult2(0, this.path, flattenedObject);
        };
        return QueryResult2;
      }()
    );
    exports.default = QueryResult;
  }
});

// ../../node_modules/@jsonhero/path/lib/path/simple-key-path-component.js
var require_simple_key_path_component = __commonJS({
  "../../node_modules/@jsonhero/path/lib/path/simple-key-path-component.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SimpleKeyPathComponent = void 0;
    var query_result_1 = require_query_result();
    var SimpleKeyPathComponent = (
      /** @class */
      function() {
        function SimpleKeyPathComponent2(keyName) {
          this.isArray = false;
          this.keyName = keyName;
          var keyAsInteger = parseInt(this.keyName, 10);
          if (isNaN(keyAsInteger)) {
            return;
          }
          var isInteger = Number.isInteger(keyAsInteger);
          if (!isInteger) {
            return;
          }
          if (keyAsInteger < 0) {
            return;
          }
          this.isArray = true;
        }
        SimpleKeyPathComponent2.fromString = function(string) {
          var keyName = string;
          SimpleKeyPathComponent2.unescapeExpressions.forEach(function(unescapePair) {
            keyName = keyName.replace(unescapePair.search, unescapePair.replacement);
          });
          return new SimpleKeyPathComponent2(keyName);
        };
        SimpleKeyPathComponent2.prototype.toString = function() {
          var escapedString = this.keyName;
          SimpleKeyPathComponent2.escapeExpressions.forEach(function(escapePair) {
            escapedString = escapedString.replace(escapePair.search, escapePair.replacement);
          });
          return escapedString;
        };
        SimpleKeyPathComponent2.prototype.jsonPointer = function() {
          var escapedString = this.keyName;
          escapedString = escapedString.replace(/(\~)/g, "~0");
          escapedString = escapedString.replace(/(\/)/g, "~1");
          return escapedString;
        };
        SimpleKeyPathComponent2.prototype.query = function(results) {
          var newResults = [];
          for (var i = 0; i < results.length; i++) {
            var result = results[i];
            var object = result.object;
            if (typeof object !== "object") {
              continue;
            }
            var newObject = object[this.keyName];
            if (newObject === null) {
              continue;
            }
            var newResult = new query_result_1.default(result.depth, result.path.child(this.keyName), newObject);
            newResults.push(newResult);
          }
          return newResults;
        };
        SimpleKeyPathComponent2.escapeExpressions = [
          { search: new RegExp(/(\\)/g), replacement: "\\" },
          { search: new RegExp(/(\.)/g), replacement: "\\." }
        ];
        SimpleKeyPathComponent2.unescapeExpressions = [
          { search: new RegExp(/(\\\.)/g), replacement: "." },
          { search: new RegExp(/(\\\\)/g), replacement: "\\" },
          { search: "~1", replacement: "/" }
        ];
        return SimpleKeyPathComponent2;
      }()
    );
    exports.SimpleKeyPathComponent = SimpleKeyPathComponent;
  }
});

// ../../node_modules/@jsonhero/path/lib/path/wildcard-path-component.js
var require_wildcard_path_component = __commonJS({
  "../../node_modules/@jsonhero/path/lib/path/wildcard-path-component.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WildcardPathComponent = void 0;
    var query_result_1 = require_query_result();
    var WildcardPathComponent = (
      /** @class */
      function() {
        function WildcardPathComponent2() {
          this.keyName = "*";
          this.isArray = true;
        }
        WildcardPathComponent2.fromString = function(string) {
          if (string === "*") {
            return new WildcardPathComponent2();
          }
          return null;
        };
        WildcardPathComponent2.prototype.toString = function() {
          return this.keyName;
        };
        WildcardPathComponent2.prototype.jsonPointer = function() {
          throw Error("JSON Pointers don't work with wildcards");
        };
        WildcardPathComponent2.prototype.query = function(results) {
          var newResults = [];
          for (var i = 0; i < results.length; i++) {
            var result = results[i];
            var object = result.object;
            if (typeof object !== "object") {
              continue;
            }
            for (var key in object) {
              var newObject = object[key];
              var newResult = new query_result_1.default(result.depth + 1, result.path.child(key), newObject);
              newResults.push(newResult);
            }
          }
          return newResults;
        };
        return WildcardPathComponent2;
      }()
    );
    exports.WildcardPathComponent = WildcardPathComponent;
  }
});

// ../../node_modules/@jsonhero/path/lib/path/start-path-component.js
var require_start_path_component = __commonJS({
  "../../node_modules/@jsonhero/path/lib/path/start-path-component.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    var StartPathComponent = (
      /** @class */
      function() {
        function StartPathComponent2() {
          this.keyName = "$";
          this.isArray = false;
        }
        StartPathComponent2.fromString = function(string) {
          if (string === "$") {
            return new StartPathComponent2();
          }
          return null;
        };
        StartPathComponent2.prototype.toString = function() {
          return this.keyName;
        };
        StartPathComponent2.prototype.jsonPointer = function() {
          return "";
        };
        StartPathComponent2.prototype.query = function(objects) {
          return objects;
        };
        return StartPathComponent2;
      }()
    );
    exports.default = StartPathComponent;
  }
});

// ../../node_modules/@jsonhero/path/lib/path/slice-path-component.js
var require_slice_path_component = __commonJS({
  "../../node_modules/@jsonhero/path/lib/path/slice-path-component.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SlicePathComponent = void 0;
    var query_result_1 = require_query_result();
    var SlicePathComponent = (
      /** @class */
      function() {
        function SlicePathComponent2(startIndex, endIndex) {
          this.endIndex = null;
          this.isArray = true;
          this.startIndex = startIndex;
          this.endIndex = endIndex;
        }
        SlicePathComponent2.fromString = function(string) {
          if (!SlicePathComponent2.regex.test(string)) {
            return null;
          }
          SlicePathComponent2.regex.lastIndex = 0;
          var result = SlicePathComponent2.regex.exec(string);
          if (result == null || result.groups == null) {
            return null;
          }
          var startResult = result.groups.startIndex;
          var endResult = result.groups.endIndex;
          var startIndex = startResult == null || startResult === "" ? 0 : parseInt(startResult, 10);
          var endIndex = endResult == null ? null : parseInt(endResult, 10);
          if (startIndex == null && endIndex == null) {
            return null;
          }
          var isStartInteger = Number.isInteger(startIndex);
          if (!isStartInteger) {
            return null;
          }
          return new SlicePathComponent2(startIndex, endIndex);
        };
        SlicePathComponent2.prototype.toString = function() {
          return "[".concat(this.startIndex).concat(this.endIndex == null ? "" : ":" + this.endIndex, "]");
        };
        SlicePathComponent2.prototype.jsonPointer = function() {
          throw Error("JSON Pointers don't work with wildcards");
        };
        SlicePathComponent2.prototype.query = function(results) {
          var newResults = [];
          for (var i = 0; i < results.length; i++) {
            var result = results[i];
            var object = result.object;
            if (typeof object !== "object")
              continue;
            if (!Array.isArray(object))
              continue;
            var slicedItems = void 0;
            if (this.endIndex == null) {
              slicedItems = object.slice(this.startIndex);
            } else {
              slicedItems = object.slice(this.startIndex, this.endIndex);
            }
            for (var j = 0; j < slicedItems.length; j++) {
              var slicedItem = slicedItems[j];
              newResults.push(new query_result_1.default(result.depth + 1, result.path.child("".concat(j + this.startIndex)), slicedItem));
            }
          }
          return newResults;
        };
        SlicePathComponent2.regex = /^\[(?<startIndex>[0-9]*):(?<endIndex>\-?[0-9]*)?\]$/g;
        return SlicePathComponent2;
      }()
    );
    exports.SlicePathComponent = SlicePathComponent;
  }
});

// ../../node_modules/@jsonhero/path/lib/path/path-builder.js
var require_path_builder = __commonJS({
  "../../node_modules/@jsonhero/path/lib/path/path-builder.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    var simple_key_path_component_1 = require_simple_key_path_component();
    var wildcard_path_component_1 = require_wildcard_path_component();
    var start_path_component_1 = require_start_path_component();
    var slice_path_component_1 = require_slice_path_component();
    var PathBuilder = (
      /** @class */
      function() {
        function PathBuilder2() {
        }
        PathBuilder2.prototype.parse = function(path) {
          PathBuilder2.pathPattern.lastIndex = 0;
          var subPaths = path.match(PathBuilder2.pathPattern);
          var components = [new start_path_component_1.default()];
          if (subPaths == null || subPaths.length == 0 || subPaths.length == 1 && subPaths[0] == "") {
            return components;
          }
          var startIndex = 0;
          if (subPaths[0] == "$") {
            startIndex = 1;
          }
          for (var i = startIndex; i < subPaths.length; i++) {
            var subPath = subPaths[i];
            var pathComponent = this.parseComponent(subPath);
            components.push(pathComponent);
          }
          return components;
        };
        PathBuilder2.prototype.parsePointer = function(pointer) {
          PathBuilder2.pathPattern.lastIndex = 0;
          var subPaths = pointer.match(PathBuilder2.pointerPattern);
          var components = [new start_path_component_1.default()];
          if (subPaths == null || subPaths.length == 0 || subPaths.length == 1 && subPaths[0] == "") {
            return components;
          }
          for (var _i = 0, subPaths_1 = subPaths; _i < subPaths_1.length; _i++) {
            var subPath = subPaths_1[_i];
            components.push(this.parseComponent(subPath));
          }
          return components;
        };
        PathBuilder2.prototype.parseComponent = function(string) {
          var wildcardComponent = wildcard_path_component_1.WildcardPathComponent.fromString(string);
          if (wildcardComponent != null) {
            return wildcardComponent;
          }
          if (string == null) {
            throw new SyntaxError("Cannot create a path from null");
          }
          if (string == "") {
            throw new SyntaxError("Cannot create a path from an empty string");
          }
          var sliceComponent = slice_path_component_1.SlicePathComponent.fromString(string);
          if (sliceComponent != null) {
            return sliceComponent;
          }
          return simple_key_path_component_1.SimpleKeyPathComponent.fromString(string);
        };
        PathBuilder2.pathPattern = /(?:[^\.\\]|\\.)+/g;
        PathBuilder2.pointerPattern = /(?:[^\/\\]|\\\/)+/g;
        return PathBuilder2;
      }()
    );
    exports.default = PathBuilder;
  }
});

// ../../node_modules/@jsonhero/path/lib/index.js
var require_lib = __commonJS({
  "../../node_modules/@jsonhero/path/lib/index.js"(exports) {
    "use strict";
    init_esm();
    var __spreadArray5 = exports && exports.__spreadArray || function(to, from, pack) {
      if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
      return to.concat(ar || Array.prototype.slice.call(from));
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.JSONHeroPath = void 0;
    var path_builder_1 = require_path_builder();
    var query_result_1 = require_query_result();
    var start_path_component_1 = require_start_path_component();
    var JSONHeroPath2 = (
      /** @class */
      function() {
        function JSONHeroPath3(components) {
          if (typeof components == "string") {
            var pathBuilder = new path_builder_1.default();
            this.components = pathBuilder.parse(components);
            return;
          }
          if (components.length == 0) {
            components.push(new start_path_component_1.default());
          }
          if (!(components[0] instanceof start_path_component_1.default)) {
            components.unshift(new start_path_component_1.default());
          }
          this.components = components;
        }
        JSONHeroPath3.fromPointer = function(pointer) {
          var pathBuilder = new path_builder_1.default();
          return new JSONHeroPath3(pathBuilder.parsePointer(pointer));
        };
        Object.defineProperty(JSONHeroPath3.prototype, "root", {
          get: function() {
            return new JSONHeroPath3(this.components.slice(0, 1));
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(JSONHeroPath3.prototype, "isRoot", {
          get: function() {
            if (this.components.length > 1)
              return false;
            return this.components[0] instanceof start_path_component_1.default;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(JSONHeroPath3.prototype, "parent", {
          get: function() {
            if (this.components.length == 1) {
              return null;
            }
            return new JSONHeroPath3(this.components.slice(0, -1));
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(JSONHeroPath3.prototype, "lastComponent", {
          get: function() {
            if (this.components.length === 0)
              return;
            return this.components[this.components.length - 1];
          },
          enumerable: false,
          configurable: true
        });
        JSONHeroPath3.prototype.child = function(key) {
          var string = this.toString();
          return new JSONHeroPath3(string.concat(".".concat(key)));
        };
        JSONHeroPath3.prototype.replaceComponent = function(index, newKey) {
          var pathBuilder = new path_builder_1.default();
          var newComponent = pathBuilder.parseComponent(newKey);
          var newComponents = __spreadArray5([], this.components, true);
          newComponents[index] = newComponent;
          return new JSONHeroPath3(newComponents);
        };
        JSONHeroPath3.prototype.toString = function() {
          return this.components.map(function(component) {
            return component.toString();
          }).join(".");
        };
        JSONHeroPath3.prototype.jsonPointer = function() {
          if (this.components.length === 1)
            return "";
          return this.components.map(function(component) {
            return component.jsonPointer();
          }).join("/");
        };
        JSONHeroPath3.prototype.first = function(object, options) {
          if (options === void 0) {
            options = { includePath: false };
          }
          var results = this.all(object, options);
          if (results === null || results.length === 0) {
            return null;
          }
          return results[0];
        };
        JSONHeroPath3.prototype.all = function(object, options) {
          if (options === void 0) {
            options = { includePath: false };
          }
          if (this.components.length == 0)
            return [object];
          if (this.components.length == 1 && this.components[0] instanceof start_path_component_1.default)
            return [object];
          var results = [];
          var firstResult = new query_result_1.default(0, this.root, object);
          results.push(firstResult);
          for (var i = 0; i < this.components.length; i++) {
            var component = this.components[i];
            results = component.query(results);
            if (results === null || results.length === 0) {
              return [];
            }
          }
          var flattenedResults = results.map(function(result) {
            return result.flatten();
          });
          if (!options.includePath) {
            return flattenedResults.map(function(result) {
              return result.object;
            });
          }
          var all = [];
          for (var i = 0; i < flattenedResults.length; i++) {
            var flattenedResult = flattenedResults[i];
            var object_1 = {
              value: flattenedResult.object
            };
            if (options.includePath) {
              object_1.path = flattenedResult.path;
            }
            all.push(object_1);
          }
          return all;
        };
        JSONHeroPath3.prototype.set = function(object, newValue) {
          var allResults = this.all(object, { includePath: true });
          allResults.forEach(function(_a) {
            var path = _a.path;
            var parentPath = path.parent;
            var parentObject = parentPath === null || parentPath === void 0 ? void 0 : parentPath.first(object);
            if (!path.lastComponent)
              return;
            parentObject[path.lastComponent.toString()] = newValue;
          });
        };
        JSONHeroPath3.prototype.merge = function(object, mergeValue) {
          var allResults = this.all(object, { includePath: true });
          allResults.forEach(function(_a) {
            var path = _a.path;
            var parentPath = path.parent;
            var parentObject = parentPath === null || parentPath === void 0 ? void 0 : parentPath.first(object);
            if (!path.lastComponent)
              return;
            var existingValue = parentObject[path.lastComponent.toString()];
            if (Array.isArray(existingValue)) {
              parentObject[path.lastComponent.toString()] = existingValue.concat([mergeValue].flat());
            } else {
              if (typeof mergeValue != "object" || Array.isArray(mergeValue))
                return;
              for (var key in mergeValue) {
                existingValue[key] = mergeValue[key];
              }
            }
          });
        };
        return JSONHeroPath3;
      }()
    );
    exports.JSONHeroPath = JSONHeroPath2;
  }
});

// ../../node_modules/humanize-duration/humanize-duration.js
var require_humanize_duration = __commonJS({
  "../../node_modules/humanize-duration/humanize-duration.js"(exports, module) {
    init_esm();
    (function() {
      var assign = Object.assign || /** @param {...any} destination */
      function(destination) {
        var source;
        for (var i = 1; i < arguments.length; i++) {
          source = arguments[i];
          for (var prop in source) {
            if (has2(source, prop)) {
              destination[prop] = source[prop];
            }
          }
        }
        return destination;
      };
      var isArray = Array.isArray || function(arg) {
        return Object.prototype.toString.call(arg) === "[object Array]";
      };
      var GREEK = language(
        function(c) {
          return c === 1 ? "χρόνος" : "χρόνια";
        },
        function(c) {
          return c === 1 ? "μήνας" : "μήνες";
        },
        function(c) {
          return c === 1 ? "εβδομάδα" : "εβδομάδες";
        },
        function(c) {
          return c === 1 ? "μέρα" : "μέρες";
        },
        function(c) {
          return c === 1 ? "ώρα" : "ώρες";
        },
        function(c) {
          return c === 1 ? "λεπτό" : "λεπτά";
        },
        function(c) {
          return c === 1 ? "δευτερόλεπτο" : "δευτερόλεπτα";
        },
        function(c) {
          return (c === 1 ? "χιλιοστό" : "χιλιοστά") + " του δευτερολέπτου";
        },
        ","
      );
      var LANGUAGES = {
        af: language(
          "jaar",
          function(c) {
            return "maand" + (c === 1 ? "" : "e");
          },
          function(c) {
            return c === 1 ? "week" : "weke";
          },
          function(c) {
            return c === 1 ? "dag" : "dae";
          },
          function(c) {
            return c === 1 ? "uur" : "ure";
          },
          function(c) {
            return c === 1 ? "minuut" : "minute";
          },
          function(c) {
            return "sekonde" + (c === 1 ? "" : "s");
          },
          function(c) {
            return "millisekonde" + (c === 1 ? "" : "s");
          },
          ","
        ),
        am: language("ዓመት", "ወር", "ሳምንት", "ቀን", "ሰዓት", "ደቂቃ", "ሰከንድ", "ሚሊሰከንድ"),
        ar: assign(
          language(
            function(c) {
              return ["سنة", "سنتان", "سنوات"][getArabicForm(c)];
            },
            function(c) {
              return ["شهر", "شهران", "أشهر"][getArabicForm(c)];
            },
            function(c) {
              return ["أسبوع", "أسبوعين", "أسابيع"][getArabicForm(c)];
            },
            function(c) {
              return ["يوم", "يومين", "أيام"][getArabicForm(c)];
            },
            function(c) {
              return ["ساعة", "ساعتين", "ساعات"][getArabicForm(c)];
            },
            function(c) {
              return ["دقيقة", "دقيقتان", "دقائق"][getArabicForm(c)];
            },
            function(c) {
              return ["ثانية", "ثانيتان", "ثواني"][getArabicForm(c)];
            },
            function(c) {
              return ["جزء من الثانية", "جزآن من الثانية", "أجزاء من الثانية"][getArabicForm(c)];
            },
            ","
          ),
          {
            delimiter: " ﻭ ",
            _hideCountIf2: true,
            _digitReplacements: ["۰", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"]
          }
        ),
        bg: language(
          function(c) {
            return ["години", "година", "години"][getSlavicForm(c)];
          },
          function(c) {
            return ["месеца", "месец", "месеца"][getSlavicForm(c)];
          },
          function(c) {
            return ["седмици", "седмица", "седмици"][getSlavicForm(c)];
          },
          function(c) {
            return ["дни", "ден", "дни"][getSlavicForm(c)];
          },
          function(c) {
            return ["часа", "час", "часа"][getSlavicForm(c)];
          },
          function(c) {
            return ["минути", "минута", "минути"][getSlavicForm(c)];
          },
          function(c) {
            return ["секунди", "секунда", "секунди"][getSlavicForm(c)];
          },
          function(c) {
            return ["милисекунди", "милисекунда", "милисекунди"][getSlavicForm(c)];
          },
          ","
        ),
        bn: language(
          "বছর",
          "মাস",
          "সপ্তাহ",
          "দিন",
          "ঘন্টা",
          "মিনিট",
          "সেকেন্ড",
          "মিলিসেকেন্ড"
        ),
        ca: language(
          function(c) {
            return "any" + (c === 1 ? "" : "s");
          },
          function(c) {
            return "mes" + (c === 1 ? "" : "os");
          },
          function(c) {
            return "setman" + (c === 1 ? "a" : "es");
          },
          function(c) {
            return "di" + (c === 1 ? "a" : "es");
          },
          function(c) {
            return "hor" + (c === 1 ? "a" : "es");
          },
          function(c) {
            return "minut" + (c === 1 ? "" : "s");
          },
          function(c) {
            return "segon" + (c === 1 ? "" : "s");
          },
          function(c) {
            return "milisegon" + (c === 1 ? "" : "s");
          },
          ","
        ),
        ckb: language(
          "ساڵ",
          "مانگ",
          "هەفتە",
          "ڕۆژ",
          "کاژێر",
          "خولەک",
          "چرکە",
          "میلی چرکە",
          "."
        ),
        cs: language(
          function(c) {
            return ["rok", "roku", "roky", "let"][getCzechOrSlovakForm(c)];
          },
          function(c) {
            return ["měsíc", "měsíce", "měsíce", "měsíců"][getCzechOrSlovakForm(c)];
          },
          function(c) {
            return ["týden", "týdne", "týdny", "týdnů"][getCzechOrSlovakForm(c)];
          },
          function(c) {
            return ["den", "dne", "dny", "dní"][getCzechOrSlovakForm(c)];
          },
          function(c) {
            return ["hodina", "hodiny", "hodiny", "hodin"][getCzechOrSlovakForm(c)];
          },
          function(c) {
            return ["minuta", "minuty", "minuty", "minut"][getCzechOrSlovakForm(c)];
          },
          function(c) {
            return ["sekunda", "sekundy", "sekundy", "sekund"][getCzechOrSlovakForm(c)];
          },
          function(c) {
            return ["milisekunda", "milisekundy", "milisekundy", "milisekund"][getCzechOrSlovakForm(c)];
          },
          ","
        ),
        cy: language(
          "flwyddyn",
          "mis",
          "wythnos",
          "diwrnod",
          "awr",
          "munud",
          "eiliad",
          "milieiliad"
        ),
        da: language(
          "år",
          function(c) {
            return "måned" + (c === 1 ? "" : "er");
          },
          function(c) {
            return "uge" + (c === 1 ? "" : "r");
          },
          function(c) {
            return "dag" + (c === 1 ? "" : "e");
          },
          function(c) {
            return "time" + (c === 1 ? "" : "r");
          },
          function(c) {
            return "minut" + (c === 1 ? "" : "ter");
          },
          function(c) {
            return "sekund" + (c === 1 ? "" : "er");
          },
          function(c) {
            return "millisekund" + (c === 1 ? "" : "er");
          },
          ","
        ),
        de: language(
          function(c) {
            return "Jahr" + (c === 1 ? "" : "e");
          },
          function(c) {
            return "Monat" + (c === 1 ? "" : "e");
          },
          function(c) {
            return "Woche" + (c === 1 ? "" : "n");
          },
          function(c) {
            return "Tag" + (c === 1 ? "" : "e");
          },
          function(c) {
            return "Stunde" + (c === 1 ? "" : "n");
          },
          function(c) {
            return "Minute" + (c === 1 ? "" : "n");
          },
          function(c) {
            return "Sekunde" + (c === 1 ? "" : "n");
          },
          function(c) {
            return "Millisekunde" + (c === 1 ? "" : "n");
          },
          ","
        ),
        el: GREEK,
        en: language(
          function(c) {
            return "year" + (c === 1 ? "" : "s");
          },
          function(c) {
            return "month" + (c === 1 ? "" : "s");
          },
          function(c) {
            return "week" + (c === 1 ? "" : "s");
          },
          function(c) {
            return "day" + (c === 1 ? "" : "s");
          },
          function(c) {
            return "hour" + (c === 1 ? "" : "s");
          },
          function(c) {
            return "minute" + (c === 1 ? "" : "s");
          },
          function(c) {
            return "second" + (c === 1 ? "" : "s");
          },
          function(c) {
            return "millisecond" + (c === 1 ? "" : "s");
          }
        ),
        eo: language(
          function(c) {
            return "jaro" + (c === 1 ? "" : "j");
          },
          function(c) {
            return "monato" + (c === 1 ? "" : "j");
          },
          function(c) {
            return "semajno" + (c === 1 ? "" : "j");
          },
          function(c) {
            return "tago" + (c === 1 ? "" : "j");
          },
          function(c) {
            return "horo" + (c === 1 ? "" : "j");
          },
          function(c) {
            return "minuto" + (c === 1 ? "" : "j");
          },
          function(c) {
            return "sekundo" + (c === 1 ? "" : "j");
          },
          function(c) {
            return "milisekundo" + (c === 1 ? "" : "j");
          },
          ","
        ),
        es: language(
          function(c) {
            return "año" + (c === 1 ? "" : "s");
          },
          function(c) {
            return "mes" + (c === 1 ? "" : "es");
          },
          function(c) {
            return "semana" + (c === 1 ? "" : "s");
          },
          function(c) {
            return "día" + (c === 1 ? "" : "s");
          },
          function(c) {
            return "hora" + (c === 1 ? "" : "s");
          },
          function(c) {
            return "minuto" + (c === 1 ? "" : "s");
          },
          function(c) {
            return "segundo" + (c === 1 ? "" : "s");
          },
          function(c) {
            return "milisegundo" + (c === 1 ? "" : "s");
          },
          ","
        ),
        et: language(
          function(c) {
            return "aasta" + (c === 1 ? "" : "t");
          },
          function(c) {
            return "kuu" + (c === 1 ? "" : "d");
          },
          function(c) {
            return "nädal" + (c === 1 ? "" : "at");
          },
          function(c) {
            return "päev" + (c === 1 ? "" : "a");
          },
          function(c) {
            return "tund" + (c === 1 ? "" : "i");
          },
          function(c) {
            return "minut" + (c === 1 ? "" : "it");
          },
          function(c) {
            return "sekund" + (c === 1 ? "" : "it");
          },
          function(c) {
            return "millisekund" + (c === 1 ? "" : "it");
          },
          ","
        ),
        eu: language(
          "urte",
          "hilabete",
          "aste",
          "egun",
          "ordu",
          "minutu",
          "segundo",
          "milisegundo",
          ","
        ),
        fa: language(
          "سال",
          "ماه",
          "هفته",
          "روز",
          "ساعت",
          "دقیقه",
          "ثانیه",
          "میلی ثانیه"
        ),
        fi: language(
          function(c) {
            return c === 1 ? "vuosi" : "vuotta";
          },
          function(c) {
            return c === 1 ? "kuukausi" : "kuukautta";
          },
          function(c) {
            return "viikko" + (c === 1 ? "" : "a");
          },
          function(c) {
            return "päivä" + (c === 1 ? "" : "ä");
          },
          function(c) {
            return "tunti" + (c === 1 ? "" : "a");
          },
          function(c) {
            return "minuutti" + (c === 1 ? "" : "a");
          },
          function(c) {
            return "sekunti" + (c === 1 ? "" : "a");
          },
          function(c) {
            return "millisekunti" + (c === 1 ? "" : "a");
          },
          ","
        ),
        fo: language(
          "ár",
          function(c) {
            return c === 1 ? "mánaður" : "mánaðir";
          },
          function(c) {
            return c === 1 ? "vika" : "vikur";
          },
          function(c) {
            return c === 1 ? "dagur" : "dagar";
          },
          function(c) {
            return c === 1 ? "tími" : "tímar";
          },
          function(c) {
            return c === 1 ? "minuttur" : "minuttir";
          },
          "sekund",
          "millisekund",
          ","
        ),
        fr: language(
          function(c) {
            return "an" + (c >= 2 ? "s" : "");
          },
          "mois",
          function(c) {
            return "semaine" + (c >= 2 ? "s" : "");
          },
          function(c) {
            return "jour" + (c >= 2 ? "s" : "");
          },
          function(c) {
            return "heure" + (c >= 2 ? "s" : "");
          },
          function(c) {
            return "minute" + (c >= 2 ? "s" : "");
          },
          function(c) {
            return "seconde" + (c >= 2 ? "s" : "");
          },
          function(c) {
            return "milliseconde" + (c >= 2 ? "s" : "");
          },
          ","
        ),
        gr: GREEK,
        he: language(
          function(c) {
            return c === 1 ? "שנה" : "שנים";
          },
          function(c) {
            return c === 1 ? "חודש" : "חודשים";
          },
          function(c) {
            return c === 1 ? "שבוע" : "שבועות";
          },
          function(c) {
            return c === 1 ? "יום" : "ימים";
          },
          function(c) {
            return c === 1 ? "שעה" : "שעות";
          },
          function(c) {
            return c === 1 ? "דקה" : "דקות";
          },
          function(c) {
            return c === 1 ? "שניה" : "שניות";
          },
          function(c) {
            return c === 1 ? "מילישנייה" : "מילישניות";
          }
        ),
        hr: language(
          function(c) {
            if (c % 10 === 2 || c % 10 === 3 || c % 10 === 4) {
              return "godine";
            }
            return "godina";
          },
          function(c) {
            if (c === 1) {
              return "mjesec";
            } else if (c === 2 || c === 3 || c === 4) {
              return "mjeseca";
            }
            return "mjeseci";
          },
          function(c) {
            if (c % 10 === 1 && c !== 11) {
              return "tjedan";
            }
            return "tjedna";
          },
          function(c) {
            return c === 1 ? "dan" : "dana";
          },
          function(c) {
            if (c === 1) {
              return "sat";
            } else if (c === 2 || c === 3 || c === 4) {
              return "sata";
            }
            return "sati";
          },
          function(c) {
            var mod10 = c % 10;
            if ((mod10 === 2 || mod10 === 3 || mod10 === 4) && (c < 10 || c > 14)) {
              return "minute";
            }
            return "minuta";
          },
          function(c) {
            var mod10 = c % 10;
            if (mod10 === 5 || Math.floor(c) === c && c >= 10 && c <= 19) {
              return "sekundi";
            } else if (mod10 === 1) {
              return "sekunda";
            } else if (mod10 === 2 || mod10 === 3 || mod10 === 4) {
              return "sekunde";
            }
            return "sekundi";
          },
          function(c) {
            if (c === 1) {
              return "milisekunda";
            } else if (c % 10 === 2 || c % 10 === 3 || c % 10 === 4) {
              return "milisekunde";
            }
            return "milisekundi";
          },
          ","
        ),
        hi: language(
          "साल",
          function(c) {
            return c === 1 ? "महीना" : "महीने";
          },
          function(c) {
            return c === 1 ? "हफ़्ता" : "हफ्ते";
          },
          "दिन",
          function(c) {
            return c === 1 ? "घंटा" : "घंटे";
          },
          "मिनट",
          "सेकंड",
          "मिलीसेकंड"
        ),
        hu: language(
          "év",
          "hónap",
          "hét",
          "nap",
          "óra",
          "perc",
          "másodperc",
          "ezredmásodperc",
          ","
        ),
        id: language(
          "tahun",
          "bulan",
          "minggu",
          "hari",
          "jam",
          "menit",
          "detik",
          "milidetik"
        ),
        is: language(
          "ár",
          function(c) {
            return "mánuð" + (c === 1 ? "ur" : "ir");
          },
          function(c) {
            return "vik" + (c === 1 ? "a" : "ur");
          },
          function(c) {
            return "dag" + (c === 1 ? "ur" : "ar");
          },
          function(c) {
            return "klukkutím" + (c === 1 ? "i" : "ar");
          },
          function(c) {
            return "mínút" + (c === 1 ? "a" : "ur");
          },
          function(c) {
            return "sekúnd" + (c === 1 ? "a" : "ur");
          },
          function(c) {
            return "millisekúnd" + (c === 1 ? "a" : "ur");
          }
        ),
        it: language(
          function(c) {
            return "ann" + (c === 1 ? "o" : "i");
          },
          function(c) {
            return "mes" + (c === 1 ? "e" : "i");
          },
          function(c) {
            return "settiman" + (c === 1 ? "a" : "e");
          },
          function(c) {
            return "giorn" + (c === 1 ? "o" : "i");
          },
          function(c) {
            return "or" + (c === 1 ? "a" : "e");
          },
          function(c) {
            return "minut" + (c === 1 ? "o" : "i");
          },
          function(c) {
            return "second" + (c === 1 ? "o" : "i");
          },
          function(c) {
            return "millisecond" + (c === 1 ? "o" : "i");
          },
          ","
        ),
        ja: language("年", "ヶ月", "週間", "日", "時間", "分", "秒", "ミリ秒"),
        km: language(
          "ឆ្នាំ",
          "ខែ",
          "សប្តាហ៍",
          "ថ្ងៃ",
          "ម៉ោង",
          "នាទី",
          "វិនាទី",
          "មិល្លីវិនាទី"
        ),
        kn: language(
          function(c) {
            return c === 1 ? "ವರ್ಷ" : "ವರ್ಷಗಳು";
          },
          function(c) {
            return c === 1 ? "ತಿಂಗಳು" : "ತಿಂಗಳುಗಳು";
          },
          function(c) {
            return c === 1 ? "ವಾರ" : "ವಾರಗಳು";
          },
          function(c) {
            return c === 1 ? "ದಿನ" : "ದಿನಗಳು";
          },
          function(c) {
            return c === 1 ? "ಗಂಟೆ" : "ಗಂಟೆಗಳು";
          },
          function(c) {
            return c === 1 ? "ನಿಮಿಷ" : "ನಿಮಿಷಗಳು";
          },
          function(c) {
            return c === 1 ? "ಸೆಕೆಂಡ್" : "ಸೆಕೆಂಡುಗಳು";
          },
          function(c) {
            return c === 1 ? "ಮಿಲಿಸೆಕೆಂಡ್" : "ಮಿಲಿಸೆಕೆಂಡುಗಳು";
          }
        ),
        ko: language("년", "개월", "주일", "일", "시간", "분", "초", "밀리 초"),
        ku: language(
          "sal",
          "meh",
          "hefte",
          "roj",
          "seet",
          "deqe",
          "saniye",
          "mîlîçirk",
          ","
        ),
        lo: language(
          "ປີ",
          "ເດືອນ",
          "ອາທິດ",
          "ມື້",
          "ຊົ່ວໂມງ",
          "ນາທີ",
          "ວິນາທີ",
          "ມິນລິວິນາທີ",
          ","
        ),
        lt: language(
          function(c) {
            return c % 10 === 0 || c % 100 >= 10 && c % 100 <= 20 ? "metų" : "metai";
          },
          function(c) {
            return ["mėnuo", "mėnesiai", "mėnesių"][getLithuanianForm(c)];
          },
          function(c) {
            return ["savaitė", "savaitės", "savaičių"][getLithuanianForm(c)];
          },
          function(c) {
            return ["diena", "dienos", "dienų"][getLithuanianForm(c)];
          },
          function(c) {
            return ["valanda", "valandos", "valandų"][getLithuanianForm(c)];
          },
          function(c) {
            return ["minutė", "minutės", "minučių"][getLithuanianForm(c)];
          },
          function(c) {
            return ["sekundė", "sekundės", "sekundžių"][getLithuanianForm(c)];
          },
          function(c) {
            return ["milisekundė", "milisekundės", "milisekundžių"][getLithuanianForm(c)];
          },
          ","
        ),
        lv: language(
          function(c) {
            return getLatvianForm(c) ? "gads" : "gadi";
          },
          function(c) {
            return getLatvianForm(c) ? "mēnesis" : "mēneši";
          },
          function(c) {
            return getLatvianForm(c) ? "nedēļa" : "nedēļas";
          },
          function(c) {
            return getLatvianForm(c) ? "diena" : "dienas";
          },
          function(c) {
            return getLatvianForm(c) ? "stunda" : "stundas";
          },
          function(c) {
            return getLatvianForm(c) ? "minūte" : "minūtes";
          },
          function(c) {
            return getLatvianForm(c) ? "sekunde" : "sekundes";
          },
          function(c) {
            return getLatvianForm(c) ? "milisekunde" : "milisekundes";
          },
          ","
        ),
        mk: language(
          function(c) {
            return c === 1 ? "година" : "години";
          },
          function(c) {
            return c === 1 ? "месец" : "месеци";
          },
          function(c) {
            return c === 1 ? "недела" : "недели";
          },
          function(c) {
            return c === 1 ? "ден" : "дена";
          },
          function(c) {
            return c === 1 ? "час" : "часа";
          },
          function(c) {
            return c === 1 ? "минута" : "минути";
          },
          function(c) {
            return c === 1 ? "секунда" : "секунди";
          },
          function(c) {
            return c === 1 ? "милисекунда" : "милисекунди";
          },
          ","
        ),
        mn: language(
          "жил",
          "сар",
          "долоо хоног",
          "өдөр",
          "цаг",
          "минут",
          "секунд",
          "миллисекунд"
        ),
        mr: language(
          function(c) {
            return c === 1 ? "वर्ष" : "वर्षे";
          },
          function(c) {
            return c === 1 ? "महिना" : "महिने";
          },
          function(c) {
            return c === 1 ? "आठवडा" : "आठवडे";
          },
          "दिवस",
          "तास",
          function(c) {
            return c === 1 ? "मिनिट" : "मिनिटे";
          },
          "सेकंद",
          "मिलिसेकंद"
        ),
        ms: language(
          "tahun",
          "bulan",
          "minggu",
          "hari",
          "jam",
          "minit",
          "saat",
          "milisaat"
        ),
        nl: language(
          "jaar",
          function(c) {
            return c === 1 ? "maand" : "maanden";
          },
          function(c) {
            return c === 1 ? "week" : "weken";
          },
          function(c) {
            return c === 1 ? "dag" : "dagen";
          },
          "uur",
          function(c) {
            return c === 1 ? "minuut" : "minuten";
          },
          function(c) {
            return c === 1 ? "seconde" : "seconden";
          },
          function(c) {
            return c === 1 ? "milliseconde" : "milliseconden";
          },
          ","
        ),
        no: language(
          "år",
          function(c) {
            return "måned" + (c === 1 ? "" : "er");
          },
          function(c) {
            return "uke" + (c === 1 ? "" : "r");
          },
          function(c) {
            return "dag" + (c === 1 ? "" : "er");
          },
          function(c) {
            return "time" + (c === 1 ? "" : "r");
          },
          function(c) {
            return "minutt" + (c === 1 ? "" : "er");
          },
          function(c) {
            return "sekund" + (c === 1 ? "" : "er");
          },
          function(c) {
            return "millisekund" + (c === 1 ? "" : "er");
          },
          ","
        ),
        pl: language(
          function(c) {
            return ["rok", "roku", "lata", "lat"][getPolishForm(c)];
          },
          function(c) {
            return ["miesiąc", "miesiąca", "miesiące", "miesięcy"][getPolishForm(c)];
          },
          function(c) {
            return ["tydzień", "tygodnia", "tygodnie", "tygodni"][getPolishForm(c)];
          },
          function(c) {
            return ["dzień", "dnia", "dni", "dni"][getPolishForm(c)];
          },
          function(c) {
            return ["godzina", "godziny", "godziny", "godzin"][getPolishForm(c)];
          },
          function(c) {
            return ["minuta", "minuty", "minuty", "minut"][getPolishForm(c)];
          },
          function(c) {
            return ["sekunda", "sekundy", "sekundy", "sekund"][getPolishForm(c)];
          },
          function(c) {
            return ["milisekunda", "milisekundy", "milisekundy", "milisekund"][getPolishForm(c)];
          },
          ","
        ),
        pt: language(
          function(c) {
            return "ano" + (c === 1 ? "" : "s");
          },
          function(c) {
            return c === 1 ? "mês" : "meses";
          },
          function(c) {
            return "semana" + (c === 1 ? "" : "s");
          },
          function(c) {
            return "dia" + (c === 1 ? "" : "s");
          },
          function(c) {
            return "hora" + (c === 1 ? "" : "s");
          },
          function(c) {
            return "minuto" + (c === 1 ? "" : "s");
          },
          function(c) {
            return "segundo" + (c === 1 ? "" : "s");
          },
          function(c) {
            return "milissegundo" + (c === 1 ? "" : "s");
          },
          ","
        ),
        ro: language(
          function(c) {
            return c === 1 ? "an" : "ani";
          },
          function(c) {
            return c === 1 ? "lună" : "luni";
          },
          function(c) {
            return c === 1 ? "săptămână" : "săptămâni";
          },
          function(c) {
            return c === 1 ? "zi" : "zile";
          },
          function(c) {
            return c === 1 ? "oră" : "ore";
          },
          function(c) {
            return c === 1 ? "minut" : "minute";
          },
          function(c) {
            return c === 1 ? "secundă" : "secunde";
          },
          function(c) {
            return c === 1 ? "milisecundă" : "milisecunde";
          },
          ","
        ),
        ru: language(
          function(c) {
            return ["лет", "год", "года"][getSlavicForm(c)];
          },
          function(c) {
            return ["месяцев", "месяц", "месяца"][getSlavicForm(c)];
          },
          function(c) {
            return ["недель", "неделя", "недели"][getSlavicForm(c)];
          },
          function(c) {
            return ["дней", "день", "дня"][getSlavicForm(c)];
          },
          function(c) {
            return ["часов", "час", "часа"][getSlavicForm(c)];
          },
          function(c) {
            return ["минут", "минута", "минуты"][getSlavicForm(c)];
          },
          function(c) {
            return ["секунд", "секунда", "секунды"][getSlavicForm(c)];
          },
          function(c) {
            return ["миллисекунд", "миллисекунда", "миллисекунды"][getSlavicForm(c)];
          },
          ","
        ),
        sq: language(
          function(c) {
            return c === 1 ? "vit" : "vjet";
          },
          "muaj",
          "javë",
          "ditë",
          "orë",
          function(c) {
            return "minut" + (c === 1 ? "ë" : "a");
          },
          function(c) {
            return "sekond" + (c === 1 ? "ë" : "a");
          },
          function(c) {
            return "milisekond" + (c === 1 ? "ë" : "a");
          },
          ","
        ),
        sr: language(
          function(c) {
            return ["години", "година", "године"][getSlavicForm(c)];
          },
          function(c) {
            return ["месеци", "месец", "месеца"][getSlavicForm(c)];
          },
          function(c) {
            return ["недељи", "недеља", "недеље"][getSlavicForm(c)];
          },
          function(c) {
            return ["дани", "дан", "дана"][getSlavicForm(c)];
          },
          function(c) {
            return ["сати", "сат", "сата"][getSlavicForm(c)];
          },
          function(c) {
            return ["минута", "минут", "минута"][getSlavicForm(c)];
          },
          function(c) {
            return ["секунди", "секунда", "секунде"][getSlavicForm(c)];
          },
          function(c) {
            return ["милисекунди", "милисекунда", "милисекунде"][getSlavicForm(c)];
          },
          ","
        ),
        sr_Latn: language(
          function(c) {
            return ["godini", "godina", "godine"][getSlavicForm(c)];
          },
          function(c) {
            return ["meseci", "mesec", "meseca"][getSlavicForm(c)];
          },
          function(c) {
            return ["nedelji", "nedelja", "nedelje"][getSlavicForm(c)];
          },
          function(c) {
            return ["dani", "dan", "dana"][getSlavicForm(c)];
          },
          function(c) {
            return ["sati", "sat", "sata"][getSlavicForm(c)];
          },
          function(c) {
            return ["minuta", "minut", "minuta"][getSlavicForm(c)];
          },
          function(c) {
            return ["sekundi", "sekunda", "sekunde"][getSlavicForm(c)];
          },
          function(c) {
            return ["milisekundi", "milisekunda", "milisekunde"][getSlavicForm(c)];
          },
          ","
        ),
        ta: language(
          function(c) {
            return c === 1 ? "வருடம்" : "ஆண்டுகள்";
          },
          function(c) {
            return c === 1 ? "மாதம்" : "மாதங்கள்";
          },
          function(c) {
            return c === 1 ? "வாரம்" : "வாரங்கள்";
          },
          function(c) {
            return c === 1 ? "நாள்" : "நாட்கள்";
          },
          function(c) {
            return c === 1 ? "மணி" : "மணிநேரம்";
          },
          function(c) {
            return "நிமிட" + (c === 1 ? "ம்" : "ங்கள்");
          },
          function(c) {
            return "வினாடி" + (c === 1 ? "" : "கள்");
          },
          function(c) {
            return "மில்லி விநாடி" + (c === 1 ? "" : "கள்");
          }
        ),
        te: language(
          function(c) {
            return "సంవత్స" + (c === 1 ? "రం" : "రాల");
          },
          function(c) {
            return "నెల" + (c === 1 ? "" : "ల");
          },
          function(c) {
            return c === 1 ? "వారం" : "వారాలు";
          },
          function(c) {
            return "రోజు" + (c === 1 ? "" : "లు");
          },
          function(c) {
            return "గంట" + (c === 1 ? "" : "లు");
          },
          function(c) {
            return c === 1 ? "నిమిషం" : "నిమిషాలు";
          },
          function(c) {
            return c === 1 ? "సెకను" : "సెకన్లు";
          },
          function(c) {
            return c === 1 ? "మిల్లీసెకన్" : "మిల్లీసెకన్లు";
          }
        ),
        uk: language(
          function(c) {
            return ["років", "рік", "роки"][getSlavicForm(c)];
          },
          function(c) {
            return ["місяців", "місяць", "місяці"][getSlavicForm(c)];
          },
          function(c) {
            return ["тижнів", "тиждень", "тижні"][getSlavicForm(c)];
          },
          function(c) {
            return ["днів", "день", "дні"][getSlavicForm(c)];
          },
          function(c) {
            return ["годин", "година", "години"][getSlavicForm(c)];
          },
          function(c) {
            return ["хвилин", "хвилина", "хвилини"][getSlavicForm(c)];
          },
          function(c) {
            return ["секунд", "секунда", "секунди"][getSlavicForm(c)];
          },
          function(c) {
            return ["мілісекунд", "мілісекунда", "мілісекунди"][getSlavicForm(c)];
          },
          ","
        ),
        ur: language(
          "سال",
          function(c) {
            return c === 1 ? "مہینہ" : "مہینے";
          },
          function(c) {
            return c === 1 ? "ہفتہ" : "ہفتے";
          },
          "دن",
          function(c) {
            return c === 1 ? "گھنٹہ" : "گھنٹے";
          },
          "منٹ",
          "سیکنڈ",
          "ملی سیکنڈ"
        ),
        sk: language(
          function(c) {
            return ["rok", "roky", "roky", "rokov"][getCzechOrSlovakForm(c)];
          },
          function(c) {
            return ["mesiac", "mesiace", "mesiace", "mesiacov"][getCzechOrSlovakForm(c)];
          },
          function(c) {
            return ["týždeň", "týždne", "týždne", "týždňov"][getCzechOrSlovakForm(c)];
          },
          function(c) {
            return ["deň", "dni", "dni", "dní"][getCzechOrSlovakForm(c)];
          },
          function(c) {
            return ["hodina", "hodiny", "hodiny", "hodín"][getCzechOrSlovakForm(c)];
          },
          function(c) {
            return ["minúta", "minúty", "minúty", "minút"][getCzechOrSlovakForm(c)];
          },
          function(c) {
            return ["sekunda", "sekundy", "sekundy", "sekúnd"][getCzechOrSlovakForm(c)];
          },
          function(c) {
            return ["milisekunda", "milisekundy", "milisekundy", "milisekúnd"][getCzechOrSlovakForm(c)];
          },
          ","
        ),
        sl: language(
          function(c) {
            if (c % 10 === 1) {
              return "leto";
            } else if (c % 100 === 2) {
              return "leti";
            } else if (c % 100 === 3 || c % 100 === 4 || Math.floor(c) !== c && c % 100 <= 5) {
              return "leta";
            } else {
              return "let";
            }
          },
          function(c) {
            if (c % 10 === 1) {
              return "mesec";
            } else if (c % 100 === 2 || Math.floor(c) !== c && c % 100 <= 5) {
              return "meseca";
            } else if (c % 10 === 3 || c % 10 === 4) {
              return "mesece";
            } else {
              return "mesecev";
            }
          },
          function(c) {
            if (c % 10 === 1) {
              return "teden";
            } else if (c % 10 === 2 || Math.floor(c) !== c && c % 100 <= 4) {
              return "tedna";
            } else if (c % 10 === 3 || c % 10 === 4) {
              return "tedne";
            } else {
              return "tednov";
            }
          },
          function(c) {
            return c % 100 === 1 ? "dan" : "dni";
          },
          function(c) {
            if (c % 10 === 1) {
              return "ura";
            } else if (c % 100 === 2) {
              return "uri";
            } else if (c % 10 === 3 || c % 10 === 4 || Math.floor(c) !== c) {
              return "ure";
            } else {
              return "ur";
            }
          },
          function(c) {
            if (c % 10 === 1) {
              return "minuta";
            } else if (c % 10 === 2) {
              return "minuti";
            } else if (c % 10 === 3 || c % 10 === 4 || Math.floor(c) !== c && c % 100 <= 4) {
              return "minute";
            } else {
              return "minut";
            }
          },
          function(c) {
            if (c % 10 === 1) {
              return "sekunda";
            } else if (c % 100 === 2) {
              return "sekundi";
            } else if (c % 100 === 3 || c % 100 === 4 || Math.floor(c) !== c) {
              return "sekunde";
            } else {
              return "sekund";
            }
          },
          function(c) {
            if (c % 10 === 1) {
              return "milisekunda";
            } else if (c % 100 === 2) {
              return "milisekundi";
            } else if (c % 100 === 3 || c % 100 === 4 || Math.floor(c) !== c) {
              return "milisekunde";
            } else {
              return "milisekund";
            }
          },
          ","
        ),
        sv: language(
          "år",
          function(c) {
            return "månad" + (c === 1 ? "" : "er");
          },
          function(c) {
            return "veck" + (c === 1 ? "a" : "or");
          },
          function(c) {
            return "dag" + (c === 1 ? "" : "ar");
          },
          function(c) {
            return "timm" + (c === 1 ? "e" : "ar");
          },
          function(c) {
            return "minut" + (c === 1 ? "" : "er");
          },
          function(c) {
            return "sekund" + (c === 1 ? "" : "er");
          },
          function(c) {
            return "millisekund" + (c === 1 ? "" : "er");
          },
          ","
        ),
        sw: assign(
          language(
            function(c) {
              return c === 1 ? "mwaka" : "miaka";
            },
            function(c) {
              return c === 1 ? "mwezi" : "miezi";
            },
            "wiki",
            function(c) {
              return c === 1 ? "siku" : "masiku";
            },
            function(c) {
              return c === 1 ? "saa" : "masaa";
            },
            "dakika",
            "sekunde",
            "milisekunde"
          ),
          { _numberFirst: true }
        ),
        tr: language(
          "yıl",
          "ay",
          "hafta",
          "gün",
          "saat",
          "dakika",
          "saniye",
          "milisaniye",
          ","
        ),
        th: language(
          "ปี",
          "เดือน",
          "สัปดาห์",
          "วัน",
          "ชั่วโมง",
          "นาที",
          "วินาที",
          "มิลลิวินาที"
        ),
        uz: language(
          "yil",
          "oy",
          "hafta",
          "kun",
          "soat",
          "minut",
          "sekund",
          "millisekund"
        ),
        uz_CYR: language(
          "йил",
          "ой",
          "ҳафта",
          "кун",
          "соат",
          "минут",
          "секунд",
          "миллисекунд"
        ),
        vi: language(
          "năm",
          "tháng",
          "tuần",
          "ngày",
          "giờ",
          "phút",
          "giây",
          "mili giây",
          ","
        ),
        zh_CN: language("年", "个月", "周", "天", "小时", "分钟", "秒", "毫秒"),
        zh_TW: language("年", "個月", "周", "天", "小時", "分鐘", "秒", "毫秒")
      };
      function language(y, mo, w, d, h, m, s, ms, decimal) {
        var result = { y, mo, w, d, h, m, s, ms };
        if (typeof decimal !== "undefined") {
          result.decimal = decimal;
        }
        return result;
      }
      function getArabicForm(c) {
        if (c === 2) {
          return 1;
        }
        if (c > 2 && c < 11) {
          return 2;
        }
        return 0;
      }
      function getPolishForm(c) {
        if (c === 1) {
          return 0;
        }
        if (Math.floor(c) !== c) {
          return 1;
        }
        if (c % 10 >= 2 && c % 10 <= 4 && !(c % 100 > 10 && c % 100 < 20)) {
          return 2;
        }
        return 3;
      }
      function getSlavicForm(c) {
        if (Math.floor(c) !== c) {
          return 2;
        }
        if (c % 100 >= 5 && c % 100 <= 20 || c % 10 >= 5 && c % 10 <= 9 || c % 10 === 0) {
          return 0;
        }
        if (c % 10 === 1) {
          return 1;
        }
        if (c > 1) {
          return 2;
        }
        return 0;
      }
      function getCzechOrSlovakForm(c) {
        if (c === 1) {
          return 0;
        }
        if (Math.floor(c) !== c) {
          return 1;
        }
        if (c % 10 >= 2 && c % 10 <= 4 && c % 100 < 10) {
          return 2;
        }
        return 3;
      }
      function getLithuanianForm(c) {
        if (c === 1 || c % 10 === 1 && c % 100 > 20) {
          return 0;
        }
        if (Math.floor(c) !== c || c % 10 >= 2 && c % 100 > 20 || c % 10 >= 2 && c % 100 < 10) {
          return 1;
        }
        return 2;
      }
      function getLatvianForm(c) {
        return c % 10 === 1 && c % 100 !== 11;
      }
      function has2(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
      }
      function getLanguage(options) {
        var possibleLanguages = [options.language];
        if (has2(options, "fallbacks")) {
          if (isArray(options.fallbacks) && options.fallbacks.length) {
            possibleLanguages = possibleLanguages.concat(options.fallbacks);
          } else {
            throw new Error("fallbacks must be an array with at least one element");
          }
        }
        for (var i = 0; i < possibleLanguages.length; i++) {
          var languageToTry = possibleLanguages[i];
          if (has2(options.languages, languageToTry)) {
            return options.languages[languageToTry];
          }
          if (has2(LANGUAGES, languageToTry)) {
            return LANGUAGES[languageToTry];
          }
        }
        throw new Error("No language found.");
      }
      function renderPiece(piece, language2, options) {
        var unitName = piece.unitName;
        var unitCount = piece.unitCount;
        var spacer = options.spacer;
        var maxDecimalPoints = options.maxDecimalPoints;
        var decimal;
        if (has2(options, "decimal")) {
          decimal = options.decimal;
        } else if (has2(language2, "decimal")) {
          decimal = language2.decimal;
        } else {
          decimal = ".";
        }
        var digitReplacements;
        if ("digitReplacements" in options) {
          digitReplacements = options.digitReplacements;
        } else if ("_digitReplacements" in language2) {
          digitReplacements = language2._digitReplacements;
        }
        var formattedCount;
        var normalizedUnitCount = maxDecimalPoints === void 0 ? unitCount : Math.floor(unitCount * Math.pow(10, maxDecimalPoints)) / Math.pow(10, maxDecimalPoints);
        var countStr = normalizedUnitCount.toString();
        if (language2._hideCountIf2 && unitCount === 2) {
          formattedCount = "";
          spacer = "";
        } else {
          if (digitReplacements) {
            formattedCount = "";
            for (var i = 0; i < countStr.length; i++) {
              var character = countStr[i];
              if (character === ".") {
                formattedCount += decimal;
              } else {
                formattedCount += digitReplacements[
                  /** @type {"0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"} */
                  character
                ];
              }
            }
          } else {
            formattedCount = countStr.replace(".", decimal);
          }
        }
        var languageWord = language2[unitName];
        var word;
        if (typeof languageWord === "function") {
          word = languageWord(unitCount);
        } else {
          word = languageWord;
        }
        if (language2._numberFirst) {
          return word + spacer + formattedCount;
        }
        return formattedCount + spacer + word;
      }
      function getPieces(ms, options) {
        var unitName;
        var i;
        var unitCount;
        var msRemaining;
        var units = options.units;
        var unitMeasures = options.unitMeasures;
        var largest = "largest" in options ? options.largest : Infinity;
        if (!units.length) return [];
        var unitCounts = {};
        msRemaining = ms;
        for (i = 0; i < units.length; i++) {
          unitName = units[i];
          var unitMs = unitMeasures[unitName];
          var isLast = i === units.length - 1;
          unitCount = isLast ? msRemaining / unitMs : Math.floor(msRemaining / unitMs);
          unitCounts[unitName] = unitCount;
          msRemaining -= unitCount * unitMs;
        }
        if (options.round) {
          var unitsRemainingBeforeRound = largest;
          for (i = 0; i < units.length; i++) {
            unitName = units[i];
            unitCount = unitCounts[unitName];
            if (unitCount === 0) continue;
            unitsRemainingBeforeRound--;
            if (unitsRemainingBeforeRound === 0) {
              for (var j = i + 1; j < units.length; j++) {
                var smallerUnitName = units[j];
                var smallerUnitCount = unitCounts[smallerUnitName];
                unitCounts[unitName] += smallerUnitCount * unitMeasures[smallerUnitName] / unitMeasures[unitName];
                unitCounts[smallerUnitName] = 0;
              }
              break;
            }
          }
          for (i = units.length - 1; i >= 0; i--) {
            unitName = units[i];
            unitCount = unitCounts[unitName];
            if (unitCount === 0) continue;
            var rounded = Math.round(unitCount);
            unitCounts[unitName] = rounded;
            if (i === 0) break;
            var previousUnitName = units[i - 1];
            var previousUnitMs = unitMeasures[previousUnitName];
            var amountOfPreviousUnit = Math.floor(
              rounded * unitMeasures[unitName] / previousUnitMs
            );
            if (amountOfPreviousUnit) {
              unitCounts[previousUnitName] += amountOfPreviousUnit;
              unitCounts[unitName] = 0;
            } else {
              break;
            }
          }
        }
        var result = [];
        for (i = 0; i < units.length && result.length < largest; i++) {
          unitName = units[i];
          unitCount = unitCounts[unitName];
          if (unitCount) {
            result.push({ unitName, unitCount });
          }
        }
        return result;
      }
      function formatPieces(pieces, options) {
        var language2 = getLanguage(options);
        if (!pieces.length) {
          var units = options.units;
          var smallestUnitName = units[units.length - 1];
          return renderPiece(
            { unitName: smallestUnitName, unitCount: 0 },
            language2,
            options
          );
        }
        var conjunction = options.conjunction;
        var serialComma = options.serialComma;
        var delimiter;
        if (has2(options, "delimiter")) {
          delimiter = options.delimiter;
        } else if (has2(language2, "delimiter")) {
          delimiter = language2.delimiter;
        } else {
          delimiter = ", ";
        }
        var renderedPieces = [];
        for (var i = 0; i < pieces.length; i++) {
          renderedPieces.push(renderPiece(pieces[i], language2, options));
        }
        if (!conjunction || pieces.length === 1) {
          return renderedPieces.join(delimiter);
        }
        if (pieces.length === 2) {
          return renderedPieces.join(conjunction);
        }
        return renderedPieces.slice(0, -1).join(delimiter) + (serialComma ? "," : "") + conjunction + renderedPieces.slice(-1);
      }
      function humanizer(passedOptions) {
        var result = function humanizer2(ms, humanizerOptions) {
          ms = Math.abs(ms);
          var options = assign({}, result, humanizerOptions || {});
          var pieces = getPieces(ms, options);
          return formatPieces(pieces, options);
        };
        return assign(
          result,
          {
            language: "en",
            spacer: " ",
            conjunction: "",
            serialComma: true,
            units: ["y", "mo", "w", "d", "h", "m", "s"],
            languages: {},
            round: false,
            unitMeasures: {
              y: 315576e5,
              mo: 26298e5,
              w: 6048e5,
              d: 864e5,
              h: 36e5,
              m: 6e4,
              s: 1e3,
              ms: 1
            }
          },
          passedOptions
        );
      }
      var humanizeDuration2 = assign(humanizer({}), {
        getSupportedLanguages: function getSupportedLanguages() {
          var result = [];
          for (var language2 in LANGUAGES) {
            if (has2(LANGUAGES, language2) && language2 !== "gr") {
              result.push(language2);
            }
          }
          return result;
        },
        humanizer
      });
      if (typeof define === "function" && define.amd) {
        define(function() {
          return humanizeDuration2;
        });
      } else if (typeof module !== "undefined" && module.exports) {
        module.exports = humanizeDuration2;
      } else {
        this.humanizeDuration = humanizeDuration2;
      }
    })();
  }
});

// ../../node_modules/@opentelemetry/semantic-conventions/build/src/internal/utils.js
var require_utils = __commonJS({
  "../../node_modules/@opentelemetry/semantic-conventions/build/src/internal/utils.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createConstMap = void 0;
    // @__NO_SIDE_EFFECTS__
    function createConstMap(values) {
      let res = {};
      const len = values.length;
      for (let lp = 0; lp < len; lp++) {
        const val = values[lp];
        if (val) {
          res[String(val).toUpperCase().replace(/[-.]/g, "_")] = val;
        }
      }
      return res;
    }
    exports.createConstMap = createConstMap;
  }
});

// ../../node_modules/@opentelemetry/semantic-conventions/build/src/trace/SemanticAttributes.js
var require_SemanticAttributes = __commonJS({
  "../../node_modules/@opentelemetry/semantic-conventions/build/src/trace/SemanticAttributes.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SEMATTRS_NET_HOST_CARRIER_ICC = exports.SEMATTRS_NET_HOST_CARRIER_MNC = exports.SEMATTRS_NET_HOST_CARRIER_MCC = exports.SEMATTRS_NET_HOST_CARRIER_NAME = exports.SEMATTRS_NET_HOST_CONNECTION_SUBTYPE = exports.SEMATTRS_NET_HOST_CONNECTION_TYPE = exports.SEMATTRS_NET_HOST_NAME = exports.SEMATTRS_NET_HOST_PORT = exports.SEMATTRS_NET_HOST_IP = exports.SEMATTRS_NET_PEER_NAME = exports.SEMATTRS_NET_PEER_PORT = exports.SEMATTRS_NET_PEER_IP = exports.SEMATTRS_NET_TRANSPORT = exports.SEMATTRS_FAAS_INVOKED_REGION = exports.SEMATTRS_FAAS_INVOKED_PROVIDER = exports.SEMATTRS_FAAS_INVOKED_NAME = exports.SEMATTRS_FAAS_COLDSTART = exports.SEMATTRS_FAAS_CRON = exports.SEMATTRS_FAAS_TIME = exports.SEMATTRS_FAAS_DOCUMENT_NAME = exports.SEMATTRS_FAAS_DOCUMENT_TIME = exports.SEMATTRS_FAAS_DOCUMENT_OPERATION = exports.SEMATTRS_FAAS_DOCUMENT_COLLECTION = exports.SEMATTRS_FAAS_EXECUTION = exports.SEMATTRS_FAAS_TRIGGER = exports.SEMATTRS_EXCEPTION_ESCAPED = exports.SEMATTRS_EXCEPTION_STACKTRACE = exports.SEMATTRS_EXCEPTION_MESSAGE = exports.SEMATTRS_EXCEPTION_TYPE = exports.SEMATTRS_DB_SQL_TABLE = exports.SEMATTRS_DB_MONGODB_COLLECTION = exports.SEMATTRS_DB_REDIS_DATABASE_INDEX = exports.SEMATTRS_DB_HBASE_NAMESPACE = exports.SEMATTRS_DB_CASSANDRA_COORDINATOR_DC = exports.SEMATTRS_DB_CASSANDRA_COORDINATOR_ID = exports.SEMATTRS_DB_CASSANDRA_SPECULATIVE_EXECUTION_COUNT = exports.SEMATTRS_DB_CASSANDRA_IDEMPOTENCE = exports.SEMATTRS_DB_CASSANDRA_TABLE = exports.SEMATTRS_DB_CASSANDRA_CONSISTENCY_LEVEL = exports.SEMATTRS_DB_CASSANDRA_PAGE_SIZE = exports.SEMATTRS_DB_CASSANDRA_KEYSPACE = exports.SEMATTRS_DB_MSSQL_INSTANCE_NAME = exports.SEMATTRS_DB_OPERATION = exports.SEMATTRS_DB_STATEMENT = exports.SEMATTRS_DB_NAME = exports.SEMATTRS_DB_JDBC_DRIVER_CLASSNAME = exports.SEMATTRS_DB_USER = exports.SEMATTRS_DB_CONNECTION_STRING = exports.SEMATTRS_DB_SYSTEM = exports.SEMATTRS_AWS_LAMBDA_INVOKED_ARN = void 0;
    exports.SEMATTRS_MESSAGING_DESTINATION_KIND = exports.SEMATTRS_MESSAGING_DESTINATION = exports.SEMATTRS_MESSAGING_SYSTEM = exports.SEMATTRS_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEX_UPDATES = exports.SEMATTRS_AWS_DYNAMODB_ATTRIBUTE_DEFINITIONS = exports.SEMATTRS_AWS_DYNAMODB_SCANNED_COUNT = exports.SEMATTRS_AWS_DYNAMODB_COUNT = exports.SEMATTRS_AWS_DYNAMODB_TOTAL_SEGMENTS = exports.SEMATTRS_AWS_DYNAMODB_SEGMENT = exports.SEMATTRS_AWS_DYNAMODB_SCAN_FORWARD = exports.SEMATTRS_AWS_DYNAMODB_TABLE_COUNT = exports.SEMATTRS_AWS_DYNAMODB_EXCLUSIVE_START_TABLE = exports.SEMATTRS_AWS_DYNAMODB_LOCAL_SECONDARY_INDEXES = exports.SEMATTRS_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEXES = exports.SEMATTRS_AWS_DYNAMODB_SELECT = exports.SEMATTRS_AWS_DYNAMODB_INDEX_NAME = exports.SEMATTRS_AWS_DYNAMODB_ATTRIBUTES_TO_GET = exports.SEMATTRS_AWS_DYNAMODB_LIMIT = exports.SEMATTRS_AWS_DYNAMODB_PROJECTION = exports.SEMATTRS_AWS_DYNAMODB_CONSISTENT_READ = exports.SEMATTRS_AWS_DYNAMODB_PROVISIONED_WRITE_CAPACITY = exports.SEMATTRS_AWS_DYNAMODB_PROVISIONED_READ_CAPACITY = exports.SEMATTRS_AWS_DYNAMODB_ITEM_COLLECTION_METRICS = exports.SEMATTRS_AWS_DYNAMODB_CONSUMED_CAPACITY = exports.SEMATTRS_AWS_DYNAMODB_TABLE_NAMES = exports.SEMATTRS_HTTP_CLIENT_IP = exports.SEMATTRS_HTTP_ROUTE = exports.SEMATTRS_HTTP_SERVER_NAME = exports.SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED = exports.SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH = exports.SEMATTRS_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED = exports.SEMATTRS_HTTP_REQUEST_CONTENT_LENGTH = exports.SEMATTRS_HTTP_USER_AGENT = exports.SEMATTRS_HTTP_FLAVOR = exports.SEMATTRS_HTTP_STATUS_CODE = exports.SEMATTRS_HTTP_SCHEME = exports.SEMATTRS_HTTP_HOST = exports.SEMATTRS_HTTP_TARGET = exports.SEMATTRS_HTTP_URL = exports.SEMATTRS_HTTP_METHOD = exports.SEMATTRS_CODE_LINENO = exports.SEMATTRS_CODE_FILEPATH = exports.SEMATTRS_CODE_NAMESPACE = exports.SEMATTRS_CODE_FUNCTION = exports.SEMATTRS_THREAD_NAME = exports.SEMATTRS_THREAD_ID = exports.SEMATTRS_ENDUSER_SCOPE = exports.SEMATTRS_ENDUSER_ROLE = exports.SEMATTRS_ENDUSER_ID = exports.SEMATTRS_PEER_SERVICE = void 0;
    exports.DBSYSTEMVALUES_FILEMAKER = exports.DBSYSTEMVALUES_DERBY = exports.DBSYSTEMVALUES_FIREBIRD = exports.DBSYSTEMVALUES_ADABAS = exports.DBSYSTEMVALUES_CACHE = exports.DBSYSTEMVALUES_EDB = exports.DBSYSTEMVALUES_FIRSTSQL = exports.DBSYSTEMVALUES_INGRES = exports.DBSYSTEMVALUES_HANADB = exports.DBSYSTEMVALUES_MAXDB = exports.DBSYSTEMVALUES_PROGRESS = exports.DBSYSTEMVALUES_HSQLDB = exports.DBSYSTEMVALUES_CLOUDSCAPE = exports.DBSYSTEMVALUES_HIVE = exports.DBSYSTEMVALUES_REDSHIFT = exports.DBSYSTEMVALUES_POSTGRESQL = exports.DBSYSTEMVALUES_DB2 = exports.DBSYSTEMVALUES_ORACLE = exports.DBSYSTEMVALUES_MYSQL = exports.DBSYSTEMVALUES_MSSQL = exports.DBSYSTEMVALUES_OTHER_SQL = exports.SemanticAttributes = exports.SEMATTRS_MESSAGE_UNCOMPRESSED_SIZE = exports.SEMATTRS_MESSAGE_COMPRESSED_SIZE = exports.SEMATTRS_MESSAGE_ID = exports.SEMATTRS_MESSAGE_TYPE = exports.SEMATTRS_RPC_JSONRPC_ERROR_MESSAGE = exports.SEMATTRS_RPC_JSONRPC_ERROR_CODE = exports.SEMATTRS_RPC_JSONRPC_REQUEST_ID = exports.SEMATTRS_RPC_JSONRPC_VERSION = exports.SEMATTRS_RPC_GRPC_STATUS_CODE = exports.SEMATTRS_RPC_METHOD = exports.SEMATTRS_RPC_SERVICE = exports.SEMATTRS_RPC_SYSTEM = exports.SEMATTRS_MESSAGING_KAFKA_TOMBSTONE = exports.SEMATTRS_MESSAGING_KAFKA_PARTITION = exports.SEMATTRS_MESSAGING_KAFKA_CLIENT_ID = exports.SEMATTRS_MESSAGING_KAFKA_CONSUMER_GROUP = exports.SEMATTRS_MESSAGING_KAFKA_MESSAGE_KEY = exports.SEMATTRS_MESSAGING_RABBITMQ_ROUTING_KEY = exports.SEMATTRS_MESSAGING_CONSUMER_ID = exports.SEMATTRS_MESSAGING_OPERATION = exports.SEMATTRS_MESSAGING_MESSAGE_PAYLOAD_COMPRESSED_SIZE_BYTES = exports.SEMATTRS_MESSAGING_MESSAGE_PAYLOAD_SIZE_BYTES = exports.SEMATTRS_MESSAGING_CONVERSATION_ID = exports.SEMATTRS_MESSAGING_MESSAGE_ID = exports.SEMATTRS_MESSAGING_URL = exports.SEMATTRS_MESSAGING_PROTOCOL_VERSION = exports.SEMATTRS_MESSAGING_PROTOCOL = exports.SEMATTRS_MESSAGING_TEMP_DESTINATION = void 0;
    exports.FAASINVOKEDPROVIDERVALUES_ALIBABA_CLOUD = exports.FaasDocumentOperationValues = exports.FAASDOCUMENTOPERATIONVALUES_DELETE = exports.FAASDOCUMENTOPERATIONVALUES_EDIT = exports.FAASDOCUMENTOPERATIONVALUES_INSERT = exports.FaasTriggerValues = exports.FAASTRIGGERVALUES_OTHER = exports.FAASTRIGGERVALUES_TIMER = exports.FAASTRIGGERVALUES_PUBSUB = exports.FAASTRIGGERVALUES_HTTP = exports.FAASTRIGGERVALUES_DATASOURCE = exports.DbCassandraConsistencyLevelValues = exports.DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_SERIAL = exports.DBCASSANDRACONSISTENCYLEVELVALUES_SERIAL = exports.DBCASSANDRACONSISTENCYLEVELVALUES_ANY = exports.DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_ONE = exports.DBCASSANDRACONSISTENCYLEVELVALUES_THREE = exports.DBCASSANDRACONSISTENCYLEVELVALUES_TWO = exports.DBCASSANDRACONSISTENCYLEVELVALUES_ONE = exports.DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_QUORUM = exports.DBCASSANDRACONSISTENCYLEVELVALUES_QUORUM = exports.DBCASSANDRACONSISTENCYLEVELVALUES_EACH_QUORUM = exports.DBCASSANDRACONSISTENCYLEVELVALUES_ALL = exports.DbSystemValues = exports.DBSYSTEMVALUES_COCKROACHDB = exports.DBSYSTEMVALUES_MEMCACHED = exports.DBSYSTEMVALUES_ELASTICSEARCH = exports.DBSYSTEMVALUES_GEODE = exports.DBSYSTEMVALUES_NEO4J = exports.DBSYSTEMVALUES_DYNAMODB = exports.DBSYSTEMVALUES_COSMOSDB = exports.DBSYSTEMVALUES_COUCHDB = exports.DBSYSTEMVALUES_COUCHBASE = exports.DBSYSTEMVALUES_REDIS = exports.DBSYSTEMVALUES_MONGODB = exports.DBSYSTEMVALUES_HBASE = exports.DBSYSTEMVALUES_CASSANDRA = exports.DBSYSTEMVALUES_COLDFUSION = exports.DBSYSTEMVALUES_H2 = exports.DBSYSTEMVALUES_VERTICA = exports.DBSYSTEMVALUES_TERADATA = exports.DBSYSTEMVALUES_SYBASE = exports.DBSYSTEMVALUES_SQLITE = exports.DBSYSTEMVALUES_POINTBASE = exports.DBSYSTEMVALUES_PERVASIVE = exports.DBSYSTEMVALUES_NETEZZA = exports.DBSYSTEMVALUES_MARIADB = exports.DBSYSTEMVALUES_INTERBASE = exports.DBSYSTEMVALUES_INSTANTDB = exports.DBSYSTEMVALUES_INFORMIX = void 0;
    exports.MESSAGINGOPERATIONVALUES_RECEIVE = exports.MessagingDestinationKindValues = exports.MESSAGINGDESTINATIONKINDVALUES_TOPIC = exports.MESSAGINGDESTINATIONKINDVALUES_QUEUE = exports.HttpFlavorValues = exports.HTTPFLAVORVALUES_QUIC = exports.HTTPFLAVORVALUES_SPDY = exports.HTTPFLAVORVALUES_HTTP_2_0 = exports.HTTPFLAVORVALUES_HTTP_1_1 = exports.HTTPFLAVORVALUES_HTTP_1_0 = exports.NetHostConnectionSubtypeValues = exports.NETHOSTCONNECTIONSUBTYPEVALUES_LTE_CA = exports.NETHOSTCONNECTIONSUBTYPEVALUES_NRNSA = exports.NETHOSTCONNECTIONSUBTYPEVALUES_NR = exports.NETHOSTCONNECTIONSUBTYPEVALUES_IWLAN = exports.NETHOSTCONNECTIONSUBTYPEVALUES_TD_SCDMA = exports.NETHOSTCONNECTIONSUBTYPEVALUES_GSM = exports.NETHOSTCONNECTIONSUBTYPEVALUES_HSPAP = exports.NETHOSTCONNECTIONSUBTYPEVALUES_EHRPD = exports.NETHOSTCONNECTIONSUBTYPEVALUES_LTE = exports.NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_B = exports.NETHOSTCONNECTIONSUBTYPEVALUES_IDEN = exports.NETHOSTCONNECTIONSUBTYPEVALUES_HSPA = exports.NETHOSTCONNECTIONSUBTYPEVALUES_HSUPA = exports.NETHOSTCONNECTIONSUBTYPEVALUES_HSDPA = exports.NETHOSTCONNECTIONSUBTYPEVALUES_CDMA2000_1XRTT = exports.NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_A = exports.NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_0 = exports.NETHOSTCONNECTIONSUBTYPEVALUES_CDMA = exports.NETHOSTCONNECTIONSUBTYPEVALUES_UMTS = exports.NETHOSTCONNECTIONSUBTYPEVALUES_EDGE = exports.NETHOSTCONNECTIONSUBTYPEVALUES_GPRS = exports.NetHostConnectionTypeValues = exports.NETHOSTCONNECTIONTYPEVALUES_UNKNOWN = exports.NETHOSTCONNECTIONTYPEVALUES_UNAVAILABLE = exports.NETHOSTCONNECTIONTYPEVALUES_CELL = exports.NETHOSTCONNECTIONTYPEVALUES_WIRED = exports.NETHOSTCONNECTIONTYPEVALUES_WIFI = exports.NetTransportValues = exports.NETTRANSPORTVALUES_OTHER = exports.NETTRANSPORTVALUES_INPROC = exports.NETTRANSPORTVALUES_PIPE = exports.NETTRANSPORTVALUES_UNIX = exports.NETTRANSPORTVALUES_IP = exports.NETTRANSPORTVALUES_IP_UDP = exports.NETTRANSPORTVALUES_IP_TCP = exports.FaasInvokedProviderValues = exports.FAASINVOKEDPROVIDERVALUES_GCP = exports.FAASINVOKEDPROVIDERVALUES_AZURE = exports.FAASINVOKEDPROVIDERVALUES_AWS = void 0;
    exports.MessageTypeValues = exports.MESSAGETYPEVALUES_RECEIVED = exports.MESSAGETYPEVALUES_SENT = exports.RpcGrpcStatusCodeValues = exports.RPCGRPCSTATUSCODEVALUES_UNAUTHENTICATED = exports.RPCGRPCSTATUSCODEVALUES_DATA_LOSS = exports.RPCGRPCSTATUSCODEVALUES_UNAVAILABLE = exports.RPCGRPCSTATUSCODEVALUES_INTERNAL = exports.RPCGRPCSTATUSCODEVALUES_UNIMPLEMENTED = exports.RPCGRPCSTATUSCODEVALUES_OUT_OF_RANGE = exports.RPCGRPCSTATUSCODEVALUES_ABORTED = exports.RPCGRPCSTATUSCODEVALUES_FAILED_PRECONDITION = exports.RPCGRPCSTATUSCODEVALUES_RESOURCE_EXHAUSTED = exports.RPCGRPCSTATUSCODEVALUES_PERMISSION_DENIED = exports.RPCGRPCSTATUSCODEVALUES_ALREADY_EXISTS = exports.RPCGRPCSTATUSCODEVALUES_NOT_FOUND = exports.RPCGRPCSTATUSCODEVALUES_DEADLINE_EXCEEDED = exports.RPCGRPCSTATUSCODEVALUES_INVALID_ARGUMENT = exports.RPCGRPCSTATUSCODEVALUES_UNKNOWN = exports.RPCGRPCSTATUSCODEVALUES_CANCELLED = exports.RPCGRPCSTATUSCODEVALUES_OK = exports.MessagingOperationValues = exports.MESSAGINGOPERATIONVALUES_PROCESS = void 0;
    var utils_1 = require_utils();
    var TMP_AWS_LAMBDA_INVOKED_ARN = "aws.lambda.invoked_arn";
    var TMP_DB_SYSTEM = "db.system";
    var TMP_DB_CONNECTION_STRING = "db.connection_string";
    var TMP_DB_USER = "db.user";
    var TMP_DB_JDBC_DRIVER_CLASSNAME = "db.jdbc.driver_classname";
    var TMP_DB_NAME = "db.name";
    var TMP_DB_STATEMENT = "db.statement";
    var TMP_DB_OPERATION = "db.operation";
    var TMP_DB_MSSQL_INSTANCE_NAME = "db.mssql.instance_name";
    var TMP_DB_CASSANDRA_KEYSPACE = "db.cassandra.keyspace";
    var TMP_DB_CASSANDRA_PAGE_SIZE = "db.cassandra.page_size";
    var TMP_DB_CASSANDRA_CONSISTENCY_LEVEL = "db.cassandra.consistency_level";
    var TMP_DB_CASSANDRA_TABLE = "db.cassandra.table";
    var TMP_DB_CASSANDRA_IDEMPOTENCE = "db.cassandra.idempotence";
    var TMP_DB_CASSANDRA_SPECULATIVE_EXECUTION_COUNT = "db.cassandra.speculative_execution_count";
    var TMP_DB_CASSANDRA_COORDINATOR_ID = "db.cassandra.coordinator.id";
    var TMP_DB_CASSANDRA_COORDINATOR_DC = "db.cassandra.coordinator.dc";
    var TMP_DB_HBASE_NAMESPACE = "db.hbase.namespace";
    var TMP_DB_REDIS_DATABASE_INDEX = "db.redis.database_index";
    var TMP_DB_MONGODB_COLLECTION = "db.mongodb.collection";
    var TMP_DB_SQL_TABLE = "db.sql.table";
    var TMP_EXCEPTION_TYPE = "exception.type";
    var TMP_EXCEPTION_MESSAGE = "exception.message";
    var TMP_EXCEPTION_STACKTRACE = "exception.stacktrace";
    var TMP_EXCEPTION_ESCAPED = "exception.escaped";
    var TMP_FAAS_TRIGGER = "faas.trigger";
    var TMP_FAAS_EXECUTION = "faas.execution";
    var TMP_FAAS_DOCUMENT_COLLECTION = "faas.document.collection";
    var TMP_FAAS_DOCUMENT_OPERATION = "faas.document.operation";
    var TMP_FAAS_DOCUMENT_TIME = "faas.document.time";
    var TMP_FAAS_DOCUMENT_NAME = "faas.document.name";
    var TMP_FAAS_TIME = "faas.time";
    var TMP_FAAS_CRON = "faas.cron";
    var TMP_FAAS_COLDSTART = "faas.coldstart";
    var TMP_FAAS_INVOKED_NAME = "faas.invoked_name";
    var TMP_FAAS_INVOKED_PROVIDER = "faas.invoked_provider";
    var TMP_FAAS_INVOKED_REGION = "faas.invoked_region";
    var TMP_NET_TRANSPORT = "net.transport";
    var TMP_NET_PEER_IP = "net.peer.ip";
    var TMP_NET_PEER_PORT = "net.peer.port";
    var TMP_NET_PEER_NAME = "net.peer.name";
    var TMP_NET_HOST_IP = "net.host.ip";
    var TMP_NET_HOST_PORT = "net.host.port";
    var TMP_NET_HOST_NAME = "net.host.name";
    var TMP_NET_HOST_CONNECTION_TYPE = "net.host.connection.type";
    var TMP_NET_HOST_CONNECTION_SUBTYPE = "net.host.connection.subtype";
    var TMP_NET_HOST_CARRIER_NAME = "net.host.carrier.name";
    var TMP_NET_HOST_CARRIER_MCC = "net.host.carrier.mcc";
    var TMP_NET_HOST_CARRIER_MNC = "net.host.carrier.mnc";
    var TMP_NET_HOST_CARRIER_ICC = "net.host.carrier.icc";
    var TMP_PEER_SERVICE = "peer.service";
    var TMP_ENDUSER_ID = "enduser.id";
    var TMP_ENDUSER_ROLE = "enduser.role";
    var TMP_ENDUSER_SCOPE = "enduser.scope";
    var TMP_THREAD_ID = "thread.id";
    var TMP_THREAD_NAME = "thread.name";
    var TMP_CODE_FUNCTION = "code.function";
    var TMP_CODE_NAMESPACE = "code.namespace";
    var TMP_CODE_FILEPATH = "code.filepath";
    var TMP_CODE_LINENO = "code.lineno";
    var TMP_HTTP_METHOD = "http.method";
    var TMP_HTTP_URL = "http.url";
    var TMP_HTTP_TARGET = "http.target";
    var TMP_HTTP_HOST = "http.host";
    var TMP_HTTP_SCHEME = "http.scheme";
    var TMP_HTTP_STATUS_CODE = "http.status_code";
    var TMP_HTTP_FLAVOR = "http.flavor";
    var TMP_HTTP_USER_AGENT = "http.user_agent";
    var TMP_HTTP_REQUEST_CONTENT_LENGTH = "http.request_content_length";
    var TMP_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED = "http.request_content_length_uncompressed";
    var TMP_HTTP_RESPONSE_CONTENT_LENGTH = "http.response_content_length";
    var TMP_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED = "http.response_content_length_uncompressed";
    var TMP_HTTP_SERVER_NAME = "http.server_name";
    var TMP_HTTP_ROUTE = "http.route";
    var TMP_HTTP_CLIENT_IP = "http.client_ip";
    var TMP_AWS_DYNAMODB_TABLE_NAMES = "aws.dynamodb.table_names";
    var TMP_AWS_DYNAMODB_CONSUMED_CAPACITY = "aws.dynamodb.consumed_capacity";
    var TMP_AWS_DYNAMODB_ITEM_COLLECTION_METRICS = "aws.dynamodb.item_collection_metrics";
    var TMP_AWS_DYNAMODB_PROVISIONED_READ_CAPACITY = "aws.dynamodb.provisioned_read_capacity";
    var TMP_AWS_DYNAMODB_PROVISIONED_WRITE_CAPACITY = "aws.dynamodb.provisioned_write_capacity";
    var TMP_AWS_DYNAMODB_CONSISTENT_READ = "aws.dynamodb.consistent_read";
    var TMP_AWS_DYNAMODB_PROJECTION = "aws.dynamodb.projection";
    var TMP_AWS_DYNAMODB_LIMIT = "aws.dynamodb.limit";
    var TMP_AWS_DYNAMODB_ATTRIBUTES_TO_GET = "aws.dynamodb.attributes_to_get";
    var TMP_AWS_DYNAMODB_INDEX_NAME = "aws.dynamodb.index_name";
    var TMP_AWS_DYNAMODB_SELECT = "aws.dynamodb.select";
    var TMP_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEXES = "aws.dynamodb.global_secondary_indexes";
    var TMP_AWS_DYNAMODB_LOCAL_SECONDARY_INDEXES = "aws.dynamodb.local_secondary_indexes";
    var TMP_AWS_DYNAMODB_EXCLUSIVE_START_TABLE = "aws.dynamodb.exclusive_start_table";
    var TMP_AWS_DYNAMODB_TABLE_COUNT = "aws.dynamodb.table_count";
    var TMP_AWS_DYNAMODB_SCAN_FORWARD = "aws.dynamodb.scan_forward";
    var TMP_AWS_DYNAMODB_SEGMENT = "aws.dynamodb.segment";
    var TMP_AWS_DYNAMODB_TOTAL_SEGMENTS = "aws.dynamodb.total_segments";
    var TMP_AWS_DYNAMODB_COUNT = "aws.dynamodb.count";
    var TMP_AWS_DYNAMODB_SCANNED_COUNT = "aws.dynamodb.scanned_count";
    var TMP_AWS_DYNAMODB_ATTRIBUTE_DEFINITIONS = "aws.dynamodb.attribute_definitions";
    var TMP_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEX_UPDATES = "aws.dynamodb.global_secondary_index_updates";
    var TMP_MESSAGING_SYSTEM = "messaging.system";
    var TMP_MESSAGING_DESTINATION = "messaging.destination";
    var TMP_MESSAGING_DESTINATION_KIND = "messaging.destination_kind";
    var TMP_MESSAGING_TEMP_DESTINATION = "messaging.temp_destination";
    var TMP_MESSAGING_PROTOCOL = "messaging.protocol";
    var TMP_MESSAGING_PROTOCOL_VERSION = "messaging.protocol_version";
    var TMP_MESSAGING_URL = "messaging.url";
    var TMP_MESSAGING_MESSAGE_ID = "messaging.message_id";
    var TMP_MESSAGING_CONVERSATION_ID = "messaging.conversation_id";
    var TMP_MESSAGING_MESSAGE_PAYLOAD_SIZE_BYTES = "messaging.message_payload_size_bytes";
    var TMP_MESSAGING_MESSAGE_PAYLOAD_COMPRESSED_SIZE_BYTES = "messaging.message_payload_compressed_size_bytes";
    var TMP_MESSAGING_OPERATION = "messaging.operation";
    var TMP_MESSAGING_CONSUMER_ID = "messaging.consumer_id";
    var TMP_MESSAGING_RABBITMQ_ROUTING_KEY = "messaging.rabbitmq.routing_key";
    var TMP_MESSAGING_KAFKA_MESSAGE_KEY = "messaging.kafka.message_key";
    var TMP_MESSAGING_KAFKA_CONSUMER_GROUP = "messaging.kafka.consumer_group";
    var TMP_MESSAGING_KAFKA_CLIENT_ID = "messaging.kafka.client_id";
    var TMP_MESSAGING_KAFKA_PARTITION = "messaging.kafka.partition";
    var TMP_MESSAGING_KAFKA_TOMBSTONE = "messaging.kafka.tombstone";
    var TMP_RPC_SYSTEM = "rpc.system";
    var TMP_RPC_SERVICE = "rpc.service";
    var TMP_RPC_METHOD = "rpc.method";
    var TMP_RPC_GRPC_STATUS_CODE = "rpc.grpc.status_code";
    var TMP_RPC_JSONRPC_VERSION = "rpc.jsonrpc.version";
    var TMP_RPC_JSONRPC_REQUEST_ID = "rpc.jsonrpc.request_id";
    var TMP_RPC_JSONRPC_ERROR_CODE = "rpc.jsonrpc.error_code";
    var TMP_RPC_JSONRPC_ERROR_MESSAGE = "rpc.jsonrpc.error_message";
    var TMP_MESSAGE_TYPE = "message.type";
    var TMP_MESSAGE_ID = "message.id";
    var TMP_MESSAGE_COMPRESSED_SIZE = "message.compressed_size";
    var TMP_MESSAGE_UNCOMPRESSED_SIZE = "message.uncompressed_size";
    exports.SEMATTRS_AWS_LAMBDA_INVOKED_ARN = TMP_AWS_LAMBDA_INVOKED_ARN;
    exports.SEMATTRS_DB_SYSTEM = TMP_DB_SYSTEM;
    exports.SEMATTRS_DB_CONNECTION_STRING = TMP_DB_CONNECTION_STRING;
    exports.SEMATTRS_DB_USER = TMP_DB_USER;
    exports.SEMATTRS_DB_JDBC_DRIVER_CLASSNAME = TMP_DB_JDBC_DRIVER_CLASSNAME;
    exports.SEMATTRS_DB_NAME = TMP_DB_NAME;
    exports.SEMATTRS_DB_STATEMENT = TMP_DB_STATEMENT;
    exports.SEMATTRS_DB_OPERATION = TMP_DB_OPERATION;
    exports.SEMATTRS_DB_MSSQL_INSTANCE_NAME = TMP_DB_MSSQL_INSTANCE_NAME;
    exports.SEMATTRS_DB_CASSANDRA_KEYSPACE = TMP_DB_CASSANDRA_KEYSPACE;
    exports.SEMATTRS_DB_CASSANDRA_PAGE_SIZE = TMP_DB_CASSANDRA_PAGE_SIZE;
    exports.SEMATTRS_DB_CASSANDRA_CONSISTENCY_LEVEL = TMP_DB_CASSANDRA_CONSISTENCY_LEVEL;
    exports.SEMATTRS_DB_CASSANDRA_TABLE = TMP_DB_CASSANDRA_TABLE;
    exports.SEMATTRS_DB_CASSANDRA_IDEMPOTENCE = TMP_DB_CASSANDRA_IDEMPOTENCE;
    exports.SEMATTRS_DB_CASSANDRA_SPECULATIVE_EXECUTION_COUNT = TMP_DB_CASSANDRA_SPECULATIVE_EXECUTION_COUNT;
    exports.SEMATTRS_DB_CASSANDRA_COORDINATOR_ID = TMP_DB_CASSANDRA_COORDINATOR_ID;
    exports.SEMATTRS_DB_CASSANDRA_COORDINATOR_DC = TMP_DB_CASSANDRA_COORDINATOR_DC;
    exports.SEMATTRS_DB_HBASE_NAMESPACE = TMP_DB_HBASE_NAMESPACE;
    exports.SEMATTRS_DB_REDIS_DATABASE_INDEX = TMP_DB_REDIS_DATABASE_INDEX;
    exports.SEMATTRS_DB_MONGODB_COLLECTION = TMP_DB_MONGODB_COLLECTION;
    exports.SEMATTRS_DB_SQL_TABLE = TMP_DB_SQL_TABLE;
    exports.SEMATTRS_EXCEPTION_TYPE = TMP_EXCEPTION_TYPE;
    exports.SEMATTRS_EXCEPTION_MESSAGE = TMP_EXCEPTION_MESSAGE;
    exports.SEMATTRS_EXCEPTION_STACKTRACE = TMP_EXCEPTION_STACKTRACE;
    exports.SEMATTRS_EXCEPTION_ESCAPED = TMP_EXCEPTION_ESCAPED;
    exports.SEMATTRS_FAAS_TRIGGER = TMP_FAAS_TRIGGER;
    exports.SEMATTRS_FAAS_EXECUTION = TMP_FAAS_EXECUTION;
    exports.SEMATTRS_FAAS_DOCUMENT_COLLECTION = TMP_FAAS_DOCUMENT_COLLECTION;
    exports.SEMATTRS_FAAS_DOCUMENT_OPERATION = TMP_FAAS_DOCUMENT_OPERATION;
    exports.SEMATTRS_FAAS_DOCUMENT_TIME = TMP_FAAS_DOCUMENT_TIME;
    exports.SEMATTRS_FAAS_DOCUMENT_NAME = TMP_FAAS_DOCUMENT_NAME;
    exports.SEMATTRS_FAAS_TIME = TMP_FAAS_TIME;
    exports.SEMATTRS_FAAS_CRON = TMP_FAAS_CRON;
    exports.SEMATTRS_FAAS_COLDSTART = TMP_FAAS_COLDSTART;
    exports.SEMATTRS_FAAS_INVOKED_NAME = TMP_FAAS_INVOKED_NAME;
    exports.SEMATTRS_FAAS_INVOKED_PROVIDER = TMP_FAAS_INVOKED_PROVIDER;
    exports.SEMATTRS_FAAS_INVOKED_REGION = TMP_FAAS_INVOKED_REGION;
    exports.SEMATTRS_NET_TRANSPORT = TMP_NET_TRANSPORT;
    exports.SEMATTRS_NET_PEER_IP = TMP_NET_PEER_IP;
    exports.SEMATTRS_NET_PEER_PORT = TMP_NET_PEER_PORT;
    exports.SEMATTRS_NET_PEER_NAME = TMP_NET_PEER_NAME;
    exports.SEMATTRS_NET_HOST_IP = TMP_NET_HOST_IP;
    exports.SEMATTRS_NET_HOST_PORT = TMP_NET_HOST_PORT;
    exports.SEMATTRS_NET_HOST_NAME = TMP_NET_HOST_NAME;
    exports.SEMATTRS_NET_HOST_CONNECTION_TYPE = TMP_NET_HOST_CONNECTION_TYPE;
    exports.SEMATTRS_NET_HOST_CONNECTION_SUBTYPE = TMP_NET_HOST_CONNECTION_SUBTYPE;
    exports.SEMATTRS_NET_HOST_CARRIER_NAME = TMP_NET_HOST_CARRIER_NAME;
    exports.SEMATTRS_NET_HOST_CARRIER_MCC = TMP_NET_HOST_CARRIER_MCC;
    exports.SEMATTRS_NET_HOST_CARRIER_MNC = TMP_NET_HOST_CARRIER_MNC;
    exports.SEMATTRS_NET_HOST_CARRIER_ICC = TMP_NET_HOST_CARRIER_ICC;
    exports.SEMATTRS_PEER_SERVICE = TMP_PEER_SERVICE;
    exports.SEMATTRS_ENDUSER_ID = TMP_ENDUSER_ID;
    exports.SEMATTRS_ENDUSER_ROLE = TMP_ENDUSER_ROLE;
    exports.SEMATTRS_ENDUSER_SCOPE = TMP_ENDUSER_SCOPE;
    exports.SEMATTRS_THREAD_ID = TMP_THREAD_ID;
    exports.SEMATTRS_THREAD_NAME = TMP_THREAD_NAME;
    exports.SEMATTRS_CODE_FUNCTION = TMP_CODE_FUNCTION;
    exports.SEMATTRS_CODE_NAMESPACE = TMP_CODE_NAMESPACE;
    exports.SEMATTRS_CODE_FILEPATH = TMP_CODE_FILEPATH;
    exports.SEMATTRS_CODE_LINENO = TMP_CODE_LINENO;
    exports.SEMATTRS_HTTP_METHOD = TMP_HTTP_METHOD;
    exports.SEMATTRS_HTTP_URL = TMP_HTTP_URL;
    exports.SEMATTRS_HTTP_TARGET = TMP_HTTP_TARGET;
    exports.SEMATTRS_HTTP_HOST = TMP_HTTP_HOST;
    exports.SEMATTRS_HTTP_SCHEME = TMP_HTTP_SCHEME;
    exports.SEMATTRS_HTTP_STATUS_CODE = TMP_HTTP_STATUS_CODE;
    exports.SEMATTRS_HTTP_FLAVOR = TMP_HTTP_FLAVOR;
    exports.SEMATTRS_HTTP_USER_AGENT = TMP_HTTP_USER_AGENT;
    exports.SEMATTRS_HTTP_REQUEST_CONTENT_LENGTH = TMP_HTTP_REQUEST_CONTENT_LENGTH;
    exports.SEMATTRS_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED = TMP_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED;
    exports.SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH = TMP_HTTP_RESPONSE_CONTENT_LENGTH;
    exports.SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED = TMP_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED;
    exports.SEMATTRS_HTTP_SERVER_NAME = TMP_HTTP_SERVER_NAME;
    exports.SEMATTRS_HTTP_ROUTE = TMP_HTTP_ROUTE;
    exports.SEMATTRS_HTTP_CLIENT_IP = TMP_HTTP_CLIENT_IP;
    exports.SEMATTRS_AWS_DYNAMODB_TABLE_NAMES = TMP_AWS_DYNAMODB_TABLE_NAMES;
    exports.SEMATTRS_AWS_DYNAMODB_CONSUMED_CAPACITY = TMP_AWS_DYNAMODB_CONSUMED_CAPACITY;
    exports.SEMATTRS_AWS_DYNAMODB_ITEM_COLLECTION_METRICS = TMP_AWS_DYNAMODB_ITEM_COLLECTION_METRICS;
    exports.SEMATTRS_AWS_DYNAMODB_PROVISIONED_READ_CAPACITY = TMP_AWS_DYNAMODB_PROVISIONED_READ_CAPACITY;
    exports.SEMATTRS_AWS_DYNAMODB_PROVISIONED_WRITE_CAPACITY = TMP_AWS_DYNAMODB_PROVISIONED_WRITE_CAPACITY;
    exports.SEMATTRS_AWS_DYNAMODB_CONSISTENT_READ = TMP_AWS_DYNAMODB_CONSISTENT_READ;
    exports.SEMATTRS_AWS_DYNAMODB_PROJECTION = TMP_AWS_DYNAMODB_PROJECTION;
    exports.SEMATTRS_AWS_DYNAMODB_LIMIT = TMP_AWS_DYNAMODB_LIMIT;
    exports.SEMATTRS_AWS_DYNAMODB_ATTRIBUTES_TO_GET = TMP_AWS_DYNAMODB_ATTRIBUTES_TO_GET;
    exports.SEMATTRS_AWS_DYNAMODB_INDEX_NAME = TMP_AWS_DYNAMODB_INDEX_NAME;
    exports.SEMATTRS_AWS_DYNAMODB_SELECT = TMP_AWS_DYNAMODB_SELECT;
    exports.SEMATTRS_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEXES = TMP_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEXES;
    exports.SEMATTRS_AWS_DYNAMODB_LOCAL_SECONDARY_INDEXES = TMP_AWS_DYNAMODB_LOCAL_SECONDARY_INDEXES;
    exports.SEMATTRS_AWS_DYNAMODB_EXCLUSIVE_START_TABLE = TMP_AWS_DYNAMODB_EXCLUSIVE_START_TABLE;
    exports.SEMATTRS_AWS_DYNAMODB_TABLE_COUNT = TMP_AWS_DYNAMODB_TABLE_COUNT;
    exports.SEMATTRS_AWS_DYNAMODB_SCAN_FORWARD = TMP_AWS_DYNAMODB_SCAN_FORWARD;
    exports.SEMATTRS_AWS_DYNAMODB_SEGMENT = TMP_AWS_DYNAMODB_SEGMENT;
    exports.SEMATTRS_AWS_DYNAMODB_TOTAL_SEGMENTS = TMP_AWS_DYNAMODB_TOTAL_SEGMENTS;
    exports.SEMATTRS_AWS_DYNAMODB_COUNT = TMP_AWS_DYNAMODB_COUNT;
    exports.SEMATTRS_AWS_DYNAMODB_SCANNED_COUNT = TMP_AWS_DYNAMODB_SCANNED_COUNT;
    exports.SEMATTRS_AWS_DYNAMODB_ATTRIBUTE_DEFINITIONS = TMP_AWS_DYNAMODB_ATTRIBUTE_DEFINITIONS;
    exports.SEMATTRS_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEX_UPDATES = TMP_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEX_UPDATES;
    exports.SEMATTRS_MESSAGING_SYSTEM = TMP_MESSAGING_SYSTEM;
    exports.SEMATTRS_MESSAGING_DESTINATION = TMP_MESSAGING_DESTINATION;
    exports.SEMATTRS_MESSAGING_DESTINATION_KIND = TMP_MESSAGING_DESTINATION_KIND;
    exports.SEMATTRS_MESSAGING_TEMP_DESTINATION = TMP_MESSAGING_TEMP_DESTINATION;
    exports.SEMATTRS_MESSAGING_PROTOCOL = TMP_MESSAGING_PROTOCOL;
    exports.SEMATTRS_MESSAGING_PROTOCOL_VERSION = TMP_MESSAGING_PROTOCOL_VERSION;
    exports.SEMATTRS_MESSAGING_URL = TMP_MESSAGING_URL;
    exports.SEMATTRS_MESSAGING_MESSAGE_ID = TMP_MESSAGING_MESSAGE_ID;
    exports.SEMATTRS_MESSAGING_CONVERSATION_ID = TMP_MESSAGING_CONVERSATION_ID;
    exports.SEMATTRS_MESSAGING_MESSAGE_PAYLOAD_SIZE_BYTES = TMP_MESSAGING_MESSAGE_PAYLOAD_SIZE_BYTES;
    exports.SEMATTRS_MESSAGING_MESSAGE_PAYLOAD_COMPRESSED_SIZE_BYTES = TMP_MESSAGING_MESSAGE_PAYLOAD_COMPRESSED_SIZE_BYTES;
    exports.SEMATTRS_MESSAGING_OPERATION = TMP_MESSAGING_OPERATION;
    exports.SEMATTRS_MESSAGING_CONSUMER_ID = TMP_MESSAGING_CONSUMER_ID;
    exports.SEMATTRS_MESSAGING_RABBITMQ_ROUTING_KEY = TMP_MESSAGING_RABBITMQ_ROUTING_KEY;
    exports.SEMATTRS_MESSAGING_KAFKA_MESSAGE_KEY = TMP_MESSAGING_KAFKA_MESSAGE_KEY;
    exports.SEMATTRS_MESSAGING_KAFKA_CONSUMER_GROUP = TMP_MESSAGING_KAFKA_CONSUMER_GROUP;
    exports.SEMATTRS_MESSAGING_KAFKA_CLIENT_ID = TMP_MESSAGING_KAFKA_CLIENT_ID;
    exports.SEMATTRS_MESSAGING_KAFKA_PARTITION = TMP_MESSAGING_KAFKA_PARTITION;
    exports.SEMATTRS_MESSAGING_KAFKA_TOMBSTONE = TMP_MESSAGING_KAFKA_TOMBSTONE;
    exports.SEMATTRS_RPC_SYSTEM = TMP_RPC_SYSTEM;
    exports.SEMATTRS_RPC_SERVICE = TMP_RPC_SERVICE;
    exports.SEMATTRS_RPC_METHOD = TMP_RPC_METHOD;
    exports.SEMATTRS_RPC_GRPC_STATUS_CODE = TMP_RPC_GRPC_STATUS_CODE;
    exports.SEMATTRS_RPC_JSONRPC_VERSION = TMP_RPC_JSONRPC_VERSION;
    exports.SEMATTRS_RPC_JSONRPC_REQUEST_ID = TMP_RPC_JSONRPC_REQUEST_ID;
    exports.SEMATTRS_RPC_JSONRPC_ERROR_CODE = TMP_RPC_JSONRPC_ERROR_CODE;
    exports.SEMATTRS_RPC_JSONRPC_ERROR_MESSAGE = TMP_RPC_JSONRPC_ERROR_MESSAGE;
    exports.SEMATTRS_MESSAGE_TYPE = TMP_MESSAGE_TYPE;
    exports.SEMATTRS_MESSAGE_ID = TMP_MESSAGE_ID;
    exports.SEMATTRS_MESSAGE_COMPRESSED_SIZE = TMP_MESSAGE_COMPRESSED_SIZE;
    exports.SEMATTRS_MESSAGE_UNCOMPRESSED_SIZE = TMP_MESSAGE_UNCOMPRESSED_SIZE;
    exports.SemanticAttributes = /* @__PURE__ */ (0, utils_1.createConstMap)([
      TMP_AWS_LAMBDA_INVOKED_ARN,
      TMP_DB_SYSTEM,
      TMP_DB_CONNECTION_STRING,
      TMP_DB_USER,
      TMP_DB_JDBC_DRIVER_CLASSNAME,
      TMP_DB_NAME,
      TMP_DB_STATEMENT,
      TMP_DB_OPERATION,
      TMP_DB_MSSQL_INSTANCE_NAME,
      TMP_DB_CASSANDRA_KEYSPACE,
      TMP_DB_CASSANDRA_PAGE_SIZE,
      TMP_DB_CASSANDRA_CONSISTENCY_LEVEL,
      TMP_DB_CASSANDRA_TABLE,
      TMP_DB_CASSANDRA_IDEMPOTENCE,
      TMP_DB_CASSANDRA_SPECULATIVE_EXECUTION_COUNT,
      TMP_DB_CASSANDRA_COORDINATOR_ID,
      TMP_DB_CASSANDRA_COORDINATOR_DC,
      TMP_DB_HBASE_NAMESPACE,
      TMP_DB_REDIS_DATABASE_INDEX,
      TMP_DB_MONGODB_COLLECTION,
      TMP_DB_SQL_TABLE,
      TMP_EXCEPTION_TYPE,
      TMP_EXCEPTION_MESSAGE,
      TMP_EXCEPTION_STACKTRACE,
      TMP_EXCEPTION_ESCAPED,
      TMP_FAAS_TRIGGER,
      TMP_FAAS_EXECUTION,
      TMP_FAAS_DOCUMENT_COLLECTION,
      TMP_FAAS_DOCUMENT_OPERATION,
      TMP_FAAS_DOCUMENT_TIME,
      TMP_FAAS_DOCUMENT_NAME,
      TMP_FAAS_TIME,
      TMP_FAAS_CRON,
      TMP_FAAS_COLDSTART,
      TMP_FAAS_INVOKED_NAME,
      TMP_FAAS_INVOKED_PROVIDER,
      TMP_FAAS_INVOKED_REGION,
      TMP_NET_TRANSPORT,
      TMP_NET_PEER_IP,
      TMP_NET_PEER_PORT,
      TMP_NET_PEER_NAME,
      TMP_NET_HOST_IP,
      TMP_NET_HOST_PORT,
      TMP_NET_HOST_NAME,
      TMP_NET_HOST_CONNECTION_TYPE,
      TMP_NET_HOST_CONNECTION_SUBTYPE,
      TMP_NET_HOST_CARRIER_NAME,
      TMP_NET_HOST_CARRIER_MCC,
      TMP_NET_HOST_CARRIER_MNC,
      TMP_NET_HOST_CARRIER_ICC,
      TMP_PEER_SERVICE,
      TMP_ENDUSER_ID,
      TMP_ENDUSER_ROLE,
      TMP_ENDUSER_SCOPE,
      TMP_THREAD_ID,
      TMP_THREAD_NAME,
      TMP_CODE_FUNCTION,
      TMP_CODE_NAMESPACE,
      TMP_CODE_FILEPATH,
      TMP_CODE_LINENO,
      TMP_HTTP_METHOD,
      TMP_HTTP_URL,
      TMP_HTTP_TARGET,
      TMP_HTTP_HOST,
      TMP_HTTP_SCHEME,
      TMP_HTTP_STATUS_CODE,
      TMP_HTTP_FLAVOR,
      TMP_HTTP_USER_AGENT,
      TMP_HTTP_REQUEST_CONTENT_LENGTH,
      TMP_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED,
      TMP_HTTP_RESPONSE_CONTENT_LENGTH,
      TMP_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED,
      TMP_HTTP_SERVER_NAME,
      TMP_HTTP_ROUTE,
      TMP_HTTP_CLIENT_IP,
      TMP_AWS_DYNAMODB_TABLE_NAMES,
      TMP_AWS_DYNAMODB_CONSUMED_CAPACITY,
      TMP_AWS_DYNAMODB_ITEM_COLLECTION_METRICS,
      TMP_AWS_DYNAMODB_PROVISIONED_READ_CAPACITY,
      TMP_AWS_DYNAMODB_PROVISIONED_WRITE_CAPACITY,
      TMP_AWS_DYNAMODB_CONSISTENT_READ,
      TMP_AWS_DYNAMODB_PROJECTION,
      TMP_AWS_DYNAMODB_LIMIT,
      TMP_AWS_DYNAMODB_ATTRIBUTES_TO_GET,
      TMP_AWS_DYNAMODB_INDEX_NAME,
      TMP_AWS_DYNAMODB_SELECT,
      TMP_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEXES,
      TMP_AWS_DYNAMODB_LOCAL_SECONDARY_INDEXES,
      TMP_AWS_DYNAMODB_EXCLUSIVE_START_TABLE,
      TMP_AWS_DYNAMODB_TABLE_COUNT,
      TMP_AWS_DYNAMODB_SCAN_FORWARD,
      TMP_AWS_DYNAMODB_SEGMENT,
      TMP_AWS_DYNAMODB_TOTAL_SEGMENTS,
      TMP_AWS_DYNAMODB_COUNT,
      TMP_AWS_DYNAMODB_SCANNED_COUNT,
      TMP_AWS_DYNAMODB_ATTRIBUTE_DEFINITIONS,
      TMP_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEX_UPDATES,
      TMP_MESSAGING_SYSTEM,
      TMP_MESSAGING_DESTINATION,
      TMP_MESSAGING_DESTINATION_KIND,
      TMP_MESSAGING_TEMP_DESTINATION,
      TMP_MESSAGING_PROTOCOL,
      TMP_MESSAGING_PROTOCOL_VERSION,
      TMP_MESSAGING_URL,
      TMP_MESSAGING_MESSAGE_ID,
      TMP_MESSAGING_CONVERSATION_ID,
      TMP_MESSAGING_MESSAGE_PAYLOAD_SIZE_BYTES,
      TMP_MESSAGING_MESSAGE_PAYLOAD_COMPRESSED_SIZE_BYTES,
      TMP_MESSAGING_OPERATION,
      TMP_MESSAGING_CONSUMER_ID,
      TMP_MESSAGING_RABBITMQ_ROUTING_KEY,
      TMP_MESSAGING_KAFKA_MESSAGE_KEY,
      TMP_MESSAGING_KAFKA_CONSUMER_GROUP,
      TMP_MESSAGING_KAFKA_CLIENT_ID,
      TMP_MESSAGING_KAFKA_PARTITION,
      TMP_MESSAGING_KAFKA_TOMBSTONE,
      TMP_RPC_SYSTEM,
      TMP_RPC_SERVICE,
      TMP_RPC_METHOD,
      TMP_RPC_GRPC_STATUS_CODE,
      TMP_RPC_JSONRPC_VERSION,
      TMP_RPC_JSONRPC_REQUEST_ID,
      TMP_RPC_JSONRPC_ERROR_CODE,
      TMP_RPC_JSONRPC_ERROR_MESSAGE,
      TMP_MESSAGE_TYPE,
      TMP_MESSAGE_ID,
      TMP_MESSAGE_COMPRESSED_SIZE,
      TMP_MESSAGE_UNCOMPRESSED_SIZE
    ]);
    var TMP_DBSYSTEMVALUES_OTHER_SQL = "other_sql";
    var TMP_DBSYSTEMVALUES_MSSQL = "mssql";
    var TMP_DBSYSTEMVALUES_MYSQL = "mysql";
    var TMP_DBSYSTEMVALUES_ORACLE = "oracle";
    var TMP_DBSYSTEMVALUES_DB2 = "db2";
    var TMP_DBSYSTEMVALUES_POSTGRESQL = "postgresql";
    var TMP_DBSYSTEMVALUES_REDSHIFT = "redshift";
    var TMP_DBSYSTEMVALUES_HIVE = "hive";
    var TMP_DBSYSTEMVALUES_CLOUDSCAPE = "cloudscape";
    var TMP_DBSYSTEMVALUES_HSQLDB = "hsqldb";
    var TMP_DBSYSTEMVALUES_PROGRESS = "progress";
    var TMP_DBSYSTEMVALUES_MAXDB = "maxdb";
    var TMP_DBSYSTEMVALUES_HANADB = "hanadb";
    var TMP_DBSYSTEMVALUES_INGRES = "ingres";
    var TMP_DBSYSTEMVALUES_FIRSTSQL = "firstsql";
    var TMP_DBSYSTEMVALUES_EDB = "edb";
    var TMP_DBSYSTEMVALUES_CACHE = "cache";
    var TMP_DBSYSTEMVALUES_ADABAS = "adabas";
    var TMP_DBSYSTEMVALUES_FIREBIRD = "firebird";
    var TMP_DBSYSTEMVALUES_DERBY = "derby";
    var TMP_DBSYSTEMVALUES_FILEMAKER = "filemaker";
    var TMP_DBSYSTEMVALUES_INFORMIX = "informix";
    var TMP_DBSYSTEMVALUES_INSTANTDB = "instantdb";
    var TMP_DBSYSTEMVALUES_INTERBASE = "interbase";
    var TMP_DBSYSTEMVALUES_MARIADB = "mariadb";
    var TMP_DBSYSTEMVALUES_NETEZZA = "netezza";
    var TMP_DBSYSTEMVALUES_PERVASIVE = "pervasive";
    var TMP_DBSYSTEMVALUES_POINTBASE = "pointbase";
    var TMP_DBSYSTEMVALUES_SQLITE = "sqlite";
    var TMP_DBSYSTEMVALUES_SYBASE = "sybase";
    var TMP_DBSYSTEMVALUES_TERADATA = "teradata";
    var TMP_DBSYSTEMVALUES_VERTICA = "vertica";
    var TMP_DBSYSTEMVALUES_H2 = "h2";
    var TMP_DBSYSTEMVALUES_COLDFUSION = "coldfusion";
    var TMP_DBSYSTEMVALUES_CASSANDRA = "cassandra";
    var TMP_DBSYSTEMVALUES_HBASE = "hbase";
    var TMP_DBSYSTEMVALUES_MONGODB = "mongodb";
    var TMP_DBSYSTEMVALUES_REDIS = "redis";
    var TMP_DBSYSTEMVALUES_COUCHBASE = "couchbase";
    var TMP_DBSYSTEMVALUES_COUCHDB = "couchdb";
    var TMP_DBSYSTEMVALUES_COSMOSDB = "cosmosdb";
    var TMP_DBSYSTEMVALUES_DYNAMODB = "dynamodb";
    var TMP_DBSYSTEMVALUES_NEO4J = "neo4j";
    var TMP_DBSYSTEMVALUES_GEODE = "geode";
    var TMP_DBSYSTEMVALUES_ELASTICSEARCH = "elasticsearch";
    var TMP_DBSYSTEMVALUES_MEMCACHED = "memcached";
    var TMP_DBSYSTEMVALUES_COCKROACHDB = "cockroachdb";
    exports.DBSYSTEMVALUES_OTHER_SQL = TMP_DBSYSTEMVALUES_OTHER_SQL;
    exports.DBSYSTEMVALUES_MSSQL = TMP_DBSYSTEMVALUES_MSSQL;
    exports.DBSYSTEMVALUES_MYSQL = TMP_DBSYSTEMVALUES_MYSQL;
    exports.DBSYSTEMVALUES_ORACLE = TMP_DBSYSTEMVALUES_ORACLE;
    exports.DBSYSTEMVALUES_DB2 = TMP_DBSYSTEMVALUES_DB2;
    exports.DBSYSTEMVALUES_POSTGRESQL = TMP_DBSYSTEMVALUES_POSTGRESQL;
    exports.DBSYSTEMVALUES_REDSHIFT = TMP_DBSYSTEMVALUES_REDSHIFT;
    exports.DBSYSTEMVALUES_HIVE = TMP_DBSYSTEMVALUES_HIVE;
    exports.DBSYSTEMVALUES_CLOUDSCAPE = TMP_DBSYSTEMVALUES_CLOUDSCAPE;
    exports.DBSYSTEMVALUES_HSQLDB = TMP_DBSYSTEMVALUES_HSQLDB;
    exports.DBSYSTEMVALUES_PROGRESS = TMP_DBSYSTEMVALUES_PROGRESS;
    exports.DBSYSTEMVALUES_MAXDB = TMP_DBSYSTEMVALUES_MAXDB;
    exports.DBSYSTEMVALUES_HANADB = TMP_DBSYSTEMVALUES_HANADB;
    exports.DBSYSTEMVALUES_INGRES = TMP_DBSYSTEMVALUES_INGRES;
    exports.DBSYSTEMVALUES_FIRSTSQL = TMP_DBSYSTEMVALUES_FIRSTSQL;
    exports.DBSYSTEMVALUES_EDB = TMP_DBSYSTEMVALUES_EDB;
    exports.DBSYSTEMVALUES_CACHE = TMP_DBSYSTEMVALUES_CACHE;
    exports.DBSYSTEMVALUES_ADABAS = TMP_DBSYSTEMVALUES_ADABAS;
    exports.DBSYSTEMVALUES_FIREBIRD = TMP_DBSYSTEMVALUES_FIREBIRD;
    exports.DBSYSTEMVALUES_DERBY = TMP_DBSYSTEMVALUES_DERBY;
    exports.DBSYSTEMVALUES_FILEMAKER = TMP_DBSYSTEMVALUES_FILEMAKER;
    exports.DBSYSTEMVALUES_INFORMIX = TMP_DBSYSTEMVALUES_INFORMIX;
    exports.DBSYSTEMVALUES_INSTANTDB = TMP_DBSYSTEMVALUES_INSTANTDB;
    exports.DBSYSTEMVALUES_INTERBASE = TMP_DBSYSTEMVALUES_INTERBASE;
    exports.DBSYSTEMVALUES_MARIADB = TMP_DBSYSTEMVALUES_MARIADB;
    exports.DBSYSTEMVALUES_NETEZZA = TMP_DBSYSTEMVALUES_NETEZZA;
    exports.DBSYSTEMVALUES_PERVASIVE = TMP_DBSYSTEMVALUES_PERVASIVE;
    exports.DBSYSTEMVALUES_POINTBASE = TMP_DBSYSTEMVALUES_POINTBASE;
    exports.DBSYSTEMVALUES_SQLITE = TMP_DBSYSTEMVALUES_SQLITE;
    exports.DBSYSTEMVALUES_SYBASE = TMP_DBSYSTEMVALUES_SYBASE;
    exports.DBSYSTEMVALUES_TERADATA = TMP_DBSYSTEMVALUES_TERADATA;
    exports.DBSYSTEMVALUES_VERTICA = TMP_DBSYSTEMVALUES_VERTICA;
    exports.DBSYSTEMVALUES_H2 = TMP_DBSYSTEMVALUES_H2;
    exports.DBSYSTEMVALUES_COLDFUSION = TMP_DBSYSTEMVALUES_COLDFUSION;
    exports.DBSYSTEMVALUES_CASSANDRA = TMP_DBSYSTEMVALUES_CASSANDRA;
    exports.DBSYSTEMVALUES_HBASE = TMP_DBSYSTEMVALUES_HBASE;
    exports.DBSYSTEMVALUES_MONGODB = TMP_DBSYSTEMVALUES_MONGODB;
    exports.DBSYSTEMVALUES_REDIS = TMP_DBSYSTEMVALUES_REDIS;
    exports.DBSYSTEMVALUES_COUCHBASE = TMP_DBSYSTEMVALUES_COUCHBASE;
    exports.DBSYSTEMVALUES_COUCHDB = TMP_DBSYSTEMVALUES_COUCHDB;
    exports.DBSYSTEMVALUES_COSMOSDB = TMP_DBSYSTEMVALUES_COSMOSDB;
    exports.DBSYSTEMVALUES_DYNAMODB = TMP_DBSYSTEMVALUES_DYNAMODB;
    exports.DBSYSTEMVALUES_NEO4J = TMP_DBSYSTEMVALUES_NEO4J;
    exports.DBSYSTEMVALUES_GEODE = TMP_DBSYSTEMVALUES_GEODE;
    exports.DBSYSTEMVALUES_ELASTICSEARCH = TMP_DBSYSTEMVALUES_ELASTICSEARCH;
    exports.DBSYSTEMVALUES_MEMCACHED = TMP_DBSYSTEMVALUES_MEMCACHED;
    exports.DBSYSTEMVALUES_COCKROACHDB = TMP_DBSYSTEMVALUES_COCKROACHDB;
    exports.DbSystemValues = /* @__PURE__ */ (0, utils_1.createConstMap)([
      TMP_DBSYSTEMVALUES_OTHER_SQL,
      TMP_DBSYSTEMVALUES_MSSQL,
      TMP_DBSYSTEMVALUES_MYSQL,
      TMP_DBSYSTEMVALUES_ORACLE,
      TMP_DBSYSTEMVALUES_DB2,
      TMP_DBSYSTEMVALUES_POSTGRESQL,
      TMP_DBSYSTEMVALUES_REDSHIFT,
      TMP_DBSYSTEMVALUES_HIVE,
      TMP_DBSYSTEMVALUES_CLOUDSCAPE,
      TMP_DBSYSTEMVALUES_HSQLDB,
      TMP_DBSYSTEMVALUES_PROGRESS,
      TMP_DBSYSTEMVALUES_MAXDB,
      TMP_DBSYSTEMVALUES_HANADB,
      TMP_DBSYSTEMVALUES_INGRES,
      TMP_DBSYSTEMVALUES_FIRSTSQL,
      TMP_DBSYSTEMVALUES_EDB,
      TMP_DBSYSTEMVALUES_CACHE,
      TMP_DBSYSTEMVALUES_ADABAS,
      TMP_DBSYSTEMVALUES_FIREBIRD,
      TMP_DBSYSTEMVALUES_DERBY,
      TMP_DBSYSTEMVALUES_FILEMAKER,
      TMP_DBSYSTEMVALUES_INFORMIX,
      TMP_DBSYSTEMVALUES_INSTANTDB,
      TMP_DBSYSTEMVALUES_INTERBASE,
      TMP_DBSYSTEMVALUES_MARIADB,
      TMP_DBSYSTEMVALUES_NETEZZA,
      TMP_DBSYSTEMVALUES_PERVASIVE,
      TMP_DBSYSTEMVALUES_POINTBASE,
      TMP_DBSYSTEMVALUES_SQLITE,
      TMP_DBSYSTEMVALUES_SYBASE,
      TMP_DBSYSTEMVALUES_TERADATA,
      TMP_DBSYSTEMVALUES_VERTICA,
      TMP_DBSYSTEMVALUES_H2,
      TMP_DBSYSTEMVALUES_COLDFUSION,
      TMP_DBSYSTEMVALUES_CASSANDRA,
      TMP_DBSYSTEMVALUES_HBASE,
      TMP_DBSYSTEMVALUES_MONGODB,
      TMP_DBSYSTEMVALUES_REDIS,
      TMP_DBSYSTEMVALUES_COUCHBASE,
      TMP_DBSYSTEMVALUES_COUCHDB,
      TMP_DBSYSTEMVALUES_COSMOSDB,
      TMP_DBSYSTEMVALUES_DYNAMODB,
      TMP_DBSYSTEMVALUES_NEO4J,
      TMP_DBSYSTEMVALUES_GEODE,
      TMP_DBSYSTEMVALUES_ELASTICSEARCH,
      TMP_DBSYSTEMVALUES_MEMCACHED,
      TMP_DBSYSTEMVALUES_COCKROACHDB
    ]);
    var TMP_DBCASSANDRACONSISTENCYLEVELVALUES_ALL = "all";
    var TMP_DBCASSANDRACONSISTENCYLEVELVALUES_EACH_QUORUM = "each_quorum";
    var TMP_DBCASSANDRACONSISTENCYLEVELVALUES_QUORUM = "quorum";
    var TMP_DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_QUORUM = "local_quorum";
    var TMP_DBCASSANDRACONSISTENCYLEVELVALUES_ONE = "one";
    var TMP_DBCASSANDRACONSISTENCYLEVELVALUES_TWO = "two";
    var TMP_DBCASSANDRACONSISTENCYLEVELVALUES_THREE = "three";
    var TMP_DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_ONE = "local_one";
    var TMP_DBCASSANDRACONSISTENCYLEVELVALUES_ANY = "any";
    var TMP_DBCASSANDRACONSISTENCYLEVELVALUES_SERIAL = "serial";
    var TMP_DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_SERIAL = "local_serial";
    exports.DBCASSANDRACONSISTENCYLEVELVALUES_ALL = TMP_DBCASSANDRACONSISTENCYLEVELVALUES_ALL;
    exports.DBCASSANDRACONSISTENCYLEVELVALUES_EACH_QUORUM = TMP_DBCASSANDRACONSISTENCYLEVELVALUES_EACH_QUORUM;
    exports.DBCASSANDRACONSISTENCYLEVELVALUES_QUORUM = TMP_DBCASSANDRACONSISTENCYLEVELVALUES_QUORUM;
    exports.DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_QUORUM = TMP_DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_QUORUM;
    exports.DBCASSANDRACONSISTENCYLEVELVALUES_ONE = TMP_DBCASSANDRACONSISTENCYLEVELVALUES_ONE;
    exports.DBCASSANDRACONSISTENCYLEVELVALUES_TWO = TMP_DBCASSANDRACONSISTENCYLEVELVALUES_TWO;
    exports.DBCASSANDRACONSISTENCYLEVELVALUES_THREE = TMP_DBCASSANDRACONSISTENCYLEVELVALUES_THREE;
    exports.DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_ONE = TMP_DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_ONE;
    exports.DBCASSANDRACONSISTENCYLEVELVALUES_ANY = TMP_DBCASSANDRACONSISTENCYLEVELVALUES_ANY;
    exports.DBCASSANDRACONSISTENCYLEVELVALUES_SERIAL = TMP_DBCASSANDRACONSISTENCYLEVELVALUES_SERIAL;
    exports.DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_SERIAL = TMP_DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_SERIAL;
    exports.DbCassandraConsistencyLevelValues = /* @__PURE__ */ (0, utils_1.createConstMap)([
      TMP_DBCASSANDRACONSISTENCYLEVELVALUES_ALL,
      TMP_DBCASSANDRACONSISTENCYLEVELVALUES_EACH_QUORUM,
      TMP_DBCASSANDRACONSISTENCYLEVELVALUES_QUORUM,
      TMP_DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_QUORUM,
      TMP_DBCASSANDRACONSISTENCYLEVELVALUES_ONE,
      TMP_DBCASSANDRACONSISTENCYLEVELVALUES_TWO,
      TMP_DBCASSANDRACONSISTENCYLEVELVALUES_THREE,
      TMP_DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_ONE,
      TMP_DBCASSANDRACONSISTENCYLEVELVALUES_ANY,
      TMP_DBCASSANDRACONSISTENCYLEVELVALUES_SERIAL,
      TMP_DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_SERIAL
    ]);
    var TMP_FAASTRIGGERVALUES_DATASOURCE = "datasource";
    var TMP_FAASTRIGGERVALUES_HTTP = "http";
    var TMP_FAASTRIGGERVALUES_PUBSUB = "pubsub";
    var TMP_FAASTRIGGERVALUES_TIMER = "timer";
    var TMP_FAASTRIGGERVALUES_OTHER = "other";
    exports.FAASTRIGGERVALUES_DATASOURCE = TMP_FAASTRIGGERVALUES_DATASOURCE;
    exports.FAASTRIGGERVALUES_HTTP = TMP_FAASTRIGGERVALUES_HTTP;
    exports.FAASTRIGGERVALUES_PUBSUB = TMP_FAASTRIGGERVALUES_PUBSUB;
    exports.FAASTRIGGERVALUES_TIMER = TMP_FAASTRIGGERVALUES_TIMER;
    exports.FAASTRIGGERVALUES_OTHER = TMP_FAASTRIGGERVALUES_OTHER;
    exports.FaasTriggerValues = /* @__PURE__ */ (0, utils_1.createConstMap)([
      TMP_FAASTRIGGERVALUES_DATASOURCE,
      TMP_FAASTRIGGERVALUES_HTTP,
      TMP_FAASTRIGGERVALUES_PUBSUB,
      TMP_FAASTRIGGERVALUES_TIMER,
      TMP_FAASTRIGGERVALUES_OTHER
    ]);
    var TMP_FAASDOCUMENTOPERATIONVALUES_INSERT = "insert";
    var TMP_FAASDOCUMENTOPERATIONVALUES_EDIT = "edit";
    var TMP_FAASDOCUMENTOPERATIONVALUES_DELETE = "delete";
    exports.FAASDOCUMENTOPERATIONVALUES_INSERT = TMP_FAASDOCUMENTOPERATIONVALUES_INSERT;
    exports.FAASDOCUMENTOPERATIONVALUES_EDIT = TMP_FAASDOCUMENTOPERATIONVALUES_EDIT;
    exports.FAASDOCUMENTOPERATIONVALUES_DELETE = TMP_FAASDOCUMENTOPERATIONVALUES_DELETE;
    exports.FaasDocumentOperationValues = /* @__PURE__ */ (0, utils_1.createConstMap)([
      TMP_FAASDOCUMENTOPERATIONVALUES_INSERT,
      TMP_FAASDOCUMENTOPERATIONVALUES_EDIT,
      TMP_FAASDOCUMENTOPERATIONVALUES_DELETE
    ]);
    var TMP_FAASINVOKEDPROVIDERVALUES_ALIBABA_CLOUD = "alibaba_cloud";
    var TMP_FAASINVOKEDPROVIDERVALUES_AWS = "aws";
    var TMP_FAASINVOKEDPROVIDERVALUES_AZURE = "azure";
    var TMP_FAASINVOKEDPROVIDERVALUES_GCP = "gcp";
    exports.FAASINVOKEDPROVIDERVALUES_ALIBABA_CLOUD = TMP_FAASINVOKEDPROVIDERVALUES_ALIBABA_CLOUD;
    exports.FAASINVOKEDPROVIDERVALUES_AWS = TMP_FAASINVOKEDPROVIDERVALUES_AWS;
    exports.FAASINVOKEDPROVIDERVALUES_AZURE = TMP_FAASINVOKEDPROVIDERVALUES_AZURE;
    exports.FAASINVOKEDPROVIDERVALUES_GCP = TMP_FAASINVOKEDPROVIDERVALUES_GCP;
    exports.FaasInvokedProviderValues = /* @__PURE__ */ (0, utils_1.createConstMap)([
      TMP_FAASINVOKEDPROVIDERVALUES_ALIBABA_CLOUD,
      TMP_FAASINVOKEDPROVIDERVALUES_AWS,
      TMP_FAASINVOKEDPROVIDERVALUES_AZURE,
      TMP_FAASINVOKEDPROVIDERVALUES_GCP
    ]);
    var TMP_NETTRANSPORTVALUES_IP_TCP = "ip_tcp";
    var TMP_NETTRANSPORTVALUES_IP_UDP = "ip_udp";
    var TMP_NETTRANSPORTVALUES_IP = "ip";
    var TMP_NETTRANSPORTVALUES_UNIX = "unix";
    var TMP_NETTRANSPORTVALUES_PIPE = "pipe";
    var TMP_NETTRANSPORTVALUES_INPROC = "inproc";
    var TMP_NETTRANSPORTVALUES_OTHER = "other";
    exports.NETTRANSPORTVALUES_IP_TCP = TMP_NETTRANSPORTVALUES_IP_TCP;
    exports.NETTRANSPORTVALUES_IP_UDP = TMP_NETTRANSPORTVALUES_IP_UDP;
    exports.NETTRANSPORTVALUES_IP = TMP_NETTRANSPORTVALUES_IP;
    exports.NETTRANSPORTVALUES_UNIX = TMP_NETTRANSPORTVALUES_UNIX;
    exports.NETTRANSPORTVALUES_PIPE = TMP_NETTRANSPORTVALUES_PIPE;
    exports.NETTRANSPORTVALUES_INPROC = TMP_NETTRANSPORTVALUES_INPROC;
    exports.NETTRANSPORTVALUES_OTHER = TMP_NETTRANSPORTVALUES_OTHER;
    exports.NetTransportValues = /* @__PURE__ */ (0, utils_1.createConstMap)([
      TMP_NETTRANSPORTVALUES_IP_TCP,
      TMP_NETTRANSPORTVALUES_IP_UDP,
      TMP_NETTRANSPORTVALUES_IP,
      TMP_NETTRANSPORTVALUES_UNIX,
      TMP_NETTRANSPORTVALUES_PIPE,
      TMP_NETTRANSPORTVALUES_INPROC,
      TMP_NETTRANSPORTVALUES_OTHER
    ]);
    var TMP_NETHOSTCONNECTIONTYPEVALUES_WIFI = "wifi";
    var TMP_NETHOSTCONNECTIONTYPEVALUES_WIRED = "wired";
    var TMP_NETHOSTCONNECTIONTYPEVALUES_CELL = "cell";
    var TMP_NETHOSTCONNECTIONTYPEVALUES_UNAVAILABLE = "unavailable";
    var TMP_NETHOSTCONNECTIONTYPEVALUES_UNKNOWN = "unknown";
    exports.NETHOSTCONNECTIONTYPEVALUES_WIFI = TMP_NETHOSTCONNECTIONTYPEVALUES_WIFI;
    exports.NETHOSTCONNECTIONTYPEVALUES_WIRED = TMP_NETHOSTCONNECTIONTYPEVALUES_WIRED;
    exports.NETHOSTCONNECTIONTYPEVALUES_CELL = TMP_NETHOSTCONNECTIONTYPEVALUES_CELL;
    exports.NETHOSTCONNECTIONTYPEVALUES_UNAVAILABLE = TMP_NETHOSTCONNECTIONTYPEVALUES_UNAVAILABLE;
    exports.NETHOSTCONNECTIONTYPEVALUES_UNKNOWN = TMP_NETHOSTCONNECTIONTYPEVALUES_UNKNOWN;
    exports.NetHostConnectionTypeValues = /* @__PURE__ */ (0, utils_1.createConstMap)([
      TMP_NETHOSTCONNECTIONTYPEVALUES_WIFI,
      TMP_NETHOSTCONNECTIONTYPEVALUES_WIRED,
      TMP_NETHOSTCONNECTIONTYPEVALUES_CELL,
      TMP_NETHOSTCONNECTIONTYPEVALUES_UNAVAILABLE,
      TMP_NETHOSTCONNECTIONTYPEVALUES_UNKNOWN
    ]);
    var TMP_NETHOSTCONNECTIONSUBTYPEVALUES_GPRS = "gprs";
    var TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EDGE = "edge";
    var TMP_NETHOSTCONNECTIONSUBTYPEVALUES_UMTS = "umts";
    var TMP_NETHOSTCONNECTIONSUBTYPEVALUES_CDMA = "cdma";
    var TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_0 = "evdo_0";
    var TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_A = "evdo_a";
    var TMP_NETHOSTCONNECTIONSUBTYPEVALUES_CDMA2000_1XRTT = "cdma2000_1xrtt";
    var TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSDPA = "hsdpa";
    var TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSUPA = "hsupa";
    var TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSPA = "hspa";
    var TMP_NETHOSTCONNECTIONSUBTYPEVALUES_IDEN = "iden";
    var TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_B = "evdo_b";
    var TMP_NETHOSTCONNECTIONSUBTYPEVALUES_LTE = "lte";
    var TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EHRPD = "ehrpd";
    var TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSPAP = "hspap";
    var TMP_NETHOSTCONNECTIONSUBTYPEVALUES_GSM = "gsm";
    var TMP_NETHOSTCONNECTIONSUBTYPEVALUES_TD_SCDMA = "td_scdma";
    var TMP_NETHOSTCONNECTIONSUBTYPEVALUES_IWLAN = "iwlan";
    var TMP_NETHOSTCONNECTIONSUBTYPEVALUES_NR = "nr";
    var TMP_NETHOSTCONNECTIONSUBTYPEVALUES_NRNSA = "nrnsa";
    var TMP_NETHOSTCONNECTIONSUBTYPEVALUES_LTE_CA = "lte_ca";
    exports.NETHOSTCONNECTIONSUBTYPEVALUES_GPRS = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_GPRS;
    exports.NETHOSTCONNECTIONSUBTYPEVALUES_EDGE = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EDGE;
    exports.NETHOSTCONNECTIONSUBTYPEVALUES_UMTS = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_UMTS;
    exports.NETHOSTCONNECTIONSUBTYPEVALUES_CDMA = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_CDMA;
    exports.NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_0 = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_0;
    exports.NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_A = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_A;
    exports.NETHOSTCONNECTIONSUBTYPEVALUES_CDMA2000_1XRTT = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_CDMA2000_1XRTT;
    exports.NETHOSTCONNECTIONSUBTYPEVALUES_HSDPA = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSDPA;
    exports.NETHOSTCONNECTIONSUBTYPEVALUES_HSUPA = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSUPA;
    exports.NETHOSTCONNECTIONSUBTYPEVALUES_HSPA = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSPA;
    exports.NETHOSTCONNECTIONSUBTYPEVALUES_IDEN = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_IDEN;
    exports.NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_B = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_B;
    exports.NETHOSTCONNECTIONSUBTYPEVALUES_LTE = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_LTE;
    exports.NETHOSTCONNECTIONSUBTYPEVALUES_EHRPD = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EHRPD;
    exports.NETHOSTCONNECTIONSUBTYPEVALUES_HSPAP = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSPAP;
    exports.NETHOSTCONNECTIONSUBTYPEVALUES_GSM = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_GSM;
    exports.NETHOSTCONNECTIONSUBTYPEVALUES_TD_SCDMA = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_TD_SCDMA;
    exports.NETHOSTCONNECTIONSUBTYPEVALUES_IWLAN = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_IWLAN;
    exports.NETHOSTCONNECTIONSUBTYPEVALUES_NR = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_NR;
    exports.NETHOSTCONNECTIONSUBTYPEVALUES_NRNSA = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_NRNSA;
    exports.NETHOSTCONNECTIONSUBTYPEVALUES_LTE_CA = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_LTE_CA;
    exports.NetHostConnectionSubtypeValues = /* @__PURE__ */ (0, utils_1.createConstMap)([
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_GPRS,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EDGE,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_UMTS,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_CDMA,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_0,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_A,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_CDMA2000_1XRTT,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSDPA,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSUPA,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSPA,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_IDEN,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_B,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_LTE,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EHRPD,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSPAP,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_GSM,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_TD_SCDMA,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_IWLAN,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_NR,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_NRNSA,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_LTE_CA
    ]);
    var TMP_HTTPFLAVORVALUES_HTTP_1_0 = "1.0";
    var TMP_HTTPFLAVORVALUES_HTTP_1_1 = "1.1";
    var TMP_HTTPFLAVORVALUES_HTTP_2_0 = "2.0";
    var TMP_HTTPFLAVORVALUES_SPDY = "SPDY";
    var TMP_HTTPFLAVORVALUES_QUIC = "QUIC";
    exports.HTTPFLAVORVALUES_HTTP_1_0 = TMP_HTTPFLAVORVALUES_HTTP_1_0;
    exports.HTTPFLAVORVALUES_HTTP_1_1 = TMP_HTTPFLAVORVALUES_HTTP_1_1;
    exports.HTTPFLAVORVALUES_HTTP_2_0 = TMP_HTTPFLAVORVALUES_HTTP_2_0;
    exports.HTTPFLAVORVALUES_SPDY = TMP_HTTPFLAVORVALUES_SPDY;
    exports.HTTPFLAVORVALUES_QUIC = TMP_HTTPFLAVORVALUES_QUIC;
    exports.HttpFlavorValues = {
      HTTP_1_0: TMP_HTTPFLAVORVALUES_HTTP_1_0,
      HTTP_1_1: TMP_HTTPFLAVORVALUES_HTTP_1_1,
      HTTP_2_0: TMP_HTTPFLAVORVALUES_HTTP_2_0,
      SPDY: TMP_HTTPFLAVORVALUES_SPDY,
      QUIC: TMP_HTTPFLAVORVALUES_QUIC
    };
    var TMP_MESSAGINGDESTINATIONKINDVALUES_QUEUE = "queue";
    var TMP_MESSAGINGDESTINATIONKINDVALUES_TOPIC = "topic";
    exports.MESSAGINGDESTINATIONKINDVALUES_QUEUE = TMP_MESSAGINGDESTINATIONKINDVALUES_QUEUE;
    exports.MESSAGINGDESTINATIONKINDVALUES_TOPIC = TMP_MESSAGINGDESTINATIONKINDVALUES_TOPIC;
    exports.MessagingDestinationKindValues = /* @__PURE__ */ (0, utils_1.createConstMap)([
      TMP_MESSAGINGDESTINATIONKINDVALUES_QUEUE,
      TMP_MESSAGINGDESTINATIONKINDVALUES_TOPIC
    ]);
    var TMP_MESSAGINGOPERATIONVALUES_RECEIVE = "receive";
    var TMP_MESSAGINGOPERATIONVALUES_PROCESS = "process";
    exports.MESSAGINGOPERATIONVALUES_RECEIVE = TMP_MESSAGINGOPERATIONVALUES_RECEIVE;
    exports.MESSAGINGOPERATIONVALUES_PROCESS = TMP_MESSAGINGOPERATIONVALUES_PROCESS;
    exports.MessagingOperationValues = /* @__PURE__ */ (0, utils_1.createConstMap)([
      TMP_MESSAGINGOPERATIONVALUES_RECEIVE,
      TMP_MESSAGINGOPERATIONVALUES_PROCESS
    ]);
    var TMP_RPCGRPCSTATUSCODEVALUES_OK = 0;
    var TMP_RPCGRPCSTATUSCODEVALUES_CANCELLED = 1;
    var TMP_RPCGRPCSTATUSCODEVALUES_UNKNOWN = 2;
    var TMP_RPCGRPCSTATUSCODEVALUES_INVALID_ARGUMENT = 3;
    var TMP_RPCGRPCSTATUSCODEVALUES_DEADLINE_EXCEEDED = 4;
    var TMP_RPCGRPCSTATUSCODEVALUES_NOT_FOUND = 5;
    var TMP_RPCGRPCSTATUSCODEVALUES_ALREADY_EXISTS = 6;
    var TMP_RPCGRPCSTATUSCODEVALUES_PERMISSION_DENIED = 7;
    var TMP_RPCGRPCSTATUSCODEVALUES_RESOURCE_EXHAUSTED = 8;
    var TMP_RPCGRPCSTATUSCODEVALUES_FAILED_PRECONDITION = 9;
    var TMP_RPCGRPCSTATUSCODEVALUES_ABORTED = 10;
    var TMP_RPCGRPCSTATUSCODEVALUES_OUT_OF_RANGE = 11;
    var TMP_RPCGRPCSTATUSCODEVALUES_UNIMPLEMENTED = 12;
    var TMP_RPCGRPCSTATUSCODEVALUES_INTERNAL = 13;
    var TMP_RPCGRPCSTATUSCODEVALUES_UNAVAILABLE = 14;
    var TMP_RPCGRPCSTATUSCODEVALUES_DATA_LOSS = 15;
    var TMP_RPCGRPCSTATUSCODEVALUES_UNAUTHENTICATED = 16;
    exports.RPCGRPCSTATUSCODEVALUES_OK = TMP_RPCGRPCSTATUSCODEVALUES_OK;
    exports.RPCGRPCSTATUSCODEVALUES_CANCELLED = TMP_RPCGRPCSTATUSCODEVALUES_CANCELLED;
    exports.RPCGRPCSTATUSCODEVALUES_UNKNOWN = TMP_RPCGRPCSTATUSCODEVALUES_UNKNOWN;
    exports.RPCGRPCSTATUSCODEVALUES_INVALID_ARGUMENT = TMP_RPCGRPCSTATUSCODEVALUES_INVALID_ARGUMENT;
    exports.RPCGRPCSTATUSCODEVALUES_DEADLINE_EXCEEDED = TMP_RPCGRPCSTATUSCODEVALUES_DEADLINE_EXCEEDED;
    exports.RPCGRPCSTATUSCODEVALUES_NOT_FOUND = TMP_RPCGRPCSTATUSCODEVALUES_NOT_FOUND;
    exports.RPCGRPCSTATUSCODEVALUES_ALREADY_EXISTS = TMP_RPCGRPCSTATUSCODEVALUES_ALREADY_EXISTS;
    exports.RPCGRPCSTATUSCODEVALUES_PERMISSION_DENIED = TMP_RPCGRPCSTATUSCODEVALUES_PERMISSION_DENIED;
    exports.RPCGRPCSTATUSCODEVALUES_RESOURCE_EXHAUSTED = TMP_RPCGRPCSTATUSCODEVALUES_RESOURCE_EXHAUSTED;
    exports.RPCGRPCSTATUSCODEVALUES_FAILED_PRECONDITION = TMP_RPCGRPCSTATUSCODEVALUES_FAILED_PRECONDITION;
    exports.RPCGRPCSTATUSCODEVALUES_ABORTED = TMP_RPCGRPCSTATUSCODEVALUES_ABORTED;
    exports.RPCGRPCSTATUSCODEVALUES_OUT_OF_RANGE = TMP_RPCGRPCSTATUSCODEVALUES_OUT_OF_RANGE;
    exports.RPCGRPCSTATUSCODEVALUES_UNIMPLEMENTED = TMP_RPCGRPCSTATUSCODEVALUES_UNIMPLEMENTED;
    exports.RPCGRPCSTATUSCODEVALUES_INTERNAL = TMP_RPCGRPCSTATUSCODEVALUES_INTERNAL;
    exports.RPCGRPCSTATUSCODEVALUES_UNAVAILABLE = TMP_RPCGRPCSTATUSCODEVALUES_UNAVAILABLE;
    exports.RPCGRPCSTATUSCODEVALUES_DATA_LOSS = TMP_RPCGRPCSTATUSCODEVALUES_DATA_LOSS;
    exports.RPCGRPCSTATUSCODEVALUES_UNAUTHENTICATED = TMP_RPCGRPCSTATUSCODEVALUES_UNAUTHENTICATED;
    exports.RpcGrpcStatusCodeValues = {
      OK: TMP_RPCGRPCSTATUSCODEVALUES_OK,
      CANCELLED: TMP_RPCGRPCSTATUSCODEVALUES_CANCELLED,
      UNKNOWN: TMP_RPCGRPCSTATUSCODEVALUES_UNKNOWN,
      INVALID_ARGUMENT: TMP_RPCGRPCSTATUSCODEVALUES_INVALID_ARGUMENT,
      DEADLINE_EXCEEDED: TMP_RPCGRPCSTATUSCODEVALUES_DEADLINE_EXCEEDED,
      NOT_FOUND: TMP_RPCGRPCSTATUSCODEVALUES_NOT_FOUND,
      ALREADY_EXISTS: TMP_RPCGRPCSTATUSCODEVALUES_ALREADY_EXISTS,
      PERMISSION_DENIED: TMP_RPCGRPCSTATUSCODEVALUES_PERMISSION_DENIED,
      RESOURCE_EXHAUSTED: TMP_RPCGRPCSTATUSCODEVALUES_RESOURCE_EXHAUSTED,
      FAILED_PRECONDITION: TMP_RPCGRPCSTATUSCODEVALUES_FAILED_PRECONDITION,
      ABORTED: TMP_RPCGRPCSTATUSCODEVALUES_ABORTED,
      OUT_OF_RANGE: TMP_RPCGRPCSTATUSCODEVALUES_OUT_OF_RANGE,
      UNIMPLEMENTED: TMP_RPCGRPCSTATUSCODEVALUES_UNIMPLEMENTED,
      INTERNAL: TMP_RPCGRPCSTATUSCODEVALUES_INTERNAL,
      UNAVAILABLE: TMP_RPCGRPCSTATUSCODEVALUES_UNAVAILABLE,
      DATA_LOSS: TMP_RPCGRPCSTATUSCODEVALUES_DATA_LOSS,
      UNAUTHENTICATED: TMP_RPCGRPCSTATUSCODEVALUES_UNAUTHENTICATED
    };
    var TMP_MESSAGETYPEVALUES_SENT = "SENT";
    var TMP_MESSAGETYPEVALUES_RECEIVED = "RECEIVED";
    exports.MESSAGETYPEVALUES_SENT = TMP_MESSAGETYPEVALUES_SENT;
    exports.MESSAGETYPEVALUES_RECEIVED = TMP_MESSAGETYPEVALUES_RECEIVED;
    exports.MessageTypeValues = /* @__PURE__ */ (0, utils_1.createConstMap)([
      TMP_MESSAGETYPEVALUES_SENT,
      TMP_MESSAGETYPEVALUES_RECEIVED
    ]);
  }
});

// ../../node_modules/@opentelemetry/semantic-conventions/build/src/trace/index.js
var require_trace = __commonJS({
  "../../node_modules/@opentelemetry/semantic-conventions/build/src/trace/index.js"(exports) {
    "use strict";
    init_esm();
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      Object.defineProperty(o, k2, { enumerable: true, get: function() {
        return m[k];
      } });
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(require_SemanticAttributes(), exports);
  }
});

// ../../node_modules/@opentelemetry/semantic-conventions/build/src/resource/SemanticResourceAttributes.js
var require_SemanticResourceAttributes = __commonJS({
  "../../node_modules/@opentelemetry/semantic-conventions/build/src/resource/SemanticResourceAttributes.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SEMRESATTRS_K8S_STATEFULSET_NAME = exports.SEMRESATTRS_K8S_STATEFULSET_UID = exports.SEMRESATTRS_K8S_DEPLOYMENT_NAME = exports.SEMRESATTRS_K8S_DEPLOYMENT_UID = exports.SEMRESATTRS_K8S_REPLICASET_NAME = exports.SEMRESATTRS_K8S_REPLICASET_UID = exports.SEMRESATTRS_K8S_CONTAINER_NAME = exports.SEMRESATTRS_K8S_POD_NAME = exports.SEMRESATTRS_K8S_POD_UID = exports.SEMRESATTRS_K8S_NAMESPACE_NAME = exports.SEMRESATTRS_K8S_NODE_UID = exports.SEMRESATTRS_K8S_NODE_NAME = exports.SEMRESATTRS_K8S_CLUSTER_NAME = exports.SEMRESATTRS_HOST_IMAGE_VERSION = exports.SEMRESATTRS_HOST_IMAGE_ID = exports.SEMRESATTRS_HOST_IMAGE_NAME = exports.SEMRESATTRS_HOST_ARCH = exports.SEMRESATTRS_HOST_TYPE = exports.SEMRESATTRS_HOST_NAME = exports.SEMRESATTRS_HOST_ID = exports.SEMRESATTRS_FAAS_MAX_MEMORY = exports.SEMRESATTRS_FAAS_INSTANCE = exports.SEMRESATTRS_FAAS_VERSION = exports.SEMRESATTRS_FAAS_ID = exports.SEMRESATTRS_FAAS_NAME = exports.SEMRESATTRS_DEVICE_MODEL_NAME = exports.SEMRESATTRS_DEVICE_MODEL_IDENTIFIER = exports.SEMRESATTRS_DEVICE_ID = exports.SEMRESATTRS_DEPLOYMENT_ENVIRONMENT = exports.SEMRESATTRS_CONTAINER_IMAGE_TAG = exports.SEMRESATTRS_CONTAINER_IMAGE_NAME = exports.SEMRESATTRS_CONTAINER_RUNTIME = exports.SEMRESATTRS_CONTAINER_ID = exports.SEMRESATTRS_CONTAINER_NAME = exports.SEMRESATTRS_AWS_LOG_STREAM_ARNS = exports.SEMRESATTRS_AWS_LOG_STREAM_NAMES = exports.SEMRESATTRS_AWS_LOG_GROUP_ARNS = exports.SEMRESATTRS_AWS_LOG_GROUP_NAMES = exports.SEMRESATTRS_AWS_EKS_CLUSTER_ARN = exports.SEMRESATTRS_AWS_ECS_TASK_REVISION = exports.SEMRESATTRS_AWS_ECS_TASK_FAMILY = exports.SEMRESATTRS_AWS_ECS_TASK_ARN = exports.SEMRESATTRS_AWS_ECS_LAUNCHTYPE = exports.SEMRESATTRS_AWS_ECS_CLUSTER_ARN = exports.SEMRESATTRS_AWS_ECS_CONTAINER_ARN = exports.SEMRESATTRS_CLOUD_PLATFORM = exports.SEMRESATTRS_CLOUD_AVAILABILITY_ZONE = exports.SEMRESATTRS_CLOUD_REGION = exports.SEMRESATTRS_CLOUD_ACCOUNT_ID = exports.SEMRESATTRS_CLOUD_PROVIDER = void 0;
    exports.CLOUDPLATFORMVALUES_GCP_COMPUTE_ENGINE = exports.CLOUDPLATFORMVALUES_AZURE_APP_SERVICE = exports.CLOUDPLATFORMVALUES_AZURE_FUNCTIONS = exports.CLOUDPLATFORMVALUES_AZURE_AKS = exports.CLOUDPLATFORMVALUES_AZURE_CONTAINER_INSTANCES = exports.CLOUDPLATFORMVALUES_AZURE_VM = exports.CLOUDPLATFORMVALUES_AWS_ELASTIC_BEANSTALK = exports.CLOUDPLATFORMVALUES_AWS_LAMBDA = exports.CLOUDPLATFORMVALUES_AWS_EKS = exports.CLOUDPLATFORMVALUES_AWS_ECS = exports.CLOUDPLATFORMVALUES_AWS_EC2 = exports.CLOUDPLATFORMVALUES_ALIBABA_CLOUD_FC = exports.CLOUDPLATFORMVALUES_ALIBABA_CLOUD_ECS = exports.CloudProviderValues = exports.CLOUDPROVIDERVALUES_GCP = exports.CLOUDPROVIDERVALUES_AZURE = exports.CLOUDPROVIDERVALUES_AWS = exports.CLOUDPROVIDERVALUES_ALIBABA_CLOUD = exports.SemanticResourceAttributes = exports.SEMRESATTRS_WEBENGINE_DESCRIPTION = exports.SEMRESATTRS_WEBENGINE_VERSION = exports.SEMRESATTRS_WEBENGINE_NAME = exports.SEMRESATTRS_TELEMETRY_AUTO_VERSION = exports.SEMRESATTRS_TELEMETRY_SDK_VERSION = exports.SEMRESATTRS_TELEMETRY_SDK_LANGUAGE = exports.SEMRESATTRS_TELEMETRY_SDK_NAME = exports.SEMRESATTRS_SERVICE_VERSION = exports.SEMRESATTRS_SERVICE_INSTANCE_ID = exports.SEMRESATTRS_SERVICE_NAMESPACE = exports.SEMRESATTRS_SERVICE_NAME = exports.SEMRESATTRS_PROCESS_RUNTIME_DESCRIPTION = exports.SEMRESATTRS_PROCESS_RUNTIME_VERSION = exports.SEMRESATTRS_PROCESS_RUNTIME_NAME = exports.SEMRESATTRS_PROCESS_OWNER = exports.SEMRESATTRS_PROCESS_COMMAND_ARGS = exports.SEMRESATTRS_PROCESS_COMMAND_LINE = exports.SEMRESATTRS_PROCESS_COMMAND = exports.SEMRESATTRS_PROCESS_EXECUTABLE_PATH = exports.SEMRESATTRS_PROCESS_EXECUTABLE_NAME = exports.SEMRESATTRS_PROCESS_PID = exports.SEMRESATTRS_OS_VERSION = exports.SEMRESATTRS_OS_NAME = exports.SEMRESATTRS_OS_DESCRIPTION = exports.SEMRESATTRS_OS_TYPE = exports.SEMRESATTRS_K8S_CRONJOB_NAME = exports.SEMRESATTRS_K8S_CRONJOB_UID = exports.SEMRESATTRS_K8S_JOB_NAME = exports.SEMRESATTRS_K8S_JOB_UID = exports.SEMRESATTRS_K8S_DAEMONSET_NAME = exports.SEMRESATTRS_K8S_DAEMONSET_UID = void 0;
    exports.TelemetrySdkLanguageValues = exports.TELEMETRYSDKLANGUAGEVALUES_WEBJS = exports.TELEMETRYSDKLANGUAGEVALUES_RUBY = exports.TELEMETRYSDKLANGUAGEVALUES_PYTHON = exports.TELEMETRYSDKLANGUAGEVALUES_PHP = exports.TELEMETRYSDKLANGUAGEVALUES_NODEJS = exports.TELEMETRYSDKLANGUAGEVALUES_JAVA = exports.TELEMETRYSDKLANGUAGEVALUES_GO = exports.TELEMETRYSDKLANGUAGEVALUES_ERLANG = exports.TELEMETRYSDKLANGUAGEVALUES_DOTNET = exports.TELEMETRYSDKLANGUAGEVALUES_CPP = exports.OsTypeValues = exports.OSTYPEVALUES_Z_OS = exports.OSTYPEVALUES_SOLARIS = exports.OSTYPEVALUES_AIX = exports.OSTYPEVALUES_HPUX = exports.OSTYPEVALUES_DRAGONFLYBSD = exports.OSTYPEVALUES_OPENBSD = exports.OSTYPEVALUES_NETBSD = exports.OSTYPEVALUES_FREEBSD = exports.OSTYPEVALUES_DARWIN = exports.OSTYPEVALUES_LINUX = exports.OSTYPEVALUES_WINDOWS = exports.HostArchValues = exports.HOSTARCHVALUES_X86 = exports.HOSTARCHVALUES_PPC64 = exports.HOSTARCHVALUES_PPC32 = exports.HOSTARCHVALUES_IA64 = exports.HOSTARCHVALUES_ARM64 = exports.HOSTARCHVALUES_ARM32 = exports.HOSTARCHVALUES_AMD64 = exports.AwsEcsLaunchtypeValues = exports.AWSECSLAUNCHTYPEVALUES_FARGATE = exports.AWSECSLAUNCHTYPEVALUES_EC2 = exports.CloudPlatformValues = exports.CLOUDPLATFORMVALUES_GCP_APP_ENGINE = exports.CLOUDPLATFORMVALUES_GCP_CLOUD_FUNCTIONS = exports.CLOUDPLATFORMVALUES_GCP_KUBERNETES_ENGINE = exports.CLOUDPLATFORMVALUES_GCP_CLOUD_RUN = void 0;
    var utils_1 = require_utils();
    var TMP_CLOUD_PROVIDER = "cloud.provider";
    var TMP_CLOUD_ACCOUNT_ID = "cloud.account.id";
    var TMP_CLOUD_REGION = "cloud.region";
    var TMP_CLOUD_AVAILABILITY_ZONE = "cloud.availability_zone";
    var TMP_CLOUD_PLATFORM = "cloud.platform";
    var TMP_AWS_ECS_CONTAINER_ARN = "aws.ecs.container.arn";
    var TMP_AWS_ECS_CLUSTER_ARN = "aws.ecs.cluster.arn";
    var TMP_AWS_ECS_LAUNCHTYPE = "aws.ecs.launchtype";
    var TMP_AWS_ECS_TASK_ARN = "aws.ecs.task.arn";
    var TMP_AWS_ECS_TASK_FAMILY = "aws.ecs.task.family";
    var TMP_AWS_ECS_TASK_REVISION = "aws.ecs.task.revision";
    var TMP_AWS_EKS_CLUSTER_ARN = "aws.eks.cluster.arn";
    var TMP_AWS_LOG_GROUP_NAMES = "aws.log.group.names";
    var TMP_AWS_LOG_GROUP_ARNS = "aws.log.group.arns";
    var TMP_AWS_LOG_STREAM_NAMES = "aws.log.stream.names";
    var TMP_AWS_LOG_STREAM_ARNS = "aws.log.stream.arns";
    var TMP_CONTAINER_NAME = "container.name";
    var TMP_CONTAINER_ID = "container.id";
    var TMP_CONTAINER_RUNTIME = "container.runtime";
    var TMP_CONTAINER_IMAGE_NAME = "container.image.name";
    var TMP_CONTAINER_IMAGE_TAG = "container.image.tag";
    var TMP_DEPLOYMENT_ENVIRONMENT = "deployment.environment";
    var TMP_DEVICE_ID = "device.id";
    var TMP_DEVICE_MODEL_IDENTIFIER = "device.model.identifier";
    var TMP_DEVICE_MODEL_NAME = "device.model.name";
    var TMP_FAAS_NAME = "faas.name";
    var TMP_FAAS_ID = "faas.id";
    var TMP_FAAS_VERSION = "faas.version";
    var TMP_FAAS_INSTANCE = "faas.instance";
    var TMP_FAAS_MAX_MEMORY = "faas.max_memory";
    var TMP_HOST_ID = "host.id";
    var TMP_HOST_NAME = "host.name";
    var TMP_HOST_TYPE = "host.type";
    var TMP_HOST_ARCH = "host.arch";
    var TMP_HOST_IMAGE_NAME = "host.image.name";
    var TMP_HOST_IMAGE_ID = "host.image.id";
    var TMP_HOST_IMAGE_VERSION = "host.image.version";
    var TMP_K8S_CLUSTER_NAME = "k8s.cluster.name";
    var TMP_K8S_NODE_NAME = "k8s.node.name";
    var TMP_K8S_NODE_UID = "k8s.node.uid";
    var TMP_K8S_NAMESPACE_NAME = "k8s.namespace.name";
    var TMP_K8S_POD_UID = "k8s.pod.uid";
    var TMP_K8S_POD_NAME = "k8s.pod.name";
    var TMP_K8S_CONTAINER_NAME = "k8s.container.name";
    var TMP_K8S_REPLICASET_UID = "k8s.replicaset.uid";
    var TMP_K8S_REPLICASET_NAME = "k8s.replicaset.name";
    var TMP_K8S_DEPLOYMENT_UID = "k8s.deployment.uid";
    var TMP_K8S_DEPLOYMENT_NAME = "k8s.deployment.name";
    var TMP_K8S_STATEFULSET_UID = "k8s.statefulset.uid";
    var TMP_K8S_STATEFULSET_NAME = "k8s.statefulset.name";
    var TMP_K8S_DAEMONSET_UID = "k8s.daemonset.uid";
    var TMP_K8S_DAEMONSET_NAME = "k8s.daemonset.name";
    var TMP_K8S_JOB_UID = "k8s.job.uid";
    var TMP_K8S_JOB_NAME = "k8s.job.name";
    var TMP_K8S_CRONJOB_UID = "k8s.cronjob.uid";
    var TMP_K8S_CRONJOB_NAME = "k8s.cronjob.name";
    var TMP_OS_TYPE = "os.type";
    var TMP_OS_DESCRIPTION = "os.description";
    var TMP_OS_NAME = "os.name";
    var TMP_OS_VERSION = "os.version";
    var TMP_PROCESS_PID = "process.pid";
    var TMP_PROCESS_EXECUTABLE_NAME = "process.executable.name";
    var TMP_PROCESS_EXECUTABLE_PATH = "process.executable.path";
    var TMP_PROCESS_COMMAND = "process.command";
    var TMP_PROCESS_COMMAND_LINE = "process.command_line";
    var TMP_PROCESS_COMMAND_ARGS = "process.command_args";
    var TMP_PROCESS_OWNER = "process.owner";
    var TMP_PROCESS_RUNTIME_NAME = "process.runtime.name";
    var TMP_PROCESS_RUNTIME_VERSION = "process.runtime.version";
    var TMP_PROCESS_RUNTIME_DESCRIPTION = "process.runtime.description";
    var TMP_SERVICE_NAME = "service.name";
    var TMP_SERVICE_NAMESPACE = "service.namespace";
    var TMP_SERVICE_INSTANCE_ID = "service.instance.id";
    var TMP_SERVICE_VERSION = "service.version";
    var TMP_TELEMETRY_SDK_NAME = "telemetry.sdk.name";
    var TMP_TELEMETRY_SDK_LANGUAGE = "telemetry.sdk.language";
    var TMP_TELEMETRY_SDK_VERSION = "telemetry.sdk.version";
    var TMP_TELEMETRY_AUTO_VERSION = "telemetry.auto.version";
    var TMP_WEBENGINE_NAME = "webengine.name";
    var TMP_WEBENGINE_VERSION = "webengine.version";
    var TMP_WEBENGINE_DESCRIPTION = "webengine.description";
    exports.SEMRESATTRS_CLOUD_PROVIDER = TMP_CLOUD_PROVIDER;
    exports.SEMRESATTRS_CLOUD_ACCOUNT_ID = TMP_CLOUD_ACCOUNT_ID;
    exports.SEMRESATTRS_CLOUD_REGION = TMP_CLOUD_REGION;
    exports.SEMRESATTRS_CLOUD_AVAILABILITY_ZONE = TMP_CLOUD_AVAILABILITY_ZONE;
    exports.SEMRESATTRS_CLOUD_PLATFORM = TMP_CLOUD_PLATFORM;
    exports.SEMRESATTRS_AWS_ECS_CONTAINER_ARN = TMP_AWS_ECS_CONTAINER_ARN;
    exports.SEMRESATTRS_AWS_ECS_CLUSTER_ARN = TMP_AWS_ECS_CLUSTER_ARN;
    exports.SEMRESATTRS_AWS_ECS_LAUNCHTYPE = TMP_AWS_ECS_LAUNCHTYPE;
    exports.SEMRESATTRS_AWS_ECS_TASK_ARN = TMP_AWS_ECS_TASK_ARN;
    exports.SEMRESATTRS_AWS_ECS_TASK_FAMILY = TMP_AWS_ECS_TASK_FAMILY;
    exports.SEMRESATTRS_AWS_ECS_TASK_REVISION = TMP_AWS_ECS_TASK_REVISION;
    exports.SEMRESATTRS_AWS_EKS_CLUSTER_ARN = TMP_AWS_EKS_CLUSTER_ARN;
    exports.SEMRESATTRS_AWS_LOG_GROUP_NAMES = TMP_AWS_LOG_GROUP_NAMES;
    exports.SEMRESATTRS_AWS_LOG_GROUP_ARNS = TMP_AWS_LOG_GROUP_ARNS;
    exports.SEMRESATTRS_AWS_LOG_STREAM_NAMES = TMP_AWS_LOG_STREAM_NAMES;
    exports.SEMRESATTRS_AWS_LOG_STREAM_ARNS = TMP_AWS_LOG_STREAM_ARNS;
    exports.SEMRESATTRS_CONTAINER_NAME = TMP_CONTAINER_NAME;
    exports.SEMRESATTRS_CONTAINER_ID = TMP_CONTAINER_ID;
    exports.SEMRESATTRS_CONTAINER_RUNTIME = TMP_CONTAINER_RUNTIME;
    exports.SEMRESATTRS_CONTAINER_IMAGE_NAME = TMP_CONTAINER_IMAGE_NAME;
    exports.SEMRESATTRS_CONTAINER_IMAGE_TAG = TMP_CONTAINER_IMAGE_TAG;
    exports.SEMRESATTRS_DEPLOYMENT_ENVIRONMENT = TMP_DEPLOYMENT_ENVIRONMENT;
    exports.SEMRESATTRS_DEVICE_ID = TMP_DEVICE_ID;
    exports.SEMRESATTRS_DEVICE_MODEL_IDENTIFIER = TMP_DEVICE_MODEL_IDENTIFIER;
    exports.SEMRESATTRS_DEVICE_MODEL_NAME = TMP_DEVICE_MODEL_NAME;
    exports.SEMRESATTRS_FAAS_NAME = TMP_FAAS_NAME;
    exports.SEMRESATTRS_FAAS_ID = TMP_FAAS_ID;
    exports.SEMRESATTRS_FAAS_VERSION = TMP_FAAS_VERSION;
    exports.SEMRESATTRS_FAAS_INSTANCE = TMP_FAAS_INSTANCE;
    exports.SEMRESATTRS_FAAS_MAX_MEMORY = TMP_FAAS_MAX_MEMORY;
    exports.SEMRESATTRS_HOST_ID = TMP_HOST_ID;
    exports.SEMRESATTRS_HOST_NAME = TMP_HOST_NAME;
    exports.SEMRESATTRS_HOST_TYPE = TMP_HOST_TYPE;
    exports.SEMRESATTRS_HOST_ARCH = TMP_HOST_ARCH;
    exports.SEMRESATTRS_HOST_IMAGE_NAME = TMP_HOST_IMAGE_NAME;
    exports.SEMRESATTRS_HOST_IMAGE_ID = TMP_HOST_IMAGE_ID;
    exports.SEMRESATTRS_HOST_IMAGE_VERSION = TMP_HOST_IMAGE_VERSION;
    exports.SEMRESATTRS_K8S_CLUSTER_NAME = TMP_K8S_CLUSTER_NAME;
    exports.SEMRESATTRS_K8S_NODE_NAME = TMP_K8S_NODE_NAME;
    exports.SEMRESATTRS_K8S_NODE_UID = TMP_K8S_NODE_UID;
    exports.SEMRESATTRS_K8S_NAMESPACE_NAME = TMP_K8S_NAMESPACE_NAME;
    exports.SEMRESATTRS_K8S_POD_UID = TMP_K8S_POD_UID;
    exports.SEMRESATTRS_K8S_POD_NAME = TMP_K8S_POD_NAME;
    exports.SEMRESATTRS_K8S_CONTAINER_NAME = TMP_K8S_CONTAINER_NAME;
    exports.SEMRESATTRS_K8S_REPLICASET_UID = TMP_K8S_REPLICASET_UID;
    exports.SEMRESATTRS_K8S_REPLICASET_NAME = TMP_K8S_REPLICASET_NAME;
    exports.SEMRESATTRS_K8S_DEPLOYMENT_UID = TMP_K8S_DEPLOYMENT_UID;
    exports.SEMRESATTRS_K8S_DEPLOYMENT_NAME = TMP_K8S_DEPLOYMENT_NAME;
    exports.SEMRESATTRS_K8S_STATEFULSET_UID = TMP_K8S_STATEFULSET_UID;
    exports.SEMRESATTRS_K8S_STATEFULSET_NAME = TMP_K8S_STATEFULSET_NAME;
    exports.SEMRESATTRS_K8S_DAEMONSET_UID = TMP_K8S_DAEMONSET_UID;
    exports.SEMRESATTRS_K8S_DAEMONSET_NAME = TMP_K8S_DAEMONSET_NAME;
    exports.SEMRESATTRS_K8S_JOB_UID = TMP_K8S_JOB_UID;
    exports.SEMRESATTRS_K8S_JOB_NAME = TMP_K8S_JOB_NAME;
    exports.SEMRESATTRS_K8S_CRONJOB_UID = TMP_K8S_CRONJOB_UID;
    exports.SEMRESATTRS_K8S_CRONJOB_NAME = TMP_K8S_CRONJOB_NAME;
    exports.SEMRESATTRS_OS_TYPE = TMP_OS_TYPE;
    exports.SEMRESATTRS_OS_DESCRIPTION = TMP_OS_DESCRIPTION;
    exports.SEMRESATTRS_OS_NAME = TMP_OS_NAME;
    exports.SEMRESATTRS_OS_VERSION = TMP_OS_VERSION;
    exports.SEMRESATTRS_PROCESS_PID = TMP_PROCESS_PID;
    exports.SEMRESATTRS_PROCESS_EXECUTABLE_NAME = TMP_PROCESS_EXECUTABLE_NAME;
    exports.SEMRESATTRS_PROCESS_EXECUTABLE_PATH = TMP_PROCESS_EXECUTABLE_PATH;
    exports.SEMRESATTRS_PROCESS_COMMAND = TMP_PROCESS_COMMAND;
    exports.SEMRESATTRS_PROCESS_COMMAND_LINE = TMP_PROCESS_COMMAND_LINE;
    exports.SEMRESATTRS_PROCESS_COMMAND_ARGS = TMP_PROCESS_COMMAND_ARGS;
    exports.SEMRESATTRS_PROCESS_OWNER = TMP_PROCESS_OWNER;
    exports.SEMRESATTRS_PROCESS_RUNTIME_NAME = TMP_PROCESS_RUNTIME_NAME;
    exports.SEMRESATTRS_PROCESS_RUNTIME_VERSION = TMP_PROCESS_RUNTIME_VERSION;
    exports.SEMRESATTRS_PROCESS_RUNTIME_DESCRIPTION = TMP_PROCESS_RUNTIME_DESCRIPTION;
    exports.SEMRESATTRS_SERVICE_NAME = TMP_SERVICE_NAME;
    exports.SEMRESATTRS_SERVICE_NAMESPACE = TMP_SERVICE_NAMESPACE;
    exports.SEMRESATTRS_SERVICE_INSTANCE_ID = TMP_SERVICE_INSTANCE_ID;
    exports.SEMRESATTRS_SERVICE_VERSION = TMP_SERVICE_VERSION;
    exports.SEMRESATTRS_TELEMETRY_SDK_NAME = TMP_TELEMETRY_SDK_NAME;
    exports.SEMRESATTRS_TELEMETRY_SDK_LANGUAGE = TMP_TELEMETRY_SDK_LANGUAGE;
    exports.SEMRESATTRS_TELEMETRY_SDK_VERSION = TMP_TELEMETRY_SDK_VERSION;
    exports.SEMRESATTRS_TELEMETRY_AUTO_VERSION = TMP_TELEMETRY_AUTO_VERSION;
    exports.SEMRESATTRS_WEBENGINE_NAME = TMP_WEBENGINE_NAME;
    exports.SEMRESATTRS_WEBENGINE_VERSION = TMP_WEBENGINE_VERSION;
    exports.SEMRESATTRS_WEBENGINE_DESCRIPTION = TMP_WEBENGINE_DESCRIPTION;
    exports.SemanticResourceAttributes = /* @__PURE__ */ (0, utils_1.createConstMap)([
      TMP_CLOUD_PROVIDER,
      TMP_CLOUD_ACCOUNT_ID,
      TMP_CLOUD_REGION,
      TMP_CLOUD_AVAILABILITY_ZONE,
      TMP_CLOUD_PLATFORM,
      TMP_AWS_ECS_CONTAINER_ARN,
      TMP_AWS_ECS_CLUSTER_ARN,
      TMP_AWS_ECS_LAUNCHTYPE,
      TMP_AWS_ECS_TASK_ARN,
      TMP_AWS_ECS_TASK_FAMILY,
      TMP_AWS_ECS_TASK_REVISION,
      TMP_AWS_EKS_CLUSTER_ARN,
      TMP_AWS_LOG_GROUP_NAMES,
      TMP_AWS_LOG_GROUP_ARNS,
      TMP_AWS_LOG_STREAM_NAMES,
      TMP_AWS_LOG_STREAM_ARNS,
      TMP_CONTAINER_NAME,
      TMP_CONTAINER_ID,
      TMP_CONTAINER_RUNTIME,
      TMP_CONTAINER_IMAGE_NAME,
      TMP_CONTAINER_IMAGE_TAG,
      TMP_DEPLOYMENT_ENVIRONMENT,
      TMP_DEVICE_ID,
      TMP_DEVICE_MODEL_IDENTIFIER,
      TMP_DEVICE_MODEL_NAME,
      TMP_FAAS_NAME,
      TMP_FAAS_ID,
      TMP_FAAS_VERSION,
      TMP_FAAS_INSTANCE,
      TMP_FAAS_MAX_MEMORY,
      TMP_HOST_ID,
      TMP_HOST_NAME,
      TMP_HOST_TYPE,
      TMP_HOST_ARCH,
      TMP_HOST_IMAGE_NAME,
      TMP_HOST_IMAGE_ID,
      TMP_HOST_IMAGE_VERSION,
      TMP_K8S_CLUSTER_NAME,
      TMP_K8S_NODE_NAME,
      TMP_K8S_NODE_UID,
      TMP_K8S_NAMESPACE_NAME,
      TMP_K8S_POD_UID,
      TMP_K8S_POD_NAME,
      TMP_K8S_CONTAINER_NAME,
      TMP_K8S_REPLICASET_UID,
      TMP_K8S_REPLICASET_NAME,
      TMP_K8S_DEPLOYMENT_UID,
      TMP_K8S_DEPLOYMENT_NAME,
      TMP_K8S_STATEFULSET_UID,
      TMP_K8S_STATEFULSET_NAME,
      TMP_K8S_DAEMONSET_UID,
      TMP_K8S_DAEMONSET_NAME,
      TMP_K8S_JOB_UID,
      TMP_K8S_JOB_NAME,
      TMP_K8S_CRONJOB_UID,
      TMP_K8S_CRONJOB_NAME,
      TMP_OS_TYPE,
      TMP_OS_DESCRIPTION,
      TMP_OS_NAME,
      TMP_OS_VERSION,
      TMP_PROCESS_PID,
      TMP_PROCESS_EXECUTABLE_NAME,
      TMP_PROCESS_EXECUTABLE_PATH,
      TMP_PROCESS_COMMAND,
      TMP_PROCESS_COMMAND_LINE,
      TMP_PROCESS_COMMAND_ARGS,
      TMP_PROCESS_OWNER,
      TMP_PROCESS_RUNTIME_NAME,
      TMP_PROCESS_RUNTIME_VERSION,
      TMP_PROCESS_RUNTIME_DESCRIPTION,
      TMP_SERVICE_NAME,
      TMP_SERVICE_NAMESPACE,
      TMP_SERVICE_INSTANCE_ID,
      TMP_SERVICE_VERSION,
      TMP_TELEMETRY_SDK_NAME,
      TMP_TELEMETRY_SDK_LANGUAGE,
      TMP_TELEMETRY_SDK_VERSION,
      TMP_TELEMETRY_AUTO_VERSION,
      TMP_WEBENGINE_NAME,
      TMP_WEBENGINE_VERSION,
      TMP_WEBENGINE_DESCRIPTION
    ]);
    var TMP_CLOUDPROVIDERVALUES_ALIBABA_CLOUD = "alibaba_cloud";
    var TMP_CLOUDPROVIDERVALUES_AWS = "aws";
    var TMP_CLOUDPROVIDERVALUES_AZURE = "azure";
    var TMP_CLOUDPROVIDERVALUES_GCP = "gcp";
    exports.CLOUDPROVIDERVALUES_ALIBABA_CLOUD = TMP_CLOUDPROVIDERVALUES_ALIBABA_CLOUD;
    exports.CLOUDPROVIDERVALUES_AWS = TMP_CLOUDPROVIDERVALUES_AWS;
    exports.CLOUDPROVIDERVALUES_AZURE = TMP_CLOUDPROVIDERVALUES_AZURE;
    exports.CLOUDPROVIDERVALUES_GCP = TMP_CLOUDPROVIDERVALUES_GCP;
    exports.CloudProviderValues = /* @__PURE__ */ (0, utils_1.createConstMap)([
      TMP_CLOUDPROVIDERVALUES_ALIBABA_CLOUD,
      TMP_CLOUDPROVIDERVALUES_AWS,
      TMP_CLOUDPROVIDERVALUES_AZURE,
      TMP_CLOUDPROVIDERVALUES_GCP
    ]);
    var TMP_CLOUDPLATFORMVALUES_ALIBABA_CLOUD_ECS = "alibaba_cloud_ecs";
    var TMP_CLOUDPLATFORMVALUES_ALIBABA_CLOUD_FC = "alibaba_cloud_fc";
    var TMP_CLOUDPLATFORMVALUES_AWS_EC2 = "aws_ec2";
    var TMP_CLOUDPLATFORMVALUES_AWS_ECS = "aws_ecs";
    var TMP_CLOUDPLATFORMVALUES_AWS_EKS = "aws_eks";
    var TMP_CLOUDPLATFORMVALUES_AWS_LAMBDA = "aws_lambda";
    var TMP_CLOUDPLATFORMVALUES_AWS_ELASTIC_BEANSTALK = "aws_elastic_beanstalk";
    var TMP_CLOUDPLATFORMVALUES_AZURE_VM = "azure_vm";
    var TMP_CLOUDPLATFORMVALUES_AZURE_CONTAINER_INSTANCES = "azure_container_instances";
    var TMP_CLOUDPLATFORMVALUES_AZURE_AKS = "azure_aks";
    var TMP_CLOUDPLATFORMVALUES_AZURE_FUNCTIONS = "azure_functions";
    var TMP_CLOUDPLATFORMVALUES_AZURE_APP_SERVICE = "azure_app_service";
    var TMP_CLOUDPLATFORMVALUES_GCP_COMPUTE_ENGINE = "gcp_compute_engine";
    var TMP_CLOUDPLATFORMVALUES_GCP_CLOUD_RUN = "gcp_cloud_run";
    var TMP_CLOUDPLATFORMVALUES_GCP_KUBERNETES_ENGINE = "gcp_kubernetes_engine";
    var TMP_CLOUDPLATFORMVALUES_GCP_CLOUD_FUNCTIONS = "gcp_cloud_functions";
    var TMP_CLOUDPLATFORMVALUES_GCP_APP_ENGINE = "gcp_app_engine";
    exports.CLOUDPLATFORMVALUES_ALIBABA_CLOUD_ECS = TMP_CLOUDPLATFORMVALUES_ALIBABA_CLOUD_ECS;
    exports.CLOUDPLATFORMVALUES_ALIBABA_CLOUD_FC = TMP_CLOUDPLATFORMVALUES_ALIBABA_CLOUD_FC;
    exports.CLOUDPLATFORMVALUES_AWS_EC2 = TMP_CLOUDPLATFORMVALUES_AWS_EC2;
    exports.CLOUDPLATFORMVALUES_AWS_ECS = TMP_CLOUDPLATFORMVALUES_AWS_ECS;
    exports.CLOUDPLATFORMVALUES_AWS_EKS = TMP_CLOUDPLATFORMVALUES_AWS_EKS;
    exports.CLOUDPLATFORMVALUES_AWS_LAMBDA = TMP_CLOUDPLATFORMVALUES_AWS_LAMBDA;
    exports.CLOUDPLATFORMVALUES_AWS_ELASTIC_BEANSTALK = TMP_CLOUDPLATFORMVALUES_AWS_ELASTIC_BEANSTALK;
    exports.CLOUDPLATFORMVALUES_AZURE_VM = TMP_CLOUDPLATFORMVALUES_AZURE_VM;
    exports.CLOUDPLATFORMVALUES_AZURE_CONTAINER_INSTANCES = TMP_CLOUDPLATFORMVALUES_AZURE_CONTAINER_INSTANCES;
    exports.CLOUDPLATFORMVALUES_AZURE_AKS = TMP_CLOUDPLATFORMVALUES_AZURE_AKS;
    exports.CLOUDPLATFORMVALUES_AZURE_FUNCTIONS = TMP_CLOUDPLATFORMVALUES_AZURE_FUNCTIONS;
    exports.CLOUDPLATFORMVALUES_AZURE_APP_SERVICE = TMP_CLOUDPLATFORMVALUES_AZURE_APP_SERVICE;
    exports.CLOUDPLATFORMVALUES_GCP_COMPUTE_ENGINE = TMP_CLOUDPLATFORMVALUES_GCP_COMPUTE_ENGINE;
    exports.CLOUDPLATFORMVALUES_GCP_CLOUD_RUN = TMP_CLOUDPLATFORMVALUES_GCP_CLOUD_RUN;
    exports.CLOUDPLATFORMVALUES_GCP_KUBERNETES_ENGINE = TMP_CLOUDPLATFORMVALUES_GCP_KUBERNETES_ENGINE;
    exports.CLOUDPLATFORMVALUES_GCP_CLOUD_FUNCTIONS = TMP_CLOUDPLATFORMVALUES_GCP_CLOUD_FUNCTIONS;
    exports.CLOUDPLATFORMVALUES_GCP_APP_ENGINE = TMP_CLOUDPLATFORMVALUES_GCP_APP_ENGINE;
    exports.CloudPlatformValues = /* @__PURE__ */ (0, utils_1.createConstMap)([
      TMP_CLOUDPLATFORMVALUES_ALIBABA_CLOUD_ECS,
      TMP_CLOUDPLATFORMVALUES_ALIBABA_CLOUD_FC,
      TMP_CLOUDPLATFORMVALUES_AWS_EC2,
      TMP_CLOUDPLATFORMVALUES_AWS_ECS,
      TMP_CLOUDPLATFORMVALUES_AWS_EKS,
      TMP_CLOUDPLATFORMVALUES_AWS_LAMBDA,
      TMP_CLOUDPLATFORMVALUES_AWS_ELASTIC_BEANSTALK,
      TMP_CLOUDPLATFORMVALUES_AZURE_VM,
      TMP_CLOUDPLATFORMVALUES_AZURE_CONTAINER_INSTANCES,
      TMP_CLOUDPLATFORMVALUES_AZURE_AKS,
      TMP_CLOUDPLATFORMVALUES_AZURE_FUNCTIONS,
      TMP_CLOUDPLATFORMVALUES_AZURE_APP_SERVICE,
      TMP_CLOUDPLATFORMVALUES_GCP_COMPUTE_ENGINE,
      TMP_CLOUDPLATFORMVALUES_GCP_CLOUD_RUN,
      TMP_CLOUDPLATFORMVALUES_GCP_KUBERNETES_ENGINE,
      TMP_CLOUDPLATFORMVALUES_GCP_CLOUD_FUNCTIONS,
      TMP_CLOUDPLATFORMVALUES_GCP_APP_ENGINE
    ]);
    var TMP_AWSECSLAUNCHTYPEVALUES_EC2 = "ec2";
    var TMP_AWSECSLAUNCHTYPEVALUES_FARGATE = "fargate";
    exports.AWSECSLAUNCHTYPEVALUES_EC2 = TMP_AWSECSLAUNCHTYPEVALUES_EC2;
    exports.AWSECSLAUNCHTYPEVALUES_FARGATE = TMP_AWSECSLAUNCHTYPEVALUES_FARGATE;
    exports.AwsEcsLaunchtypeValues = /* @__PURE__ */ (0, utils_1.createConstMap)([
      TMP_AWSECSLAUNCHTYPEVALUES_EC2,
      TMP_AWSECSLAUNCHTYPEVALUES_FARGATE
    ]);
    var TMP_HOSTARCHVALUES_AMD64 = "amd64";
    var TMP_HOSTARCHVALUES_ARM32 = "arm32";
    var TMP_HOSTARCHVALUES_ARM64 = "arm64";
    var TMP_HOSTARCHVALUES_IA64 = "ia64";
    var TMP_HOSTARCHVALUES_PPC32 = "ppc32";
    var TMP_HOSTARCHVALUES_PPC64 = "ppc64";
    var TMP_HOSTARCHVALUES_X86 = "x86";
    exports.HOSTARCHVALUES_AMD64 = TMP_HOSTARCHVALUES_AMD64;
    exports.HOSTARCHVALUES_ARM32 = TMP_HOSTARCHVALUES_ARM32;
    exports.HOSTARCHVALUES_ARM64 = TMP_HOSTARCHVALUES_ARM64;
    exports.HOSTARCHVALUES_IA64 = TMP_HOSTARCHVALUES_IA64;
    exports.HOSTARCHVALUES_PPC32 = TMP_HOSTARCHVALUES_PPC32;
    exports.HOSTARCHVALUES_PPC64 = TMP_HOSTARCHVALUES_PPC64;
    exports.HOSTARCHVALUES_X86 = TMP_HOSTARCHVALUES_X86;
    exports.HostArchValues = /* @__PURE__ */ (0, utils_1.createConstMap)([
      TMP_HOSTARCHVALUES_AMD64,
      TMP_HOSTARCHVALUES_ARM32,
      TMP_HOSTARCHVALUES_ARM64,
      TMP_HOSTARCHVALUES_IA64,
      TMP_HOSTARCHVALUES_PPC32,
      TMP_HOSTARCHVALUES_PPC64,
      TMP_HOSTARCHVALUES_X86
    ]);
    var TMP_OSTYPEVALUES_WINDOWS = "windows";
    var TMP_OSTYPEVALUES_LINUX = "linux";
    var TMP_OSTYPEVALUES_DARWIN = "darwin";
    var TMP_OSTYPEVALUES_FREEBSD = "freebsd";
    var TMP_OSTYPEVALUES_NETBSD = "netbsd";
    var TMP_OSTYPEVALUES_OPENBSD = "openbsd";
    var TMP_OSTYPEVALUES_DRAGONFLYBSD = "dragonflybsd";
    var TMP_OSTYPEVALUES_HPUX = "hpux";
    var TMP_OSTYPEVALUES_AIX = "aix";
    var TMP_OSTYPEVALUES_SOLARIS = "solaris";
    var TMP_OSTYPEVALUES_Z_OS = "z_os";
    exports.OSTYPEVALUES_WINDOWS = TMP_OSTYPEVALUES_WINDOWS;
    exports.OSTYPEVALUES_LINUX = TMP_OSTYPEVALUES_LINUX;
    exports.OSTYPEVALUES_DARWIN = TMP_OSTYPEVALUES_DARWIN;
    exports.OSTYPEVALUES_FREEBSD = TMP_OSTYPEVALUES_FREEBSD;
    exports.OSTYPEVALUES_NETBSD = TMP_OSTYPEVALUES_NETBSD;
    exports.OSTYPEVALUES_OPENBSD = TMP_OSTYPEVALUES_OPENBSD;
    exports.OSTYPEVALUES_DRAGONFLYBSD = TMP_OSTYPEVALUES_DRAGONFLYBSD;
    exports.OSTYPEVALUES_HPUX = TMP_OSTYPEVALUES_HPUX;
    exports.OSTYPEVALUES_AIX = TMP_OSTYPEVALUES_AIX;
    exports.OSTYPEVALUES_SOLARIS = TMP_OSTYPEVALUES_SOLARIS;
    exports.OSTYPEVALUES_Z_OS = TMP_OSTYPEVALUES_Z_OS;
    exports.OsTypeValues = /* @__PURE__ */ (0, utils_1.createConstMap)([
      TMP_OSTYPEVALUES_WINDOWS,
      TMP_OSTYPEVALUES_LINUX,
      TMP_OSTYPEVALUES_DARWIN,
      TMP_OSTYPEVALUES_FREEBSD,
      TMP_OSTYPEVALUES_NETBSD,
      TMP_OSTYPEVALUES_OPENBSD,
      TMP_OSTYPEVALUES_DRAGONFLYBSD,
      TMP_OSTYPEVALUES_HPUX,
      TMP_OSTYPEVALUES_AIX,
      TMP_OSTYPEVALUES_SOLARIS,
      TMP_OSTYPEVALUES_Z_OS
    ]);
    var TMP_TELEMETRYSDKLANGUAGEVALUES_CPP = "cpp";
    var TMP_TELEMETRYSDKLANGUAGEVALUES_DOTNET = "dotnet";
    var TMP_TELEMETRYSDKLANGUAGEVALUES_ERLANG = "erlang";
    var TMP_TELEMETRYSDKLANGUAGEVALUES_GO = "go";
    var TMP_TELEMETRYSDKLANGUAGEVALUES_JAVA = "java";
    var TMP_TELEMETRYSDKLANGUAGEVALUES_NODEJS = "nodejs";
    var TMP_TELEMETRYSDKLANGUAGEVALUES_PHP = "php";
    var TMP_TELEMETRYSDKLANGUAGEVALUES_PYTHON = "python";
    var TMP_TELEMETRYSDKLANGUAGEVALUES_RUBY = "ruby";
    var TMP_TELEMETRYSDKLANGUAGEVALUES_WEBJS = "webjs";
    exports.TELEMETRYSDKLANGUAGEVALUES_CPP = TMP_TELEMETRYSDKLANGUAGEVALUES_CPP;
    exports.TELEMETRYSDKLANGUAGEVALUES_DOTNET = TMP_TELEMETRYSDKLANGUAGEVALUES_DOTNET;
    exports.TELEMETRYSDKLANGUAGEVALUES_ERLANG = TMP_TELEMETRYSDKLANGUAGEVALUES_ERLANG;
    exports.TELEMETRYSDKLANGUAGEVALUES_GO = TMP_TELEMETRYSDKLANGUAGEVALUES_GO;
    exports.TELEMETRYSDKLANGUAGEVALUES_JAVA = TMP_TELEMETRYSDKLANGUAGEVALUES_JAVA;
    exports.TELEMETRYSDKLANGUAGEVALUES_NODEJS = TMP_TELEMETRYSDKLANGUAGEVALUES_NODEJS;
    exports.TELEMETRYSDKLANGUAGEVALUES_PHP = TMP_TELEMETRYSDKLANGUAGEVALUES_PHP;
    exports.TELEMETRYSDKLANGUAGEVALUES_PYTHON = TMP_TELEMETRYSDKLANGUAGEVALUES_PYTHON;
    exports.TELEMETRYSDKLANGUAGEVALUES_RUBY = TMP_TELEMETRYSDKLANGUAGEVALUES_RUBY;
    exports.TELEMETRYSDKLANGUAGEVALUES_WEBJS = TMP_TELEMETRYSDKLANGUAGEVALUES_WEBJS;
    exports.TelemetrySdkLanguageValues = /* @__PURE__ */ (0, utils_1.createConstMap)([
      TMP_TELEMETRYSDKLANGUAGEVALUES_CPP,
      TMP_TELEMETRYSDKLANGUAGEVALUES_DOTNET,
      TMP_TELEMETRYSDKLANGUAGEVALUES_ERLANG,
      TMP_TELEMETRYSDKLANGUAGEVALUES_GO,
      TMP_TELEMETRYSDKLANGUAGEVALUES_JAVA,
      TMP_TELEMETRYSDKLANGUAGEVALUES_NODEJS,
      TMP_TELEMETRYSDKLANGUAGEVALUES_PHP,
      TMP_TELEMETRYSDKLANGUAGEVALUES_PYTHON,
      TMP_TELEMETRYSDKLANGUAGEVALUES_RUBY,
      TMP_TELEMETRYSDKLANGUAGEVALUES_WEBJS
    ]);
  }
});

// ../../node_modules/@opentelemetry/semantic-conventions/build/src/resource/index.js
var require_resource = __commonJS({
  "../../node_modules/@opentelemetry/semantic-conventions/build/src/resource/index.js"(exports) {
    "use strict";
    init_esm();
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      Object.defineProperty(o, k2, { enumerable: true, get: function() {
        return m[k];
      } });
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(require_SemanticResourceAttributes(), exports);
  }
});

// ../../node_modules/@opentelemetry/semantic-conventions/build/src/index.js
var require_src3 = __commonJS({
  "../../node_modules/@opentelemetry/semantic-conventions/build/src/index.js"(exports) {
    "use strict";
    init_esm();
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      Object.defineProperty(o, k2, { enumerable: true, get: function() {
        return m[k];
      } });
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(require_trace(), exports);
    __exportStar(require_resource(), exports);
  }
});

// ../../node_modules/@trigger.dev/core/dist/esm/v3/schemas/common.js
init_esm();

// ../../node_modules/@trigger.dev/core/node_modules/zod/lib/index.mjs
init_esm();
var util;
(function(util2) {
  util2.assertEqual = (val) => val;
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  get errors() {
    return this.issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
        fieldErrors[sub.path[0]].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var overrideErrorMap = errorMap;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      ctx.schemaErrorMap,
      overrideMap,
      overrideMap === errorMap ? void 0 : errorMap
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message === null || message === void 0 ? void 0 : message.message;
})(errorUtil || (errorUtil = {}));
var _ZodEnum_cache;
var _ZodNativeEnum_cache;
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (this._key instanceof Array) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    var _a, _b;
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message !== null && message !== void 0 ? message : ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: (_a = message !== null && message !== void 0 ? message : required_error) !== null && _a !== void 0 ? _a : ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: (_b = message !== null && message !== void 0 ? message : invalid_type_error) !== null && _b !== void 0 ? _b : ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
  }
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    var _a;
    const ctx = {
      common: {
        issues: [],
        async: (_a = params === null || params === void 0 ? void 0 : params.async) !== null && _a !== void 0 ? _a : false,
        contextualErrorMap: params === null || params === void 0 ? void 0 : params.errorMap
      },
      path: (params === null || params === void 0 ? void 0 : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params === null || params === void 0 ? void 0 : params.errorMap,
        async: true
      },
      path: (params === null || params === void 0 ? void 0 : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this, this._def);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv6Regex = /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let regex = `([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d`;
  if (args.precision) {
    regex = `${regex}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    regex = `${regex}(\\.\\d+)?`;
  }
  return regex;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch (_a) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    var _a, _b;
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof (options === null || options === void 0 ? void 0 : options.precision) === "undefined" ? null : options === null || options === void 0 ? void 0 : options.precision,
      offset: (_a = options === null || options === void 0 ? void 0 : options.offset) !== null && _a !== void 0 ? _a : false,
      local: (_b = options === null || options === void 0 ? void 0 : options.local) !== null && _b !== void 0 ? _b : false,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof (options === null || options === void 0 ? void 0 : options.precision) === "undefined" ? null : options === null || options === void 0 ? void 0 : options.precision,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options === null || options === void 0 ? void 0 : options.position,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * @deprecated Use z.string().min(1) instead.
   * @see {@link ZodString.min}
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  var _a;
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: (_a = params === null || params === void 0 ? void 0 : params.coerce) !== null && _a !== void 0 ? _a : false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / Math.pow(10, decCount);
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null, min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = BigInt(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.bigint,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  var _a;
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: (_a = params === null || params === void 0 ? void 0 : params.coerce) !== null && _a !== void 0 ? _a : false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    return this._cached = { shape, keys };
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") ;
      else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          var _a, _b, _c, _d;
          const defaultError = (_c = (_b = (_a = this._def).errorMap) === null || _b === void 0 ? void 0 : _b.call(_a, issue, ctx).message) !== null && _c !== void 0 ? _c : ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: (_d = errorUtil.errToObj(message).message) !== null && _d !== void 0 ? _d : defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    util.objectKeys(mask).forEach((key) => {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    util.objectKeys(this.shape).forEach((key) => {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    util.objectKeys(this.shape).forEach((key) => {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    util.objectKeys(this.shape).forEach((key) => {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [
          ctx.common.contextualErrorMap,
          ctx.schemaErrorMap,
          getErrorMap(),
          errorMap
        ].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [
          ctx.common.contextualErrorMap,
          ctx.schemaErrorMap,
          getErrorMap(),
          errorMap
        ].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  constructor() {
    super(...arguments);
    _ZodEnum_cache.set(this, void 0);
  }
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f")) {
      __classPrivateFieldSet(this, _ZodEnum_cache, new Set(this._def.values), "f");
    }
    if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f").has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
_ZodEnum_cache = /* @__PURE__ */ new WeakMap();
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  constructor() {
    super(...arguments);
    _ZodNativeEnum_cache.set(this, void 0);
  }
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f")) {
      __classPrivateFieldSet(this, _ZodNativeEnum_cache, new Set(util.getValidEnumValues(this._def.values)), "f");
    }
    if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f").has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
_ZodNativeEnum_cache = /* @__PURE__ */ new WeakMap();
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return base;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return base;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({ status: status.value, value: result }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function custom(check, params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      var _a, _b;
      if (!check(data)) {
        const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
        const _fatal = (_b = (_a = p.fatal) !== null && _a !== void 0 ? _a : fatal) !== null && _b !== void 0 ? _b : true;
        const p2 = typeof p === "string" ? { message: p } : p;
        ctx.addIssue({ code: "custom", ...p2, fatal: _fatal });
      }
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: (arg) => ZodString.create({ ...arg, coerce: true }),
  number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
  boolean: (arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  }),
  bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
  date: (arg) => ZodDate.create({ ...arg, coerce: true })
};
var NEVER = INVALID;
var z = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  defaultErrorMap: errorMap,
  setErrorMap,
  getErrorMap,
  makeIssue,
  EMPTY_PATH,
  addIssueToContext,
  ParseStatus,
  INVALID,
  DIRTY,
  OK,
  isAborted,
  isDirty,
  isValid,
  isAsync,
  get util() {
    return util;
  },
  get objectUtil() {
    return objectUtil;
  },
  ZodParsedType,
  getParsedType,
  ZodType,
  datetimeRegex,
  ZodString,
  ZodNumber,
  ZodBigInt,
  ZodBoolean,
  ZodDate,
  ZodSymbol,
  ZodUndefined,
  ZodNull,
  ZodAny,
  ZodUnknown,
  ZodNever,
  ZodVoid,
  ZodArray,
  ZodObject,
  ZodUnion,
  ZodDiscriminatedUnion,
  ZodIntersection,
  ZodTuple,
  ZodRecord,
  ZodMap,
  ZodSet,
  ZodFunction,
  ZodLazy,
  ZodLiteral,
  ZodEnum,
  ZodNativeEnum,
  ZodPromise,
  ZodEffects,
  ZodTransformer: ZodEffects,
  ZodOptional,
  ZodNullable,
  ZodDefault,
  ZodCatch,
  ZodNaN,
  BRAND,
  ZodBranded,
  ZodPipeline,
  ZodReadonly,
  custom,
  Schema: ZodType,
  ZodSchema: ZodType,
  late,
  get ZodFirstPartyTypeKind() {
    return ZodFirstPartyTypeKind;
  },
  coerce,
  any: anyType,
  array: arrayType,
  bigint: bigIntType,
  boolean: booleanType,
  date: dateType,
  discriminatedUnion: discriminatedUnionType,
  effect: effectsType,
  "enum": enumType,
  "function": functionType,
  "instanceof": instanceOfType,
  intersection: intersectionType,
  lazy: lazyType,
  literal: literalType,
  map: mapType,
  nan: nanType,
  nativeEnum: nativeEnumType,
  never: neverType,
  "null": nullType,
  nullable: nullableType,
  number: numberType,
  object: objectType,
  oboolean,
  onumber,
  optional: optionalType,
  ostring,
  pipeline: pipelineType,
  preprocess: preprocessType,
  promise: promiseType,
  record: recordType,
  set: setType,
  strictObject: strictObjectType,
  string: stringType,
  symbol: symbolType,
  transformer: effectsType,
  tuple: tupleType,
  "undefined": undefinedType,
  union: unionType,
  unknown: unknownType,
  "void": voidType,
  NEVER,
  ZodIssueCode,
  quotelessJson,
  ZodError
});

// ../../node_modules/@trigger.dev/core/dist/esm/schemas/json.js
init_esm();
var LiteralSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
var DeserializedJsonSchema = z.lazy(() => z.union([LiteralSchema, z.array(DeserializedJsonSchema), z.record(DeserializedJsonSchema)]));
var SerializableSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.date(),
  z.undefined(),
  z.symbol()
]);
var SerializableJsonSchema = z.lazy(() => z.union([SerializableSchema, z.array(SerializableJsonSchema), z.record(SerializableJsonSchema)]));

// ../../node_modules/@trigger.dev/core/dist/esm/v3/schemas/common.js
var RunMetadataUpdateOperation = z.object({
  type: z.literal("update"),
  value: z.record(z.unknown())
});
var RunMetadataSetKeyOperation = z.object({
  type: z.literal("set"),
  key: z.string(),
  value: DeserializedJsonSchema
});
var RunMetadataDeleteKeyOperation = z.object({
  type: z.literal("delete"),
  key: z.string()
});
var RunMetadataAppendKeyOperation = z.object({
  type: z.literal("append"),
  key: z.string(),
  value: DeserializedJsonSchema
});
var RunMetadataRemoveFromKeyOperation = z.object({
  type: z.literal("remove"),
  key: z.string(),
  value: DeserializedJsonSchema
});
var RunMetadataIncrementKeyOperation = z.object({
  type: z.literal("increment"),
  key: z.string(),
  value: z.number()
});
var RunMetadataChangeOperation = z.discriminatedUnion("type", [
  RunMetadataUpdateOperation,
  RunMetadataSetKeyOperation,
  RunMetadataDeleteKeyOperation,
  RunMetadataAppendKeyOperation,
  RunMetadataRemoveFromKeyOperation,
  RunMetadataIncrementKeyOperation
]);
var FlushedRunMetadata = z.object({
  metadata: z.record(DeserializedJsonSchema).optional(),
  operations: z.array(RunMetadataChangeOperation).optional(),
  parentOperations: z.array(RunMetadataChangeOperation).optional(),
  rootOperations: z.array(RunMetadataChangeOperation).optional()
});
var MachineCpu = z.union([
  z.literal(0.25),
  z.literal(0.5),
  z.literal(1),
  z.literal(2),
  z.literal(4)
]);
var MachineMemory = z.union([
  z.literal(0.25),
  z.literal(0.5),
  z.literal(1),
  z.literal(2),
  z.literal(4),
  z.literal(8)
]);
var MachinePresetName = z.enum([
  "micro",
  "small-1x",
  "small-2x",
  "medium-1x",
  "medium-2x",
  "large-1x",
  "large-2x"
]);
var MachineConfig = z.object({
  cpu: MachineCpu.optional(),
  memory: MachineMemory.optional(),
  preset: MachinePresetName.optional()
});
var MachinePreset = z.object({
  name: MachinePresetName,
  cpu: z.number(),
  memory: z.number(),
  centsPerMs: z.number()
});
var TaskRunBuiltInError = z.object({
  type: z.literal("BUILT_IN_ERROR"),
  name: z.string(),
  message: z.string(),
  stackTrace: z.string()
});
var TaskRunCustomErrorObject = z.object({
  type: z.literal("CUSTOM_ERROR"),
  raw: z.string()
});
var TaskRunStringError = z.object({
  type: z.literal("STRING_ERROR"),
  raw: z.string()
});
var TaskRunInternalError = z.object({
  type: z.literal("INTERNAL_ERROR"),
  code: z.enum([
    "COULD_NOT_FIND_EXECUTOR",
    "COULD_NOT_FIND_TASK",
    "COULD_NOT_IMPORT_TASK",
    "CONFIGURED_INCORRECTLY",
    "TASK_ALREADY_RUNNING",
    "TASK_EXECUTION_FAILED",
    "TASK_EXECUTION_ABORTED",
    "TASK_PROCESS_EXITED_WITH_NON_ZERO_CODE",
    "TASK_PROCESS_SIGKILL_TIMEOUT",
    "TASK_PROCESS_SIGSEGV",
    "TASK_PROCESS_SIGTERM",
    "TASK_PROCESS_OOM_KILLED",
    "TASK_PROCESS_MAYBE_OOM_KILLED",
    "TASK_RUN_CANCELLED",
    "TASK_INPUT_ERROR",
    "TASK_OUTPUT_ERROR",
    "HANDLE_ERROR_ERROR",
    "GRACEFUL_EXIT_TIMEOUT",
    "TASK_RUN_HEARTBEAT_TIMEOUT",
    "TASK_RUN_CRASHED",
    "MAX_DURATION_EXCEEDED",
    "DISK_SPACE_EXCEEDED",
    "POD_EVICTED",
    "POD_UNKNOWN_ERROR",
    "OUTDATED_SDK_VERSION",
    "TASK_DID_CONCURRENT_WAIT",
    "RECURSIVE_WAIT_DEADLOCK"
  ]),
  message: z.string().optional(),
  stackTrace: z.string().optional()
});
var TaskRunErrorCodes = TaskRunInternalError.shape.code.enum;
var TaskRunError = z.discriminatedUnion("type", [
  TaskRunBuiltInError,
  TaskRunCustomErrorObject,
  TaskRunStringError,
  TaskRunInternalError
]);
var TaskRun = z.object({
  id: z.string(),
  payload: z.string(),
  payloadType: z.string(),
  context: z.any(),
  tags: z.array(z.string()),
  isTest: z.boolean().default(false),
  createdAt: z.coerce.date(),
  startedAt: z.coerce.date().default(() => /* @__PURE__ */ new Date()),
  idempotencyKey: z.string().optional(),
  maxAttempts: z.number().optional(),
  durationMs: z.number().default(0),
  costInCents: z.number().default(0),
  baseCostInCents: z.number().default(0),
  version: z.string().optional(),
  metadata: z.record(DeserializedJsonSchema).optional(),
  maxDuration: z.number().optional()
});
var TaskRunExecutionTask = z.object({
  id: z.string(),
  filePath: z.string(),
  exportName: z.string()
});
var TaskRunExecutionAttempt = z.object({
  id: z.string(),
  number: z.number(),
  startedAt: z.coerce.date(),
  backgroundWorkerId: z.string(),
  backgroundWorkerTaskId: z.string(),
  status: z.string()
});
var TaskRunExecutionEnvironment = z.object({
  id: z.string(),
  slug: z.string(),
  type: z.enum(["PRODUCTION", "STAGING", "DEVELOPMENT", "PREVIEW"])
});
var TaskRunExecutionOrganization = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string()
});
var TaskRunExecutionProject = z.object({
  id: z.string(),
  ref: z.string(),
  slug: z.string(),
  name: z.string()
});
var TaskRunExecutionQueue = z.object({
  id: z.string(),
  name: z.string()
});
var TaskRunExecutionBatch = z.object({
  id: z.string()
});
var TaskRunExecution = z.object({
  task: TaskRunExecutionTask,
  attempt: TaskRunExecutionAttempt,
  run: TaskRun,
  queue: TaskRunExecutionQueue,
  environment: TaskRunExecutionEnvironment,
  organization: TaskRunExecutionOrganization,
  project: TaskRunExecutionProject,
  batch: TaskRunExecutionBatch.optional(),
  machine: MachinePreset.optional()
});
var TaskRunContext = z.object({
  task: TaskRunExecutionTask,
  attempt: TaskRunExecutionAttempt.omit({
    backgroundWorkerId: true,
    backgroundWorkerTaskId: true
  }),
  run: TaskRun.omit({ payload: true, payloadType: true, metadata: true }),
  queue: TaskRunExecutionQueue,
  environment: TaskRunExecutionEnvironment,
  organization: TaskRunExecutionOrganization,
  project: TaskRunExecutionProject,
  batch: TaskRunExecutionBatch.optional(),
  machine: MachinePreset.optional()
});
var TaskRunExecutionRetry = z.object({
  timestamp: z.number(),
  delay: z.number(),
  error: z.unknown().optional()
});
var TaskRunExecutionUsage = z.object({
  durationMs: z.number()
});
var TaskRunFailedExecutionResult = z.object({
  ok: z.literal(false),
  id: z.string(),
  error: TaskRunError,
  retry: TaskRunExecutionRetry.optional(),
  skippedRetrying: z.boolean().optional(),
  usage: TaskRunExecutionUsage.optional(),
  // Optional for now for backwards compatibility
  taskIdentifier: z.string().optional(),
  metadata: FlushedRunMetadata.optional()
});
var TaskRunSuccessfulExecutionResult = z.object({
  ok: z.literal(true),
  id: z.string(),
  output: z.string().optional(),
  outputType: z.string(),
  usage: TaskRunExecutionUsage.optional(),
  // Optional for now for backwards compatibility
  taskIdentifier: z.string().optional(),
  metadata: FlushedRunMetadata.optional()
});
var TaskRunExecutionResult = z.discriminatedUnion("ok", [
  TaskRunSuccessfulExecutionResult,
  TaskRunFailedExecutionResult
]);
var BatchTaskRunExecutionResult = z.object({
  id: z.string(),
  items: TaskRunExecutionResult.array()
});
var SerializedError = z.object({
  message: z.string(),
  name: z.string().optional(),
  stackTrace: z.string().optional()
});

// ../../node_modules/@trigger.dev/core/dist/esm/v3/schemas/build.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/schemas/config.js
init_esm();
var ConfigManifest = z.object({
  project: z.string(),
  dirs: z.string().array()
});

// ../../node_modules/@trigger.dev/core/dist/esm/v3/schemas/schemas.js
init_esm();
var EnvironmentType = z.enum(["PRODUCTION", "STAGING", "DEVELOPMENT", "PREVIEW"]);
var TaskRunExecutionMetric = z.object({
  name: z.string(),
  event: z.string(),
  timestamp: z.number(),
  duration: z.number()
});
var TaskRunExecutionMetrics = z.array(TaskRunExecutionMetric);
var TaskRunExecutionPayload = z.object({
  execution: TaskRunExecution,
  traceContext: z.record(z.unknown()),
  environment: z.record(z.string()).optional(),
  metrics: TaskRunExecutionMetrics.optional()
});
var ProdTaskRunExecution = TaskRunExecution.extend({
  worker: z.object({
    id: z.string(),
    contentHash: z.string(),
    version: z.string()
  }),
  machine: MachinePreset.default({ name: "small-1x", cpu: 1, memory: 1, centsPerMs: 0 })
});
var ProdTaskRunExecutionPayload = z.object({
  execution: ProdTaskRunExecution,
  traceContext: z.record(z.unknown()),
  environment: z.record(z.string()).optional(),
  metrics: TaskRunExecutionMetrics.optional()
});
var FixedWindowRateLimit = z.object({
  type: z.literal("fixed-window"),
  limit: z.number(),
  window: z.union([
    z.object({
      seconds: z.number()
    }),
    z.object({
      minutes: z.number()
    }),
    z.object({
      hours: z.number()
    })
  ])
});
var SlidingWindowRateLimit = z.object({
  type: z.literal("sliding-window"),
  limit: z.number(),
  window: z.union([
    z.object({
      seconds: z.number()
    }),
    z.object({
      minutes: z.number()
    }),
    z.object({
      hours: z.number()
    })
  ])
});
var RateLimitOptions = z.discriminatedUnion("type", [
  FixedWindowRateLimit,
  SlidingWindowRateLimit
]);
var RetryOptions = z.object({
  /** The number of attempts before giving up */
  maxAttempts: z.number().int().optional(),
  /** The exponential factor to use when calculating the next retry time.
   *
   * Each subsequent retry will be calculated as `previousTimeout * factor`
   */
  factor: z.number().optional(),
  /** The minimum time to wait before retrying */
  minTimeoutInMs: z.number().int().optional(),
  /** The maximum time to wait before retrying */
  maxTimeoutInMs: z.number().int().optional(),
  /** Randomize the timeout between retries.
   *
   * This can be useful to prevent the thundering herd problem where all retries happen at the same time.
   */
  randomize: z.boolean().optional(),
  /** If a run fails with an Out Of Memory (OOM) error and you have this set, it will retry with the machine you specify.
   * Note: it will not default to this [machine](https://trigger.dev/docs/machines) for new runs, only for failures caused by OOM errors.
   * So if you frequently have attempts failing with OOM errors, you should set the [default machine](https://trigger.dev/docs/machines) to be higher.
   */
  outOfMemory: z.object({
    machine: MachinePresetName.optional()
  }).optional()
});
var QueueOptions = z.object({
  /** You can define a shared queue and then pass the name in to your task.
     *
     * @example
     *
     * ```ts
     * const myQueue = queue({
        name: "my-queue",
        concurrencyLimit: 1,
      });
  
      export const task1 = task({
        id: "task-1",
        queue: {
          name: "my-queue",
        },
        run: async (payload: { message: string }) => {
          // ...
        },
      });
  
      export const task2 = task({
        id: "task-2",
        queue: {
          name: "my-queue",
        },
        run: async (payload: { message: string }) => {
          // ...
        },
      });
     * ```
     */
  name: z.string().optional(),
  /** An optional property that specifies the maximum number of concurrent run executions.
   *
   * If this property is omitted, the task can potentially use up the full concurrency of an environment */
  concurrencyLimit: z.number().int().min(0).max(1e3).optional().nullable()
});
var ScheduleMetadata = z.object({
  cron: z.string(),
  timezone: z.string()
});
var taskMetadata = {
  id: z.string(),
  description: z.string().optional(),
  queue: QueueOptions.optional(),
  retry: RetryOptions.optional(),
  machine: MachineConfig.optional(),
  triggerSource: z.string().optional(),
  schedule: ScheduleMetadata.optional(),
  maxDuration: z.number().optional()
};
var TaskMetadata = z.object(taskMetadata);
var TaskFile = z.object({
  entry: z.string(),
  out: z.string()
});
var taskFileMetadata = {
  filePath: z.string(),
  exportName: z.string(),
  entryPoint: z.string()
};
var TaskFileMetadata = z.object(taskFileMetadata);
var TaskManifest = z.object({
  ...taskMetadata,
  ...taskFileMetadata
});
var PostStartCauses = z.enum(["index", "create", "restore"]);
var PreStopCauses = z.enum(["terminate"]);
var RegexSchema = z.custom((val) => {
  try {
    return typeof val.test === "function";
  } catch {
    return false;
  }
});
var Config = z.object({
  project: z.string(),
  triggerDirectories: z.string().array().optional(),
  triggerUrl: z.string().optional(),
  projectDir: z.string().optional(),
  tsconfigPath: z.string().optional(),
  retries: z.object({
    enabledInDev: z.boolean().default(true),
    default: RetryOptions.optional()
  }).optional(),
  additionalPackages: z.string().array().optional(),
  additionalFiles: z.string().array().optional(),
  dependenciesToBundle: z.array(z.union([z.string(), RegexSchema])).optional(),
  logLevel: z.string().optional(),
  enableConsoleLogging: z.boolean().optional(),
  postInstall: z.string().optional(),
  extraCACerts: z.string().optional()
});
var WaitReason = z.enum(["WAIT_FOR_DURATION", "WAIT_FOR_TASK", "WAIT_FOR_BATCH"]);
var TaskRunExecutionLazyAttemptPayload = z.object({
  runId: z.string(),
  attemptCount: z.number().optional(),
  messageId: z.string(),
  isTest: z.boolean(),
  traceContext: z.record(z.unknown()),
  environment: z.record(z.string()).optional(),
  metrics: TaskRunExecutionMetrics.optional()
});
var ManualCheckpointMetadata = z.object({
  /** NOT a friendly ID */
  attemptId: z.string(),
  previousRunStatus: z.string(),
  previousAttemptStatus: z.string()
});

// ../../node_modules/@trigger.dev/core/dist/esm/v3/schemas/build.js
var BuildExternal = z.object({
  name: z.string(),
  version: z.string()
});
var BuildTarget = z.enum(["dev", "deploy"]);
var BuildRuntime = z.enum(["node", "bun"]);
var BuildManifest = z.object({
  target: BuildTarget,
  packageVersion: z.string(),
  cliPackageVersion: z.string(),
  contentHash: z.string(),
  runtime: BuildRuntime,
  environment: z.string(),
  config: ConfigManifest,
  files: z.array(TaskFile),
  sources: z.record(z.object({
    contents: z.string(),
    contentHash: z.string()
  })),
  outputPath: z.string(),
  runWorkerEntryPoint: z.string(),
  // Dev & Deploy has a runWorkerEntryPoint
  runControllerEntryPoint: z.string().optional(),
  // Only deploy has a runControllerEntryPoint
  indexWorkerEntryPoint: z.string(),
  // Dev & Deploy has a indexWorkerEntryPoint
  indexControllerEntryPoint: z.string().optional(),
  // Only deploy has a indexControllerEntryPoint
  loaderEntryPoint: z.string().optional(),
  configPath: z.string(),
  externals: BuildExternal.array().optional(),
  build: z.object({
    env: z.record(z.string()).optional(),
    commands: z.array(z.string()).optional()
  }),
  customConditions: z.array(z.string()).optional(),
  deploy: z.object({
    env: z.record(z.string()).optional(),
    sync: z.object({
      env: z.record(z.string()).optional()
    }).optional()
  }),
  image: z.object({
    pkgs: z.array(z.string()).optional(),
    instructions: z.array(z.string()).optional()
  }).optional(),
  otelImportHook: z.object({
    include: z.array(z.string()).optional(),
    exclude: z.array(z.string()).optional()
  }).optional()
});
var IndexMessage = z.object({
  type: z.literal("index"),
  data: z.object({
    build: BuildManifest
  })
});
var WorkerManifest = z.object({
  configPath: z.string(),
  tasks: TaskManifest.array(),
  workerEntryPoint: z.string(),
  controllerEntryPoint: z.string().optional(),
  loaderEntryPoint: z.string().optional(),
  runtime: BuildRuntime,
  customConditions: z.array(z.string()).optional(),
  otelImportHook: z.object({
    include: z.array(z.string()).optional(),
    exclude: z.array(z.string()).optional()
  }).optional()
});
var WorkerManifestMessage = z.object({
  type: z.literal("worker-manifest"),
  data: z.object({
    manifest: WorkerManifest
  })
});
var ImportError = z.object({
  message: z.string(),
  file: z.string(),
  stack: z.string().optional(),
  name: z.string().optional()
});
var ImportTaskFileErrors = z.array(ImportError);

// ../../node_modules/@trigger.dev/core/dist/esm/v3/schemas/messages.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/schemas/resources.js
init_esm();
var TaskResource = z.object({
  id: z.string(),
  description: z.string().optional(),
  filePath: z.string(),
  exportName: z.string(),
  queue: QueueOptions.optional(),
  retry: RetryOptions.optional(),
  machine: MachineConfig.optional(),
  triggerSource: z.string().optional(),
  schedule: ScheduleMetadata.optional(),
  maxDuration: z.number().optional()
});
var BackgroundWorkerSourceFileMetadata = z.object({
  filePath: z.string(),
  contents: z.string(),
  contentHash: z.string(),
  taskIds: z.array(z.string())
});
var BackgroundWorkerMetadata = z.object({
  packageVersion: z.string(),
  contentHash: z.string(),
  cliPackageVersion: z.string().optional(),
  tasks: z.array(TaskResource),
  sourceFiles: z.array(BackgroundWorkerSourceFileMetadata).optional()
});
var ImageDetailsMetadata = z.object({
  contentHash: z.string(),
  imageTag: z.string()
});

// ../../node_modules/@trigger.dev/core/dist/esm/v3/schemas/messages.js
var AckCallbackResult = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(false),
    error: z.object({
      name: z.string(),
      message: z.string(),
      stack: z.string().optional(),
      stderr: z.string().optional()
    })
  }),
  z.object({
    success: z.literal(true)
  })
]);
var BackgroundWorkerServerMessages = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("CANCEL_ATTEMPT"),
    taskAttemptId: z.string(),
    taskRunId: z.string()
  }),
  z.object({
    type: z.literal("SCHEDULE_ATTEMPT"),
    image: z.string(),
    version: z.string(),
    machine: MachinePreset,
    nextAttemptNumber: z.number().optional(),
    // identifiers
    id: z.string().optional(),
    // TODO: Remove this completely in a future release
    envId: z.string(),
    envType: EnvironmentType,
    orgId: z.string(),
    projectId: z.string(),
    runId: z.string(),
    dequeuedAt: z.number().optional()
  }),
  z.object({
    type: z.literal("EXECUTE_RUN_LAZY_ATTEMPT"),
    payload: TaskRunExecutionLazyAttemptPayload
  })
]);
var serverWebsocketMessages = {
  SERVER_READY: z.object({
    version: z.literal("v1").default("v1"),
    id: z.string()
  }),
  BACKGROUND_WORKER_MESSAGE: z.object({
    version: z.literal("v1").default("v1"),
    backgroundWorkerId: z.string(),
    data: BackgroundWorkerServerMessages
  })
};
var BackgroundWorkerClientMessages = z.discriminatedUnion("type", [
  z.object({
    version: z.literal("v1").default("v1"),
    type: z.literal("TASK_RUN_COMPLETED"),
    completion: TaskRunExecutionResult,
    execution: TaskRunExecution
  }),
  z.object({
    version: z.literal("v1").default("v1"),
    type: z.literal("TASK_RUN_FAILED_TO_RUN"),
    completion: TaskRunFailedExecutionResult
  }),
  z.object({
    version: z.literal("v1").default("v1"),
    type: z.literal("TASK_HEARTBEAT"),
    id: z.string()
  }),
  z.object({
    version: z.literal("v1").default("v1"),
    type: z.literal("TASK_RUN_HEARTBEAT"),
    id: z.string()
  })
]);
var ServerBackgroundWorker = z.object({
  id: z.string(),
  version: z.string(),
  contentHash: z.string()
});
var clientWebsocketMessages = {
  READY_FOR_TASKS: z.object({
    version: z.literal("v1").default("v1"),
    backgroundWorkerId: z.string(),
    inProgressRuns: z.string().array().optional()
  }),
  BACKGROUND_WORKER_DEPRECATED: z.object({
    version: z.literal("v1").default("v1"),
    backgroundWorkerId: z.string()
  }),
  BACKGROUND_WORKER_MESSAGE: z.object({
    version: z.literal("v1").default("v1"),
    backgroundWorkerId: z.string(),
    data: BackgroundWorkerClientMessages
  })
};
var UncaughtExceptionMessage = z.object({
  version: z.literal("v1").default("v1"),
  error: z.object({
    name: z.string(),
    message: z.string(),
    stack: z.string().optional()
  }),
  origin: z.enum(["uncaughtException", "unhandledRejection"])
});
var TaskMetadataFailedToParseData = z.object({
  version: z.literal("v1").default("v1"),
  tasks: z.unknown(),
  zodIssues: z.custom((v) => {
    return Array.isArray(v) && v.every((issue) => typeof issue === "object" && "message" in issue);
  })
});
var indexerToWorkerMessages = {
  INDEX_COMPLETE: z.object({
    version: z.literal("v1").default("v1"),
    manifest: WorkerManifest,
    importErrors: ImportTaskFileErrors
  }),
  TASKS_FAILED_TO_PARSE: TaskMetadataFailedToParseData,
  UNCAUGHT_EXCEPTION: UncaughtExceptionMessage
};
var ExecutorToWorkerMessageCatalog = {
  TASK_RUN_COMPLETED: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      execution: TaskRunExecution,
      result: TaskRunExecutionResult
    })
  },
  TASK_HEARTBEAT: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      id: z.string()
    })
  },
  READY_TO_DISPOSE: {
    message: z.undefined()
  },
  WAIT_FOR_DURATION: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      ms: z.number(),
      now: z.number(),
      waitThresholdInMs: z.number()
    })
  },
  WAIT_FOR_TASK: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      friendlyId: z.string()
    })
  },
  WAIT_FOR_BATCH: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      batchFriendlyId: z.string(),
      runFriendlyIds: z.string().array()
    })
  },
  UNCAUGHT_EXCEPTION: {
    message: UncaughtExceptionMessage
  }
};
var WorkerToExecutorMessageCatalog = {
  EXECUTE_TASK_RUN: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      execution: TaskRunExecution,
      traceContext: z.record(z.unknown()),
      metadata: ServerBackgroundWorker,
      metrics: TaskRunExecutionMetrics.optional()
    })
  },
  TASK_RUN_COMPLETED_NOTIFICATION: {
    message: z.discriminatedUnion("version", [
      z.object({
        version: z.literal("v1"),
        completion: TaskRunExecutionResult,
        execution: TaskRunExecution
      }),
      z.object({
        version: z.literal("v2"),
        completion: TaskRunExecutionResult
      })
    ])
  },
  WAIT_COMPLETED_NOTIFICATION: {
    message: z.object({
      version: z.literal("v1").default("v1")
    })
  },
  FLUSH: {
    message: z.object({
      timeoutInMs: z.number()
    }),
    callback: z.void()
  }
};
var ProviderToPlatformMessages = {
  LOG: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      data: z.string()
    })
  },
  LOG_WITH_ACK: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      data: z.string()
    }),
    callback: z.object({
      status: z.literal("ok")
    })
  },
  WORKER_CRASHED: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      runId: z.string(),
      reason: z.string().optional(),
      exitCode: z.number().optional(),
      message: z.string().optional(),
      logs: z.string().optional(),
      /** This means we should only update the error if one exists */
      overrideCompletion: z.boolean().optional(),
      errorCode: TaskRunInternalError.shape.code.optional()
    })
  },
  INDEXING_FAILED: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      deploymentId: z.string(),
      error: z.object({
        name: z.string(),
        message: z.string(),
        stack: z.string().optional(),
        stderr: z.string().optional()
      }),
      overrideCompletion: z.boolean().optional()
    })
  }
};
var PlatformToProviderMessages = {
  INDEX: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      imageTag: z.string(),
      shortCode: z.string(),
      apiKey: z.string(),
      apiUrl: z.string(),
      // identifiers
      envId: z.string(),
      envType: EnvironmentType,
      orgId: z.string(),
      projectId: z.string(),
      deploymentId: z.string()
    }),
    callback: AckCallbackResult
  },
  RESTORE: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      type: z.enum(["DOCKER", "KUBERNETES"]),
      location: z.string(),
      reason: z.string().optional(),
      imageRef: z.string(),
      attemptNumber: z.number().optional(),
      machine: MachinePreset,
      // identifiers
      checkpointId: z.string(),
      envId: z.string(),
      envType: EnvironmentType,
      orgId: z.string(),
      projectId: z.string(),
      runId: z.string()
    })
  },
  PRE_PULL_DEPLOYMENT: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      imageRef: z.string(),
      shortCode: z.string(),
      // identifiers
      envId: z.string(),
      envType: EnvironmentType,
      orgId: z.string(),
      projectId: z.string(),
      deploymentId: z.string()
    })
  }
};
var CreateWorkerMessage = z.object({
  projectRef: z.string(),
  envId: z.string(),
  deploymentId: z.string(),
  metadata: z.object({
    cliPackageVersion: z.string().optional(),
    contentHash: z.string(),
    packageVersion: z.string(),
    tasks: TaskResource.array()
  })
});
var CoordinatorToPlatformMessages = {
  LOG: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      metadata: z.any(),
      text: z.string()
    })
  },
  CREATE_WORKER: {
    message: z.discriminatedUnion("version", [
      CreateWorkerMessage.extend({
        version: z.literal("v1")
      }),
      CreateWorkerMessage.extend({
        version: z.literal("v2"),
        supportsLazyAttempts: z.boolean()
      })
    ]),
    callback: z.discriminatedUnion("success", [
      z.object({
        success: z.literal(false)
      }),
      z.object({
        success: z.literal(true)
      })
    ])
  },
  CREATE_TASK_RUN_ATTEMPT: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      runId: z.string(),
      envId: z.string()
    }),
    callback: z.discriminatedUnion("success", [
      z.object({
        success: z.literal(false),
        reason: z.string().optional()
      }),
      z.object({
        success: z.literal(true),
        executionPayload: ProdTaskRunExecutionPayload
      })
    ])
  },
  // Deprecated: Only workers without lazy attempt support will use this
  READY_FOR_EXECUTION: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      runId: z.string(),
      totalCompletions: z.number()
    }),
    callback: z.discriminatedUnion("success", [
      z.object({
        success: z.literal(false)
      }),
      z.object({
        success: z.literal(true),
        payload: ProdTaskRunExecutionPayload
      })
    ])
  },
  READY_FOR_LAZY_ATTEMPT: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      runId: z.string(),
      envId: z.string(),
      totalCompletions: z.number()
    }),
    callback: z.discriminatedUnion("success", [
      z.object({
        success: z.literal(false),
        reason: z.string().optional()
      }),
      z.object({
        success: z.literal(true),
        lazyPayload: TaskRunExecutionLazyAttemptPayload
      })
    ])
  },
  READY_FOR_RESUME: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      attemptFriendlyId: z.string(),
      type: WaitReason
    })
  },
  TASK_RUN_COMPLETED: {
    message: z.object({
      version: z.enum(["v1", "v2"]).default("v1"),
      execution: ProdTaskRunExecution,
      completion: TaskRunExecutionResult,
      checkpoint: z.object({
        docker: z.boolean(),
        location: z.string()
      }).optional()
    })
  },
  TASK_RUN_COMPLETED_WITH_ACK: {
    message: z.object({
      version: z.enum(["v1", "v2"]).default("v2"),
      execution: ProdTaskRunExecution,
      completion: TaskRunExecutionResult,
      checkpoint: z.object({
        docker: z.boolean(),
        location: z.string()
      }).optional()
    }),
    callback: AckCallbackResult
  },
  TASK_RUN_FAILED_TO_RUN: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      completion: TaskRunFailedExecutionResult
    })
  },
  TASK_HEARTBEAT: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      attemptFriendlyId: z.string()
    })
  },
  TASK_RUN_HEARTBEAT: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      runId: z.string()
    })
  },
  CHECKPOINT_CREATED: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      runId: z.string().optional(),
      attemptFriendlyId: z.string(),
      docker: z.boolean(),
      location: z.string(),
      reason: z.discriminatedUnion("type", [
        z.object({
          type: z.literal("WAIT_FOR_DURATION"),
          ms: z.number(),
          now: z.number()
        }),
        z.object({
          type: z.literal("WAIT_FOR_BATCH"),
          batchFriendlyId: z.string(),
          runFriendlyIds: z.string().array()
        }),
        z.object({
          type: z.literal("WAIT_FOR_TASK"),
          friendlyId: z.string()
        }),
        z.object({
          type: z.literal("RETRYING_AFTER_FAILURE"),
          attemptNumber: z.number()
        }),
        z.object({
          type: z.literal("MANUAL"),
          /** If unspecified it will be restored immediately, e.g. for live migration */
          restoreAtUnixTimeMs: z.number().optional()
        })
      ])
    }),
    callback: z.object({
      version: z.literal("v1").default("v1"),
      keepRunAlive: z.boolean()
    })
  },
  INDEXING_FAILED: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      deploymentId: z.string(),
      error: z.object({
        name: z.string(),
        message: z.string(),
        stack: z.string().optional(),
        stderr: z.string().optional()
      })
    })
  },
  RUN_CRASHED: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      runId: z.string(),
      error: z.object({
        name: z.string(),
        message: z.string(),
        stack: z.string().optional()
      })
    })
  }
};
var PlatformToCoordinatorMessages = {
  /** @deprecated use RESUME_AFTER_DEPENDENCY_WITH_ACK instead  */
  RESUME_AFTER_DEPENDENCY: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      runId: z.string(),
      attemptId: z.string(),
      attemptFriendlyId: z.string(),
      completions: TaskRunExecutionResult.array(),
      executions: TaskRunExecution.array()
    })
  },
  RESUME_AFTER_DEPENDENCY_WITH_ACK: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      runId: z.string(),
      attemptId: z.string(),
      attemptFriendlyId: z.string(),
      completions: TaskRunExecutionResult.array(),
      executions: TaskRunExecution.array()
    }),
    callback: AckCallbackResult
  },
  RESUME_AFTER_DURATION: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      attemptId: z.string(),
      attemptFriendlyId: z.string()
    })
  },
  REQUEST_ATTEMPT_CANCELLATION: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      attemptId: z.string(),
      attemptFriendlyId: z.string()
    })
  },
  REQUEST_RUN_CANCELLATION: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      runId: z.string(),
      delayInMs: z.number().optional()
    })
  },
  READY_FOR_RETRY: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      runId: z.string()
    })
  },
  DYNAMIC_CONFIG: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      checkpointThresholdInMs: z.number()
    })
  }
};
var ClientToSharedQueueMessages = {
  READY_FOR_TASKS: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      backgroundWorkerId: z.string()
    })
  },
  BACKGROUND_WORKER_DEPRECATED: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      backgroundWorkerId: z.string()
    })
  },
  BACKGROUND_WORKER_MESSAGE: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      backgroundWorkerId: z.string(),
      data: BackgroundWorkerClientMessages
    })
  }
};
var SharedQueueToClientMessages = {
  SERVER_READY: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      id: z.string()
    })
  },
  BACKGROUND_WORKER_MESSAGE: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      backgroundWorkerId: z.string(),
      data: BackgroundWorkerServerMessages
    })
  }
};
var IndexTasksMessage = z.object({
  version: z.literal("v1"),
  deploymentId: z.string(),
  tasks: TaskResource.array(),
  packageVersion: z.string()
});
var ProdWorkerToCoordinatorMessages = {
  TEST: {
    message: z.object({
      version: z.literal("v1").default("v1")
    }),
    callback: z.void()
  },
  INDEX_TASKS: {
    message: z.discriminatedUnion("version", [
      IndexTasksMessage.extend({
        version: z.literal("v1")
      }),
      IndexTasksMessage.extend({
        version: z.literal("v2"),
        supportsLazyAttempts: z.boolean()
      })
    ]),
    callback: z.discriminatedUnion("success", [
      z.object({
        success: z.literal(false)
      }),
      z.object({
        success: z.literal(true)
      })
    ])
  },
  // Deprecated: Only workers without lazy attempt support will use this
  READY_FOR_EXECUTION: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      runId: z.string(),
      totalCompletions: z.number()
    })
  },
  READY_FOR_LAZY_ATTEMPT: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      runId: z.string(),
      totalCompletions: z.number(),
      startTime: z.number().optional()
    })
  },
  READY_FOR_RESUME: {
    message: z.discriminatedUnion("version", [
      z.object({
        version: z.literal("v1"),
        attemptFriendlyId: z.string(),
        type: WaitReason
      }),
      z.object({
        version: z.literal("v2"),
        attemptFriendlyId: z.string(),
        attemptNumber: z.number(),
        type: WaitReason
      })
    ])
  },
  READY_FOR_CHECKPOINT: {
    message: z.object({
      version: z.literal("v1").default("v1")
    })
  },
  CANCEL_CHECKPOINT: {
    message: z.discriminatedUnion("version", [
      z.object({
        version: z.literal("v1")
      }),
      z.object({
        version: z.literal("v2"),
        reason: WaitReason.optional()
      })
    ]).default({ version: "v1" }),
    callback: z.object({
      version: z.literal("v2").default("v2"),
      checkpointCanceled: z.boolean(),
      reason: WaitReason.optional()
    })
  },
  TASK_HEARTBEAT: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      attemptFriendlyId: z.string()
    })
  },
  TASK_RUN_HEARTBEAT: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      runId: z.string()
    })
  },
  TASK_RUN_COMPLETED: {
    message: z.object({
      version: z.enum(["v1", "v2"]).default("v1"),
      execution: ProdTaskRunExecution,
      completion: TaskRunExecutionResult
    }),
    callback: z.object({
      willCheckpointAndRestore: z.boolean(),
      shouldExit: z.boolean()
    })
  },
  TASK_RUN_FAILED_TO_RUN: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      completion: TaskRunFailedExecutionResult
    })
  },
  WAIT_FOR_DURATION: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      ms: z.number(),
      now: z.number(),
      attemptFriendlyId: z.string()
    }),
    callback: z.object({
      willCheckpointAndRestore: z.boolean()
    })
  },
  WAIT_FOR_TASK: {
    message: z.object({
      version: z.enum(["v1", "v2"]).default("v1"),
      friendlyId: z.string(),
      // This is the attempt that is waiting
      attemptFriendlyId: z.string()
    }),
    callback: z.object({
      willCheckpointAndRestore: z.boolean()
    })
  },
  WAIT_FOR_BATCH: {
    message: z.object({
      version: z.enum(["v1", "v2"]).default("v1"),
      batchFriendlyId: z.string(),
      runFriendlyIds: z.string().array(),
      // This is the attempt that is waiting
      attemptFriendlyId: z.string()
    }),
    callback: z.object({
      willCheckpointAndRestore: z.boolean()
    })
  },
  INDEXING_FAILED: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      deploymentId: z.string(),
      error: z.object({
        name: z.string(),
        message: z.string(),
        stack: z.string().optional(),
        stderr: z.string().optional()
      })
    })
  },
  CREATE_TASK_RUN_ATTEMPT: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      runId: z.string()
    }),
    callback: z.discriminatedUnion("success", [
      z.object({
        success: z.literal(false),
        reason: z.string().optional()
      }),
      z.object({
        success: z.literal(true),
        executionPayload: ProdTaskRunExecutionPayload
      })
    ])
  },
  UNRECOVERABLE_ERROR: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      error: z.object({
        name: z.string(),
        message: z.string(),
        stack: z.string().optional()
      })
    })
  },
  SET_STATE: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      attemptFriendlyId: z.string().optional(),
      attemptNumber: z.string().optional()
    })
  }
};
var CoordinatorToProdWorkerMessages = {
  RESUME_AFTER_DEPENDENCY: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      attemptId: z.string(),
      completions: TaskRunExecutionResult.array(),
      executions: TaskRunExecution.array()
    })
  },
  RESUME_AFTER_DURATION: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      attemptId: z.string()
    })
  },
  // Deprecated: Only workers without lazy attempt support will use this
  EXECUTE_TASK_RUN: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      executionPayload: ProdTaskRunExecutionPayload
    })
  },
  EXECUTE_TASK_RUN_LAZY_ATTEMPT: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      lazyPayload: TaskRunExecutionLazyAttemptPayload
    })
  },
  REQUEST_ATTEMPT_CANCELLATION: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      attemptId: z.string()
    })
  },
  REQUEST_EXIT: {
    message: z.discriminatedUnion("version", [
      z.object({
        version: z.literal("v1")
      }),
      z.object({
        version: z.literal("v2"),
        delayInMs: z.number().optional()
      })
    ])
  },
  READY_FOR_RETRY: {
    message: z.object({
      version: z.literal("v1").default("v1"),
      runId: z.string()
    })
  }
};
var ProdWorkerSocketData = z.object({
  contentHash: z.string(),
  projectRef: z.string(),
  envId: z.string(),
  runId: z.string(),
  attemptFriendlyId: z.string().optional(),
  attemptNumber: z.string().optional(),
  podName: z.string(),
  deploymentId: z.string(),
  deploymentVersion: z.string(),
  requiresCheckpointResumeWithMessage: z.string().optional()
});
var CoordinatorSocketData = z.object({
  supportsDynamicConfig: z.string().optional()
});

// ../../node_modules/@trigger.dev/core/dist/esm/v3/utils/getEnv.js
init_esm();
function getEnvVar(name, defaultValue) {
  if (typeof process !== "undefined" && typeof process.env === "object" && process.env !== null) {
    return process.env[name] ?? defaultValue;
  }
  return defaultValue;
}
function getNumberEnvVar(name, defaultValue) {
  const value = getEnvVar(name);
  if (value === void 0) {
    return defaultValue;
  }
  const parsed = Number(value);
  if (isNaN(parsed)) {
    return defaultValue;
  }
  return parsed;
}

// ../../node_modules/@trigger.dev/core/dist/esm/v3/apiClientManager-api.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/apiClientManager/index.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/apiClient/index.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/version.js
init_esm();
var VERSION = "3.3.17";

// ../../node_modules/@trigger.dev/core/dist/esm/v3/jwt.js
init_esm();
var JWT_ALGORITHM = "HS256";
var JWT_ISSUER = "https://id.trigger.dev";
var JWT_AUDIENCE = "https://api.trigger.dev";
async function generateJWT(options) {
  const { SignJWT } = await import("./esm-2Y6HRNET.mjs");
  const secret = new TextEncoder().encode(options.secretKey);
  return new SignJWT(options.payload).setIssuer(JWT_ISSUER).setAudience(JWT_AUDIENCE).setProtectedHeader({ alg: JWT_ALGORITHM }).setIssuedAt().setExpirationTime(options.expirationTime ?? "15m").sign(secret);
}

// ../../node_modules/@trigger.dev/core/dist/esm/v3/schemas/index.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/schemas/tokens.js
init_esm();
var CreateAuthorizationCodeResponseSchema = z.object({
  url: z.string().url(),
  authorizationCode: z.string()
});
var GetPersonalAccessTokenRequestSchema = z.object({
  authorizationCode: z.string()
});
var GetPersonalAccessTokenResponseSchema = z.object({
  token: z.object({
    token: z.string(),
    obfuscatedToken: z.string()
  }).nullable()
});

// ../../node_modules/@trigger.dev/core/dist/esm/v3/schemas/api.js
init_esm();
var WhoAmIResponseSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  dashboardUrl: z.string()
});
var GetProjectResponseBody = z.object({
  id: z.string(),
  externalRef: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.coerce.date(),
  organization: z.object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    createdAt: z.coerce.date()
  })
});
var GetProjectsResponseBody = z.array(GetProjectResponseBody);
var GetProjectEnvResponse = z.object({
  apiKey: z.string(),
  name: z.string(),
  apiUrl: z.string(),
  projectId: z.string()
});
var CreateBackgroundWorkerRequestBody = z.object({
  localOnly: z.boolean(),
  metadata: BackgroundWorkerMetadata,
  supportsLazyAttempts: z.boolean().optional()
});
var CreateBackgroundWorkerResponse = z.object({
  id: z.string(),
  version: z.string(),
  contentHash: z.string()
});
var RunTag = z.string().max(128, "Tags must be less than 128 characters");
var RunTags = z.union([RunTag, RunTag.array()]);
var TriggerTaskRequestBody = z.object({
  payload: z.any(),
  context: z.any(),
  options: z.object({
    concurrencyKey: z.string().optional(),
    delay: z.string().or(z.coerce.date()).optional(),
    dependentAttempt: z.string().optional(),
    dependentBatch: z.string().optional(),
    idempotencyKey: z.string().optional(),
    idempotencyKeyTTL: z.string().optional(),
    lockToVersion: z.string().optional(),
    machine: MachinePresetName.optional(),
    maxAttempts: z.number().int().optional(),
    maxDuration: z.number().optional(),
    metadata: z.any(),
    metadataType: z.string().optional(),
    parentAttempt: z.string().optional(),
    parentBatch: z.string().optional(),
    payloadType: z.string().optional(),
    queue: QueueOptions.optional(),
    tags: RunTags.optional(),
    test: z.boolean().optional(),
    ttl: z.string().or(z.number().nonnegative().int()).optional()
  }).optional()
});
var TriggerTaskResponse = z.object({
  id: z.string()
});
var BatchTriggerTaskRequestBody = z.object({
  items: TriggerTaskRequestBody.array(),
  dependentAttempt: z.string().optional()
});
var BatchTriggerTaskItem = z.object({
  task: z.string(),
  payload: z.any(),
  context: z.any(),
  options: z.object({
    concurrencyKey: z.string().optional(),
    delay: z.string().or(z.coerce.date()).optional(),
    idempotencyKey: z.string().optional(),
    idempotencyKeyTTL: z.string().optional(),
    lockToVersion: z.string().optional(),
    machine: MachinePresetName.optional(),
    maxAttempts: z.number().int().optional(),
    maxDuration: z.number().optional(),
    metadata: z.any(),
    metadataType: z.string().optional(),
    parentAttempt: z.string().optional(),
    payloadType: z.string().optional(),
    queue: QueueOptions.optional(),
    tags: RunTags.optional(),
    test: z.boolean().optional(),
    ttl: z.string().or(z.number().nonnegative().int()).optional()
  }).optional()
});
var BatchTriggerTaskV2RequestBody = z.object({
  items: BatchTriggerTaskItem.array(),
  dependentAttempt: z.string().optional()
});
var BatchTriggerTaskV2Response = z.object({
  id: z.string(),
  isCached: z.boolean(),
  idempotencyKey: z.string().optional(),
  runs: z.array(z.object({
    id: z.string(),
    taskIdentifier: z.string(),
    isCached: z.boolean(),
    idempotencyKey: z.string().optional()
  }))
});
var BatchTriggerTaskResponse = z.object({
  batchId: z.string(),
  runs: z.string().array()
});
var GetBatchResponseBody = z.object({
  id: z.string(),
  items: z.array(z.object({
    id: z.string(),
    taskRunId: z.string(),
    status: z.enum(["PENDING", "CANCELED", "COMPLETED", "FAILED"])
  }))
});
var AddTagsRequestBody = z.object({
  tags: RunTags
});
var RescheduleRunRequestBody = z.object({
  delay: z.string().or(z.coerce.date())
});
var GetEnvironmentVariablesResponseBody = z.object({
  variables: z.record(z.string())
});
var StartDeploymentIndexingRequestBody = z.object({
  imageReference: z.string(),
  selfHosted: z.boolean().optional()
});
var StartDeploymentIndexingResponseBody = z.object({
  id: z.string(),
  contentHash: z.string()
});
var FinalizeDeploymentRequestBody = z.object({
  imageReference: z.string(),
  selfHosted: z.boolean().optional(),
  skipRegistryProxy: z.boolean().optional(),
  skipPromotion: z.boolean().optional()
});
var ExternalBuildData = z.object({
  buildId: z.string(),
  buildToken: z.string(),
  projectId: z.string()
});
var InitializeDeploymentResponseBody = z.object({
  id: z.string(),
  contentHash: z.string(),
  shortCode: z.string(),
  version: z.string(),
  imageTag: z.string(),
  externalBuildData: ExternalBuildData.optional().nullable(),
  registryHost: z.string().optional()
});
var InitializeDeploymentRequestBody = z.object({
  contentHash: z.string(),
  userId: z.string().optional(),
  registryHost: z.string().optional(),
  selfHosted: z.boolean().optional(),
  namespace: z.string().optional()
});
var DeploymentErrorData = z.object({
  name: z.string(),
  message: z.string(),
  stack: z.string().optional(),
  stderr: z.string().optional()
});
var FailDeploymentRequestBody = z.object({
  error: DeploymentErrorData
});
var FailDeploymentResponseBody = z.object({
  id: z.string()
});
var PromoteDeploymentResponseBody = z.object({
  id: z.string(),
  version: z.string(),
  shortCode: z.string()
});
var GetDeploymentResponseBody = z.object({
  id: z.string(),
  status: z.enum([
    "PENDING",
    "BUILDING",
    "DEPLOYING",
    "DEPLOYED",
    "FAILED",
    "CANCELED",
    "TIMED_OUT"
  ]),
  contentHash: z.string(),
  shortCode: z.string(),
  version: z.string(),
  imageReference: z.string().nullish(),
  errorData: DeploymentErrorData.nullish(),
  worker: z.object({
    id: z.string(),
    version: z.string(),
    tasks: z.array(z.object({
      id: z.string(),
      slug: z.string(),
      filePath: z.string(),
      exportName: z.string()
    }))
  }).optional()
});
var CreateUploadPayloadUrlResponseBody = z.object({
  presignedUrl: z.string()
});
var ReplayRunResponse = z.object({
  id: z.string()
});
var CanceledRunResponse = z.object({
  id: z.string()
});
var ScheduleType = z.union([z.literal("DECLARATIVE"), z.literal("IMPERATIVE")]);
var ScheduledTaskPayload = z.object({
  /** The schedule id associated with this run (you can have many schedules for the same task).
    You can use this to remove the schedule, update it, etc */
  scheduleId: z.string(),
  /** The type of schedule – `"DECLARATIVE"` or `"IMPERATIVE"`.
   *
   * **DECLARATIVE** – defined inline on your `schedules.task` using the `cron` property. They can only be created, updated or deleted by modifying the `cron` property on your task.
   *
   * **IMPERATIVE** – created using the `schedules.create` functions or in the dashboard.
   */
  type: ScheduleType,
  /** When the task was scheduled to run.
   * Note this will be slightly different from `new Date()` because it takes a few ms to run the task.
   *
   * This date is UTC. To output it as a string with a timezone you would do this:
   * ```ts
   * const formatted = payload.timestamp.toLocaleString("en-US", {
        timeZone: payload.timezone,
    });
    ```  */
  timestamp: z.date(),
  /** When the task was last run (it has been).
    This can be undefined if it's never been run. This date is UTC. */
  lastTimestamp: z.date().optional(),
  /** You can optionally provide an external id when creating the schedule.
    Usually you would use a userId or some other unique identifier.
    This defaults to undefined if you didn't provide one. */
  externalId: z.string().optional(),
  /** The IANA timezone the schedule is set to. The default is UTC.
   * You can see the full list of supported timezones here: https://cloud.trigger.dev/timezones
   */
  timezone: z.string(),
  /** The next 5 dates this task is scheduled to run */
  upcoming: z.array(z.date())
});
var CreateScheduleOptions = z.object({
  /** The id of the task you want to attach to. */
  task: z.string(),
  /**  The schedule in CRON format.
     *
     * ```txt
  *    *    *    *    *    *
  ┬    ┬    ┬    ┬    ┬
  │    │    │    │    |
  │    │    │    │    └ day of week (0 - 7, 1L - 7L) (0 or 7 is Sun)
  │    │    │    └───── month (1 - 12)
  │    │    └────────── day of month (1 - 31, L)
  │    └─────────────── hour (0 - 23)
  └──────────────────── minute (0 - 59)
     * ```
  
  "L" means the last. In the "day of week" field, 1L means the last Monday of the month. In the day of month field, L means the last day of the month.
  
     */
  cron: z.string(),
  /** You can only create one schedule with this key. If you use it twice, the second call will update the schedule.
   *
   * This is required to prevent you from creating duplicate schedules. */
  deduplicationKey: z.string(),
  /** Optionally, you can specify your own IDs (like a user ID) and then use it inside the run function of your task.
   *
   * This allows you to have per-user CRON tasks.
   */
  externalId: z.string().optional(),
  /** Optionally, you can specify a timezone in the IANA format. If unset it will use UTC.
   * If specified then the CRON will be evaluated in that timezone and will respect daylight savings.
   *
   * If you set the CRON to `0 0 * * *` and the timezone to `America/New_York` then the task will run at midnight in New York time, no matter whether it's daylight savings or not.
   *
   * You can see the full list of supported timezones here: https://cloud.trigger.dev/timezones
   *
   * @example "America/New_York", "Europe/London", "Asia/Tokyo", "Africa/Cairo"
   *
   */
  timezone: z.string().optional()
});
var UpdateScheduleOptions = CreateScheduleOptions.omit({ deduplicationKey: true });
var ScheduleGenerator = z.object({
  type: z.literal("CRON"),
  expression: z.string(),
  description: z.string()
});
var ScheduleObject = z.object({
  id: z.string(),
  type: ScheduleType,
  task: z.string(),
  active: z.boolean(),
  deduplicationKey: z.string().nullish(),
  externalId: z.string().nullish(),
  generator: ScheduleGenerator,
  timezone: z.string(),
  nextRun: z.coerce.date().nullish(),
  environments: z.array(z.object({
    id: z.string(),
    type: z.string(),
    userName: z.string().nullish()
  }))
});
var DeletedScheduleObject = z.object({
  id: z.string()
});
var ListSchedulesResult = z.object({
  data: z.array(ScheduleObject),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    count: z.number()
  })
});
var ListScheduleOptions = z.object({
  page: z.number().optional(),
  perPage: z.number().optional()
});
var TimezonesResult = z.object({
  timezones: z.array(z.string())
});
var RunStatus = z.enum([
  /// Task hasn't been deployed yet but is waiting to be executed
  "WAITING_FOR_DEPLOY",
  /// Task is waiting to be executed by a worker
  "QUEUED",
  /// Task is currently being executed by a worker
  "EXECUTING",
  /// Task has failed and is waiting to be retried
  "REATTEMPTING",
  /// Task has been paused by the system, and will be resumed by the system
  "FROZEN",
  /// Task has been completed successfully
  "COMPLETED",
  /// Task has been canceled by the user
  "CANCELED",
  /// Task has been completed with errors
  "FAILED",
  /// Task has crashed and won't be retried, most likely the worker ran out of resources, e.g. memory or storage
  "CRASHED",
  /// Task was interrupted during execution, mostly this happens in development environments
  "INTERRUPTED",
  /// Task has failed to complete, due to an error in the system
  "SYSTEM_FAILURE",
  /// Task has been scheduled to run at a specific time
  "DELAYED",
  /// Task has expired and won't be executed
  "EXPIRED",
  /// Task has reached it's maxDuration and has been stopped
  "TIMED_OUT"
]);
var AttemptStatus = z.enum([
  "PENDING",
  "EXECUTING",
  "PAUSED",
  "COMPLETED",
  "FAILED",
  "CANCELED"
]);
var RunEnvironmentDetails = z.object({
  id: z.string(),
  name: z.string(),
  user: z.string().optional()
});
var RunScheduleDetails = z.object({
  id: z.string(),
  externalId: z.string().optional(),
  deduplicationKey: z.string().optional(),
  generator: ScheduleGenerator
});
var TriggerFunction = z.enum([
  "triggerAndWait",
  "trigger",
  "batchTriggerAndWait",
  "batchTrigger"
]);
var CommonRunFields = {
  id: z.string(),
  status: RunStatus,
  taskIdentifier: z.string(),
  idempotencyKey: z.string().optional(),
  version: z.string().optional(),
  isQueued: z.boolean(),
  isExecuting: z.boolean(),
  isCompleted: z.boolean(),
  isSuccess: z.boolean(),
  isFailed: z.boolean(),
  isCancelled: z.boolean(),
  isTest: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  startedAt: z.coerce.date().optional(),
  finishedAt: z.coerce.date().optional(),
  delayedUntil: z.coerce.date().optional(),
  ttl: z.string().optional(),
  expiredAt: z.coerce.date().optional(),
  tags: z.string().array(),
  costInCents: z.number(),
  baseCostInCents: z.number(),
  durationMs: z.number(),
  metadata: z.record(z.any()).optional()
};
var RetrieveRunCommandFields = {
  ...CommonRunFields,
  depth: z.number(),
  triggerFunction: z.enum(["triggerAndWait", "trigger", "batchTriggerAndWait", "batchTrigger"]),
  batchId: z.string().optional()
};
var RelatedRunDetails = z.object(RetrieveRunCommandFields);
var RetrieveRunResponse = z.object({
  ...RetrieveRunCommandFields,
  payload: z.any().optional(),
  payloadPresignedUrl: z.string().optional(),
  output: z.any().optional(),
  outputPresignedUrl: z.string().optional(),
  error: SerializedError.optional(),
  schedule: RunScheduleDetails.optional(),
  relatedRuns: z.object({
    root: RelatedRunDetails.optional(),
    parent: RelatedRunDetails.optional(),
    children: z.array(RelatedRunDetails).optional()
  }),
  attempts: z.array(z.object({
    id: z.string(),
    status: AttemptStatus,
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    startedAt: z.coerce.date().optional(),
    completedAt: z.coerce.date().optional(),
    error: SerializedError.optional()
  }).optional()),
  attemptCount: z.number().default(0)
});
var ListRunResponseItem = z.object({
  ...CommonRunFields,
  env: RunEnvironmentDetails
});
var ListRunResponse = z.object({
  data: z.array(ListRunResponseItem),
  pagination: z.object({
    next: z.string().optional(),
    previous: z.string().optional()
  })
});
var CreateEnvironmentVariableRequestBody = z.object({
  name: z.string(),
  value: z.string()
});
var UpdateEnvironmentVariableRequestBody = z.object({
  value: z.string()
});
var ImportEnvironmentVariablesRequestBody = z.object({
  variables: z.record(z.string()),
  override: z.boolean().optional()
});
var EnvironmentVariableResponseBody = z.object({
  success: z.boolean()
});
var EnvironmentVariableValue = z.object({
  value: z.string()
});
var EnvironmentVariable = z.object({
  name: z.string(),
  value: z.string()
});
var EnvironmentVariables = z.array(EnvironmentVariable);
var UpdateMetadataResponseBody = z.object({
  metadata: z.record(DeserializedJsonSchema)
});
var RawShapeDate = z.string().transform((val) => `${val}Z`).pipe(z.coerce.date());
var RawOptionalShapeDate = z.string().nullish().transform((val) => val ? /* @__PURE__ */ new Date(`${val}Z`) : val);
var SubscribeRunRawShape = z.object({
  id: z.string(),
  idempotencyKey: z.string().nullish(),
  createdAt: RawShapeDate,
  updatedAt: RawShapeDate,
  startedAt: RawOptionalShapeDate,
  delayUntil: RawOptionalShapeDate,
  queuedAt: RawOptionalShapeDate,
  expiredAt: RawOptionalShapeDate,
  completedAt: RawOptionalShapeDate,
  taskIdentifier: z.string(),
  friendlyId: z.string(),
  number: z.number(),
  isTest: z.boolean(),
  status: z.string(),
  usageDurationMs: z.number(),
  costInCents: z.number(),
  baseCostInCents: z.number(),
  ttl: z.string().nullish(),
  payload: z.string().nullish(),
  payloadType: z.string().nullish(),
  metadata: z.string().nullish(),
  metadataType: z.string().nullish(),
  output: z.string().nullish(),
  outputType: z.string().nullish(),
  runTags: z.array(z.string()).nullish().default([]),
  error: TaskRunError.nullish()
});
var BatchStatus = z.enum(["PENDING", "COMPLETED"]);
var RetrieveBatchResponse = z.object({
  id: z.string(),
  status: BatchStatus,
  idempotencyKey: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  runCount: z.number()
});
var SubscribeRealtimeStreamChunkRawShape = z.object({
  id: z.string(),
  runId: z.string(),
  sequence: z.number(),
  key: z.string(),
  value: z.string(),
  createdAt: z.coerce.date()
});

// ../../node_modules/@trigger.dev/core/dist/esm/v3/schemas/style.js
init_esm();
var PRIMARY_VARIANT = "primary";
var Variant = z.enum([PRIMARY_VARIANT]);
var AccessoryItem = z.object({
  text: z.string(),
  variant: z.string().optional(),
  url: z.string().optional()
});
var Accessory = z.object({
  items: z.array(AccessoryItem),
  style: z.enum(["codepath"]).optional()
});
var TaskEventStyle = z.object({
  icon: z.string().optional(),
  variant: Variant.optional(),
  accessory: Accessory.optional()
}).default({
  icon: void 0,
  variant: void 0
});

// ../../node_modules/@trigger.dev/core/dist/esm/v3/schemas/fetch.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/schemas/eventFilter.js
init_esm();
var stringPatternMatchers = [
  z.object({
    $endsWith: z.string()
  }),
  z.object({
    $startsWith: z.string()
  }),
  z.object({
    $ignoreCaseEquals: z.string()
  })
];
var EventMatcher = z.union([
  /** Match against a string */
  z.array(z.string()),
  /** Match against a number */
  z.array(z.number()),
  /** Match against a boolean */
  z.array(z.boolean()),
  z.array(z.union([
    ...stringPatternMatchers,
    z.object({
      $exists: z.boolean()
    }),
    z.object({
      $isNull: z.boolean()
    }),
    z.object({
      $anythingBut: z.union([z.string(), z.number(), z.boolean()])
    }),
    z.object({
      $anythingBut: z.union([z.array(z.string()), z.array(z.number()), z.array(z.boolean())])
    }),
    z.object({
      $gt: z.number()
    }),
    z.object({
      $lt: z.number()
    }),
    z.object({
      $gte: z.number()
    }),
    z.object({
      $lte: z.number()
    }),
    z.object({
      $between: z.tuple([z.number(), z.number()])
    }),
    z.object({
      $includes: z.union([z.string(), z.number(), z.boolean()])
    }),
    z.object({
      $not: z.union([z.string(), z.number(), z.boolean()])
    })
  ]))
]);
var EventFilter = z.lazy(() => z.record(z.union([EventMatcher, EventFilter])));

// ../../node_modules/@trigger.dev/core/dist/esm/v3/schemas/fetch.js
var FetchRetryHeadersStrategy = z.object({
  /** The `headers` strategy retries the request using info from the response headers. */
  strategy: z.literal("headers"),
  /** The header to use to determine the maximum number of times to retry the request. */
  limitHeader: z.string(),
  /** The header to use to determine the number of remaining retries. */
  remainingHeader: z.string(),
  /** The header to use to determine the time when the number of remaining retries will be reset. */
  resetHeader: z.string(),
  /** The event filter to use to determine if the request should be retried. */
  bodyFilter: EventFilter.optional(),
  /** The format of the `resetHeader` value. */
  resetFormat: z.enum([
    "unix_timestamp",
    "unix_timestamp_in_ms",
    "iso_8601",
    "iso_8601_duration_openai_variant"
  ]).default("unix_timestamp").optional()
});
var FetchRetryBackoffStrategy = RetryOptions.extend({
  /** The `backoff` strategy retries the request with an exponential backoff. */
  strategy: z.literal("backoff"),
  /** The event filter to use to determine if the request should be retried. */
  bodyFilter: EventFilter.optional()
});
var FetchRetryStrategy = z.discriminatedUnion("strategy", [
  FetchRetryHeadersStrategy,
  FetchRetryBackoffStrategy
]);
var FetchRetryByStatusOptions = z.record(z.string(), FetchRetryStrategy);
var FetchTimeoutOptions = z.object({
  /** The maximum time to wait for the request to complete. */
  durationInMs: z.number().optional(),
  retry: RetryOptions.optional()
});
var FetchRetryOptions = z.object({
  /** The retrying strategy for specific status codes. */
  byStatus: FetchRetryByStatusOptions.optional(),
  /** The timeout options for the request. */
  timeout: RetryOptions.optional(),
  /**
   * The retrying strategy for connection errors.
   */
  connectionError: RetryOptions.optional()
});

// ../../node_modules/@trigger.dev/core/dist/esm/v3/schemas/openTelemetry.js
init_esm();
var ExceptionEventProperties = z.object({
  type: z.string().optional(),
  message: z.string().optional(),
  stacktrace: z.string().optional()
});
var ExceptionSpanEvent = z.object({
  name: z.literal("exception"),
  time: z.coerce.date(),
  properties: z.object({
    exception: ExceptionEventProperties
  })
});
var CancellationSpanEvent = z.object({
  name: z.literal("cancellation"),
  time: z.coerce.date(),
  properties: z.object({
    reason: z.string()
  })
});
var OtherSpanEvent = z.object({
  name: z.string(),
  time: z.coerce.date(),
  properties: z.record(z.unknown())
});
var SpanEvent = z.union([ExceptionSpanEvent, CancellationSpanEvent, OtherSpanEvent]);
var SpanEvents = z.array(SpanEvent);
var SpanMessagingEvent = z.object({
  system: z.string().optional(),
  client_id: z.string().optional(),
  operation: z.enum(["publish", "create", "receive", "deliver"]),
  message: z.any(),
  destination: z.string().optional()
});

// ../../node_modules/@trigger.dev/core/dist/esm/v3/schemas/webhooks.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/schemas/api.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/schemas/addMissingVersionField.js
init_esm();
function addMissingVersionField(val) {
  if (val !== null && typeof val === "object" && !("version" in val)) {
    return {
      ...val,
      version: "1"
    };
  }
  return val;
}

// ../../node_modules/@trigger.dev/core/dist/esm/schemas/errors.js
init_esm();
var ErrorWithStackSchema = z.object({
  message: z.string(),
  name: z.string().optional(),
  stack: z.string().optional()
});
var SchemaErrorSchema = z.object({
  path: z.array(z.string()),
  message: z.string()
});

// ../../node_modules/@trigger.dev/core/dist/esm/schemas/eventFilter.js
init_esm();
var stringPatternMatchers2 = [
  z.object({
    $endsWith: z.string()
  }),
  z.object({
    $startsWith: z.string()
  }),
  z.object({
    $ignoreCaseEquals: z.string()
  })
];
var EventMatcherSchema = z.union([
  /** Match against a string */
  z.array(z.string()),
  /** Match against a number */
  z.array(z.number()),
  /** Match against a boolean */
  z.array(z.boolean()),
  z.array(z.union([
    ...stringPatternMatchers2,
    z.object({
      $exists: z.boolean()
    }),
    z.object({
      $isNull: z.boolean()
    }),
    z.object({
      $anythingBut: z.union([z.string(), z.number(), z.boolean()])
    }),
    z.object({
      $anythingBut: z.union([z.array(z.string()), z.array(z.number()), z.array(z.boolean())])
    }),
    z.object({
      $gt: z.number()
    }),
    z.object({
      $lt: z.number()
    }),
    z.object({
      $gte: z.number()
    }),
    z.object({
      $lte: z.number()
    }),
    z.object({
      $between: z.tuple([z.number(), z.number()])
    }),
    z.object({
      $includes: z.union([z.string(), z.number(), z.boolean()])
    }),
    z.object({
      $not: z.union([z.string(), z.number(), z.boolean()])
    })
  ]))
]);
var EventFilterSchema = z.lazy(() => z.record(z.union([EventMatcherSchema, EventFilterSchema])));
var EventRuleSchema = z.object({
  event: z.string().or(z.array(z.string())),
  source: z.string(),
  payload: EventFilterSchema.optional(),
  context: EventFilterSchema.optional()
});

// ../../node_modules/@trigger.dev/core/dist/esm/schemas/integrations.js
init_esm();
var ConnectionAuthSchema = z.object({
  type: z.enum(["oauth2", "apiKey"]),
  accessToken: z.string(),
  scopes: z.array(z.string()).optional(),
  additionalFields: z.record(z.string()).optional()
});
var IntegrationMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  instructions: z.string().optional()
});
var IntegrationConfigSchema = z.object({
  id: z.string(),
  metadata: IntegrationMetadataSchema,
  authSource: z.enum(["HOSTED", "LOCAL", "RESOLVER"])
});

// ../../node_modules/@trigger.dev/core/dist/esm/schemas/properties.js
init_esm();
var DisplayPropertySchema = z.object({
  /** The label for the property */
  label: z.string(),
  /** The value of the property */
  text: z.string(),
  /** The URL to link to when the property is clicked */
  url: z.string().optional(),
  /** The URL to a list of images to display next to the property */
  imageUrl: z.array(z.string()).optional()
});
var DisplayPropertiesSchema = z.array(DisplayPropertySchema);
var StyleSchema = z.object({
  /** The style, `normal` or `minimal` */
  style: z.enum(["normal", "minimal"]),
  /** A variant of the style. */
  variant: z.string().optional()
});

// ../../node_modules/@trigger.dev/core/dist/esm/schemas/schedules.js
init_esm();
var ScheduledPayloadSchema = z.object({
  ts: z.coerce.date(),
  lastTimestamp: z.coerce.date().optional()
});
var IntervalOptionsSchema = z.object({
  /** The number of seconds for the interval. Min = 20, Max = 2_592_000 (30 days) */
  seconds: z.number().int().positive().min(20).max(2592e3)
});
var CronOptionsSchema = z.object({
  /** A CRON expression that defines the schedule. A useful tool when writing CRON
    expressions is [crontab guru](https://crontab.guru). Note that the timezone
    used is UTC. */
  cron: z.string()
});
var CronMetadataSchema = z.object({
  type: z.literal("cron"),
  options: CronOptionsSchema,
  /** An optional Account ID to associate with runs triggered by this interval */
  accountId: z.string().optional(),
  metadata: z.any()
});
var IntervalMetadataSchema = z.object({
  /** An interval reoccurs at the specified number of seconds  */
  type: z.literal("interval"),
  /** An object containing options about the interval. */
  options: IntervalOptionsSchema,
  /** An optional Account ID to associate with runs triggered by this interval */
  accountId: z.string().optional(),
  /** Any additional metadata about the schedule. */
  metadata: z.any()
});
var ScheduleMetadataSchema = z.discriminatedUnion("type", [
  IntervalMetadataSchema,
  CronMetadataSchema
]);
var RegisterDynamicSchedulePayloadSchema = z.object({
  id: z.string(),
  jobs: z.array(z.object({
    id: z.string(),
    version: z.string()
  }))
});

// ../../node_modules/@trigger.dev/core/dist/esm/schemas/tasks.js
init_esm();
var TaskStatusSchema = z.enum([
  "PENDING",
  "WAITING",
  "RUNNING",
  "COMPLETED",
  "ERRORED",
  "CANCELED"
]);
var TaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional().nullable(),
  noop: z.boolean(),
  startedAt: z.coerce.date().optional().nullable(),
  completedAt: z.coerce.date().optional().nullable(),
  delayUntil: z.coerce.date().optional().nullable(),
  status: TaskStatusSchema,
  description: z.string().optional().nullable(),
  properties: z.array(DisplayPropertySchema).optional().nullable(),
  outputProperties: z.array(DisplayPropertySchema).optional().nullable(),
  params: DeserializedJsonSchema.optional().nullable(),
  output: DeserializedJsonSchema.optional().nullable(),
  context: DeserializedJsonSchema.optional().nullable(),
  error: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  style: StyleSchema.optional().nullable(),
  operation: z.string().optional().nullable(),
  callbackUrl: z.string().optional().nullable(),
  childExecutionMode: z.enum(["SEQUENTIAL", "PARALLEL"]).optional().nullable()
});
var ServerTaskSchema = TaskSchema.extend({
  idempotencyKey: z.string(),
  attempts: z.number(),
  forceYield: z.boolean().optional().nullable()
});
var CachedTaskSchema = z.object({
  id: z.string(),
  idempotencyKey: z.string(),
  status: TaskStatusSchema,
  noop: z.boolean().default(false),
  output: DeserializedJsonSchema.optional().nullable(),
  parentId: z.string().optional().nullable()
});

// ../../node_modules/@trigger.dev/core/dist/esm/schemas/triggers.js
init_esm();
var EventExampleSchema = z.object({
  id: z.string(),
  icon: z.string().optional(),
  name: z.string(),
  payload: z.any()
});
var EventSpecificationSchema = z.object({
  name: z.string().or(z.array(z.string())),
  title: z.string(),
  source: z.string(),
  icon: z.string(),
  filter: EventFilterSchema.optional(),
  properties: z.array(DisplayPropertySchema).optional(),
  schema: z.any().optional(),
  examples: z.array(EventExampleSchema).optional()
});
var DynamicTriggerMetadataSchema = z.object({
  type: z.literal("dynamic"),
  id: z.string()
});
var TriggerHelpSchema = z.object({
  noRuns: z.object({
    text: z.string(),
    link: z.string().optional()
  }).optional()
});
var StaticTriggerMetadataSchema = z.object({
  type: z.literal("static"),
  title: z.union([z.string(), z.array(z.string())]),
  properties: z.array(DisplayPropertySchema).optional(),
  rule: EventRuleSchema,
  link: z.string().optional(),
  help: TriggerHelpSchema.optional()
});
var InvokeTriggerMetadataSchema = z.object({
  type: z.literal("invoke")
});
var ScheduledTriggerMetadataSchema = z.object({
  type: z.literal("scheduled"),
  schedule: ScheduleMetadataSchema
});
var TriggerMetadataSchema = z.discriminatedUnion("type", [
  DynamicTriggerMetadataSchema,
  StaticTriggerMetadataSchema,
  ScheduledTriggerMetadataSchema,
  InvokeTriggerMetadataSchema
]);

// ../../node_modules/@trigger.dev/core/dist/esm/schemas/runs.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/schemas/statuses.js
init_esm();
var StatusUpdateStateSchema = z.union([
  z.literal("loading"),
  z.literal("success"),
  z.literal("failure")
]);
var StatusUpdateDataSchema = z.record(SerializableJsonSchema);
var StatusUpdateSchema = z.object({
  label: z.string().optional(),
  state: StatusUpdateStateSchema.optional(),
  data: StatusUpdateDataSchema.optional()
});
var InitalStatusUpdateSchema = StatusUpdateSchema.required({ label: true });
var StatusHistorySchema = z.array(StatusUpdateSchema);
var JobRunStatusRecordSchema = InitalStatusUpdateSchema.extend({
  key: z.string(),
  history: StatusHistorySchema
});

// ../../node_modules/@trigger.dev/core/dist/esm/schemas/runs.js
var RunStatusSchema = z.union([
  z.literal("PENDING"),
  z.literal("QUEUED"),
  z.literal("WAITING_ON_CONNECTIONS"),
  z.literal("PREPROCESSING"),
  z.literal("STARTED"),
  z.literal("SUCCESS"),
  z.literal("FAILURE"),
  z.literal("TIMED_OUT"),
  z.literal("ABORTED"),
  z.literal("CANCELED"),
  z.literal("UNRESOLVED_AUTH"),
  z.literal("INVALID_PAYLOAD"),
  z.literal("EXECUTING"),
  z.literal("WAITING_TO_CONTINUE"),
  z.literal("WAITING_TO_EXECUTE")
]);
var RunTaskSchema = z.object({
  /** The Task id */
  id: z.string(),
  /** The key that you defined when creating the Task, the first param in any task. */
  displayKey: z.string().nullable(),
  /** The Task status */
  status: TaskStatusSchema,
  /** The name of the Task */
  name: z.string(),
  /** The icon of the Task, a string.
   * For integrations, this will be a lowercase name of the company.
   * Can be used with the [@trigger.dev/companyicons](https://www.npmjs.com/package/@trigger.dev/companyicons) package to display an svg. */
  icon: z.string().nullable(),
  /** When the task started */
  startedAt: z.coerce.date().nullable(),
  /** When the task completed */
  completedAt: z.coerce.date().nullable()
});
var RunTaskWithSubtasksSchema = RunTaskSchema.extend({
  subtasks: z.lazy(() => RunTaskWithSubtasksSchema.array()).optional()
});
var GetRunOptionsSchema = z.object({
  /** Return subtasks, which appear in a `subtasks` array on a task. @default false */
  subtasks: z.boolean().optional(),
  /** You can use this to get more tasks, if there are more than are returned in a single batch @default undefined */
  cursor: z.string().optional(),
  /** How many tasks you want to return in one go, max 50. @default 20 */
  take: z.number().optional()
});
var GetRunOptionsWithTaskDetailsSchema = GetRunOptionsSchema.extend({
  /** If `true`, it returns the `params` and `output` of all tasks. @default false */
  taskdetails: z.boolean().optional()
});
var RunSchema = z.object({
  /** The Run id */
  id: z.string(),
  /** The Run status */
  status: RunStatusSchema,
  /** When the run started */
  startedAt: z.coerce.date().nullable(),
  /** When the run was last updated */
  updatedAt: z.coerce.date().nullable(),
  /** When the run was completed */
  completedAt: z.coerce.date().nullable()
});
var GetRunSchema = RunSchema.extend({
  /** The output of the run */
  output: z.any().optional(),
  /** The tasks from the run */
  tasks: z.array(RunTaskWithSubtasksSchema),
  /** Any status updates that were published from the run */
  statuses: z.array(JobRunStatusRecordSchema).default([]),
  /** If there are more tasks, you can use this to get them */
  nextCursor: z.string().optional()
});
var GetRunsOptionsSchema = z.object({
  /** You can use this to get more tasks, if there are more than are returned in a single batch @default undefined */
  cursor: z.string().optional(),
  /** How many runs you want to return in one go, max 50. @default 20 */
  take: z.number().optional()
});
var GetRunsSchema = z.object({
  /** The runs from the query */
  runs: RunSchema.array(),
  /** If there are more runs, you can use this to get them */
  nextCursor: z.string().optional()
});

// ../../node_modules/@trigger.dev/core/dist/esm/schemas/requestFilter.js
init_esm();
var StringMatchSchema = z.union([
  /** Match against a string */
  z.array(z.string()),
  z.array(z.union(stringPatternMatchers2))
]);
var HTTPMethodUnionSchema = z.union([
  z.literal("GET"),
  z.literal("POST"),
  z.literal("PUT"),
  z.literal("PATCH"),
  z.literal("DELETE"),
  z.literal("HEAD"),
  z.literal("OPTIONS")
]);
var RequestFilterSchema = z.object({
  /** An array of HTTP methods to match.
   * For example, `["GET", "POST"]` will match both `GET` and `POST` Requests. */
  method: z.array(HTTPMethodUnionSchema).optional(),
  /** An object of header key/values to match.
     * This uses the [EventFilter matching syntax](https://trigger.dev/docs/documentation/guides/event-filter).
  
      @example
    ```ts
    filter: {
      header: {
        "content-type": ["application/json"],
      },
    },
    ``` */
  headers: z.record(StringMatchSchema).optional(),
  /** An object of query parameters to match.
     * This uses the [EventFilter matching syntax](https://trigger.dev/docs/documentation/guides/event-filter).
  
    @example
    ```ts
    filter: {
      query: {
        "hub.mode": [{ $startsWith: "sub" }],
      },
    },
    ``` */
  query: z.record(StringMatchSchema).optional(),
  /** An object of key/values to match.
   * This uses the [EventFilter matching syntax](https://trigger.dev/docs/documentation/guides/event-filter).
   */
  body: EventFilterSchema.optional()
});
var ResponseFilterSchema = RequestFilterSchema.omit({ method: true, query: true }).extend({
  status: z.array(z.number()).optional()
});

// ../../node_modules/@trigger.dev/core/dist/esm/schemas/api.js
var UpdateTriggerSourceBodyV1Schema = z.object({
  registeredEvents: z.array(z.string()),
  secret: z.string().optional(),
  data: SerializableJsonSchema.optional()
});
var UpdateTriggerSourceBodyV2Schema = z.object({
  secret: z.string().optional(),
  data: SerializableJsonSchema.optional(),
  options: z.object({
    event: z.array(z.string())
  }).and(z.record(z.string(), z.array(z.string())).optional())
});
var UpdateWebhookBodySchema = z.discriminatedUnion("active", [
  z.object({
    active: z.literal(false)
  }),
  z.object({
    active: z.literal(true),
    config: z.record(z.string().array())
  })
]);
var RegisterHTTPTriggerSourceBodySchema = z.object({
  type: z.literal("HTTP"),
  url: z.string().url()
});
var RegisterSMTPTriggerSourceBodySchema = z.object({
  type: z.literal("SMTP")
});
var RegisterSQSTriggerSourceBodySchema = z.object({
  type: z.literal("SQS")
});
var RegisterSourceChannelBodySchema = z.discriminatedUnion("type", [
  RegisterHTTPTriggerSourceBodySchema,
  RegisterSMTPTriggerSourceBodySchema,
  RegisterSQSTriggerSourceBodySchema
]);
var RegisterWebhookSourceSchema = z.object({
  key: z.string(),
  params: z.any(),
  config: z.any(),
  active: z.boolean(),
  secret: z.string(),
  url: z.string(),
  data: DeserializedJsonSchema.optional(),
  clientId: z.string().optional()
});
var RegisterWebhookPayloadSchema = z.object({
  active: z.boolean(),
  params: z.any().optional(),
  config: z.object({
    current: z.record(z.string().array()),
    desired: z.record(z.string().array())
  }),
  // from HTTP Endpoint
  url: z.string(),
  secret: z.string()
});
var RegisterTriggerSourceSchema = z.object({
  key: z.string(),
  params: z.any(),
  active: z.boolean(),
  secret: z.string(),
  data: DeserializedJsonSchema.optional(),
  channel: RegisterSourceChannelBodySchema,
  clientId: z.string().optional()
});
var SourceEventOptionSchema = z.object({
  name: z.string(),
  value: z.string()
});
var RegisterSourceEventSchemaV1 = z.object({
  /** The id of the source */
  id: z.string(),
  source: RegisterTriggerSourceSchema,
  events: z.array(z.string()),
  missingEvents: z.array(z.string()),
  orphanedEvents: z.array(z.string()),
  dynamicTriggerId: z.string().optional()
});
var RegisteredOptionsDiffSchema = z.object({
  desired: z.array(z.string()),
  missing: z.array(z.string()),
  orphaned: z.array(z.string())
});
var RegisterSourceEventOptionsSchema = z.object({
  event: RegisteredOptionsDiffSchema
}).and(z.record(z.string(), RegisteredOptionsDiffSchema));
var RegisterSourceEventSchemaV2 = z.object({
  /** The id of the source */
  id: z.string(),
  source: RegisterTriggerSourceSchema,
  options: RegisterSourceEventOptionsSchema,
  dynamicTriggerId: z.string().optional()
});
var TriggerSourceSchema = z.object({
  id: z.string(),
  key: z.string()
});
var HttpSourceResponseMetadataSchema = DeserializedJsonSchema;
var HandleTriggerSourceSchema = z.object({
  key: z.string(),
  secret: z.string(),
  data: z.any(),
  params: z.any(),
  auth: ConnectionAuthSchema.optional(),
  metadata: HttpSourceResponseMetadataSchema.optional()
});
var HttpSourceRequestHeadersSchema = z.object({
  "x-ts-key": z.string(),
  "x-ts-dynamic-id": z.string().optional(),
  "x-ts-secret": z.string(),
  "x-ts-data": z.string().transform((s) => JSON.parse(s)),
  "x-ts-params": z.string().transform((s) => JSON.parse(s)),
  "x-ts-http-url": z.string(),
  "x-ts-http-method": z.string(),
  "x-ts-http-headers": z.string().transform((s) => z.record(z.string()).parse(JSON.parse(s))),
  "x-ts-auth": z.string().optional().transform((s) => {
    if (s === void 0)
      return;
    const json = JSON.parse(s);
    return ConnectionAuthSchema.parse(json);
  }),
  "x-ts-metadata": z.string().optional().transform((s) => {
    if (s === void 0)
      return;
    const json = JSON.parse(s);
    return DeserializedJsonSchema.parse(json);
  })
});
var HttpEndpointRequestHeadersSchema = z.object({
  "x-ts-key": z.string(),
  "x-ts-http-url": z.string(),
  "x-ts-http-method": z.string(),
  "x-ts-http-headers": z.string().transform((s) => z.record(z.string()).parse(JSON.parse(s)))
});
var WebhookSourceRequestHeadersSchema = z.object({
  "x-ts-key": z.string(),
  "x-ts-dynamic-id": z.string().optional(),
  "x-ts-secret": z.string(),
  "x-ts-params": z.string().transform((s) => JSON.parse(s)),
  "x-ts-http-url": z.string(),
  "x-ts-http-method": z.string(),
  "x-ts-http-headers": z.string().transform((s) => z.record(z.string()).parse(JSON.parse(s)))
});
var PongSuccessResponseSchema = z.object({
  ok: z.literal(true),
  triggerVersion: z.string().optional(),
  triggerSdkVersion: z.string().optional()
});
var PongErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  triggerVersion: z.string().optional(),
  triggerSdkVersion: z.string().optional()
});
var PongResponseSchema = z.discriminatedUnion("ok", [
  PongSuccessResponseSchema,
  PongErrorResponseSchema
]);
var ValidateSuccessResponseSchema = z.object({
  ok: z.literal(true),
  endpointId: z.string(),
  triggerVersion: z.string().optional()
});
var ValidateErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  triggerVersion: z.string().optional()
});
var ValidateResponseSchema = z.discriminatedUnion("ok", [
  ValidateSuccessResponseSchema,
  ValidateErrorResponseSchema
]);
var QueueOptionsSchema = z.object({
  name: z.string(),
  maxConcurrent: z.number().optional()
});
var ConcurrencyLimitOptionsSchema = z.object({
  id: z.string(),
  limit: z.number()
});
var JobMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  event: EventSpecificationSchema,
  trigger: TriggerMetadataSchema,
  integrations: z.record(IntegrationConfigSchema),
  internal: z.boolean().default(false),
  enabled: z.boolean(),
  startPosition: z.enum(["initial", "latest"]),
  preprocessRuns: z.boolean(),
  concurrencyLimit: ConcurrencyLimitOptionsSchema.or(z.number().int().positive()).optional()
});
var SourceMetadataV1Schema = z.object({
  version: z.literal("1"),
  channel: z.enum(["HTTP", "SQS", "SMTP"]),
  integration: IntegrationConfigSchema,
  key: z.string(),
  params: z.any(),
  events: z.array(z.string()),
  registerSourceJob: z.object({
    id: z.string(),
    version: z.string()
  }).optional()
});
var SourceMetadataV2Schema = z.object({
  version: z.literal("2"),
  channel: z.enum(["HTTP", "SQS", "SMTP"]),
  integration: IntegrationConfigSchema,
  key: z.string(),
  params: z.any(),
  options: z.record(z.array(z.string())),
  registerSourceJob: z.object({
    id: z.string(),
    version: z.string()
  }).optional()
});
var SourceMetadataSchema = z.preprocess(addMissingVersionField, z.discriminatedUnion("version", [SourceMetadataV1Schema, SourceMetadataV2Schema]));
var WebhookMetadataSchema = z.object({
  key: z.string(),
  params: z.any(),
  config: z.record(z.array(z.string())),
  integration: IntegrationConfigSchema,
  httpEndpoint: z.object({
    id: z.string()
  })
});
var WebhookContextMetadataSchema = z.object({
  params: z.any(),
  config: z.record(z.string().array()),
  secret: z.string()
});
var DynamicTriggerEndpointMetadataSchema = z.object({
  id: z.string(),
  jobs: z.array(JobMetadataSchema.pick({ id: true, version: true })),
  registerSourceJob: z.object({
    id: z.string(),
    version: z.string()
  }).optional()
});
var HttpEndpointMetadataSchema = z.object({
  id: z.string(),
  version: z.string(),
  enabled: z.boolean(),
  title: z.string().optional(),
  icon: z.string().optional(),
  properties: z.array(DisplayPropertySchema).optional(),
  event: EventSpecificationSchema,
  immediateResponseFilter: RequestFilterSchema.optional(),
  skipTriggeringRuns: z.boolean().optional(),
  source: z.string()
});
var IndexEndpointResponseSchema = z.object({
  jobs: z.array(JobMetadataSchema),
  sources: z.array(SourceMetadataSchema),
  webhooks: z.array(WebhookMetadataSchema).optional(),
  dynamicTriggers: z.array(DynamicTriggerEndpointMetadataSchema),
  dynamicSchedules: z.array(RegisterDynamicSchedulePayloadSchema),
  httpEndpoints: z.array(HttpEndpointMetadataSchema).optional()
});
var EndpointIndexErrorSchema = z.object({
  message: z.string(),
  raw: z.any().optional()
});
var IndexEndpointStatsSchema = z.object({
  jobs: z.number(),
  sources: z.number(),
  webhooks: z.number().optional(),
  dynamicTriggers: z.number(),
  dynamicSchedules: z.number(),
  disabledJobs: z.number().default(0),
  httpEndpoints: z.number().default(0)
});
var GetEndpointIndexResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("PENDING"),
    updatedAt: z.coerce.date()
  }),
  z.object({
    status: z.literal("STARTED"),
    updatedAt: z.coerce.date()
  }),
  z.object({
    status: z.literal("SUCCESS"),
    stats: IndexEndpointStatsSchema,
    updatedAt: z.coerce.date()
  }),
  z.object({
    status: z.literal("FAILURE"),
    error: EndpointIndexErrorSchema,
    updatedAt: z.coerce.date()
  })
]);
var EndpointHeadersSchema = z.object({
  "trigger-version": z.string().optional(),
  "trigger-sdk-version": z.string().optional()
});
var ExecuteJobRunMetadataSchema = z.object({
  successSubscription: z.boolean().optional(),
  failedSubscription: z.boolean().optional()
});
var ExecuteJobHeadersSchema = EndpointHeadersSchema.extend({
  "x-trigger-run-metadata": z.preprocess((val) => typeof val === "string" && JSON.parse(val), ExecuteJobRunMetadataSchema).optional()
});
var RawEventSchema = z.object({
  /** The `name` property must exactly match any subscriptions you want to
      trigger. */
  name: z.string(),
  /** The `payload` property will be sent to any matching Jobs and will appear
      as the `payload` param of the `run()` function. You can leave this
      parameter out if you just want to trigger a Job without any input data. */
  payload: z.any(),
  /** The optional `context` property will be sent to any matching Jobs and will
      be passed through as the `context.event.context` param of the `run()`
      function. This is optional but can be useful if you want to pass through
      some additional context to the Job. */
  context: z.any().optional(),
  /** The `id` property uniquely identify this particular event. If unset it
      will be set automatically using `ulid`. */
  id: z.string().default(() => globalThis.crypto.randomUUID()),
  /** This is optional, it defaults to the current timestamp. Usually you would
      only set this if you have a timestamp that you wish to pass through, e.g.
      you receive a timestamp from a service and you want the same timestamp to
      be used in your Job. */
  timestamp: z.coerce.date().optional(),
  /** This is optional, it defaults to "trigger.dev". It can be useful to set
      this as you can filter events using this in the `eventTrigger()`. */
  source: z.string().optional(),
  /** This is optional, it defaults to "JSON". If your event is actually a request,
      with a url, headers, method and rawBody you can use "REQUEST" */
  payloadType: z.union([z.literal("JSON"), z.literal("REQUEST")]).optional()
});
var ApiEventLogSchema = z.object({
  /** The `id` of the event that was sent.
   */
  id: z.string(),
  /** The `name` of the event that was sent. */
  name: z.string(),
  /** The `payload` of the event that was sent */
  payload: DeserializedJsonSchema,
  /** The `context` of the event that was sent. Is `undefined` if no context was
      set when sending the event. */
  context: DeserializedJsonSchema.optional().nullable(),
  /** The `timestamp` of the event that was sent */
  timestamp: z.coerce.date(),
  /** The timestamp when the event will be delivered to any matching Jobs. Is
      `undefined` if `deliverAt` or `deliverAfter` wasn't set when sending the
      event. */
  deliverAt: z.coerce.date().optional().nullable(),
  /** The timestamp when the event was delivered. Is `undefined` if `deliverAt`
      or `deliverAfter` were set when sending the event. */
  deliveredAt: z.coerce.date().optional().nullable(),
  /** The timestamp when the event was cancelled. Is `undefined` if the event
   * wasn't cancelled. */
  cancelledAt: z.coerce.date().optional().nullable()
});
var SendEventOptionsSchema = z.object({
  /** An optional Date when you want the event to trigger Jobs. The event will
      be sent to the platform immediately but won't be acted upon until the
      specified time. */
  deliverAt: z.coerce.date().optional(),
  /** An optional number of seconds you want to wait for the event to trigger
      any relevant Jobs. The event will be sent to the platform immediately but
      won't be delivered until after the elapsed number of seconds. */
  deliverAfter: z.number().int().optional(),
  /** This optional param will be used by Trigger.dev Connect, which
      is coming soon. */
  accountId: z.string().optional()
});
var SendEventBodySchema = z.object({
  event: RawEventSchema,
  options: SendEventOptionsSchema.optional()
});
var SendBulkEventsBodySchema = z.object({
  events: RawEventSchema.array(),
  options: SendEventOptionsSchema.optional()
});
var DeliverEventResponseSchema = z.object({
  deliveredAt: z.string().datetime()
});
var RuntimeEnvironmentTypeSchema = z.enum([
  "PRODUCTION",
  "STAGING",
  "DEVELOPMENT",
  "PREVIEW"
]);
var RunSourceContextSchema = z.object({
  id: z.string(),
  metadata: z.any()
});
var AutoYieldConfigSchema = z.object({
  startTaskThreshold: z.number(),
  beforeExecuteTaskThreshold: z.number(),
  beforeCompleteTaskThreshold: z.number(),
  afterCompleteTaskThreshold: z.number()
});
var RunJobBodySchema = z.object({
  event: ApiEventLogSchema,
  job: z.object({
    id: z.string(),
    version: z.string()
  }),
  run: z.object({
    id: z.string(),
    isTest: z.boolean(),
    isRetry: z.boolean().default(false),
    startedAt: z.coerce.date()
  }),
  environment: z.object({
    id: z.string(),
    slug: z.string(),
    type: RuntimeEnvironmentTypeSchema
  }),
  organization: z.object({
    id: z.string(),
    title: z.string(),
    slug: z.string()
  }),
  project: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string()
  }).optional(),
  account: z.object({
    id: z.string(),
    metadata: z.any()
  }).optional(),
  source: RunSourceContextSchema.optional(),
  tasks: z.array(CachedTaskSchema).optional(),
  cachedTaskCursor: z.string().optional(),
  noopTasksSet: z.string().optional(),
  connections: z.record(ConnectionAuthSchema).optional(),
  yieldedExecutions: z.string().array().optional(),
  runChunkExecutionLimit: z.number().optional(),
  autoYieldConfig: AutoYieldConfigSchema.optional()
});
var RunJobErrorSchema = z.object({
  status: z.literal("ERROR"),
  error: ErrorWithStackSchema,
  task: TaskSchema.optional()
});
var RunJobYieldExecutionErrorSchema = z.object({
  status: z.literal("YIELD_EXECUTION"),
  key: z.string()
});
var AutoYieldMetadataSchema = z.object({
  location: z.string(),
  timeRemaining: z.number(),
  timeElapsed: z.number(),
  limit: z.number().optional()
});
var RunJobAutoYieldExecutionErrorSchema = AutoYieldMetadataSchema.extend({
  status: z.literal("AUTO_YIELD_EXECUTION")
});
var RunJobAutoYieldWithCompletedTaskExecutionErrorSchema = z.object({
  status: z.literal("AUTO_YIELD_EXECUTION_WITH_COMPLETED_TASK"),
  id: z.string(),
  properties: z.array(DisplayPropertySchema).optional(),
  output: z.string().optional(),
  data: AutoYieldMetadataSchema
});
var RunJobAutoYieldRateLimitErrorSchema = z.object({
  status: z.literal("AUTO_YIELD_RATE_LIMIT"),
  reset: z.coerce.number()
});
var RunJobInvalidPayloadErrorSchema = z.object({
  status: z.literal("INVALID_PAYLOAD"),
  errors: z.array(SchemaErrorSchema)
});
var RunJobUnresolvedAuthErrorSchema = z.object({
  status: z.literal("UNRESOLVED_AUTH_ERROR"),
  issues: z.record(z.object({ id: z.string(), error: z.string() }))
});
var RunJobResumeWithTaskSchema = z.object({
  status: z.literal("RESUME_WITH_TASK"),
  task: TaskSchema
});
var RunJobRetryWithTaskSchema = z.object({
  status: z.literal("RETRY_WITH_TASK"),
  task: TaskSchema,
  error: ErrorWithStackSchema,
  retryAt: z.coerce.date()
});
var RunJobCanceledWithTaskSchema = z.object({
  status: z.literal("CANCELED"),
  task: TaskSchema
});
var RunJobSuccessSchema = z.object({
  status: z.literal("SUCCESS"),
  output: DeserializedJsonSchema.optional()
});
var RunJobErrorResponseSchema = z.union([
  RunJobAutoYieldExecutionErrorSchema,
  RunJobAutoYieldWithCompletedTaskExecutionErrorSchema,
  RunJobYieldExecutionErrorSchema,
  RunJobAutoYieldRateLimitErrorSchema,
  RunJobErrorSchema,
  RunJobUnresolvedAuthErrorSchema,
  RunJobInvalidPayloadErrorSchema,
  RunJobResumeWithTaskSchema,
  RunJobRetryWithTaskSchema,
  RunJobCanceledWithTaskSchema
]);
var RunJobResumeWithParallelTaskSchema = z.object({
  status: z.literal("RESUME_WITH_PARALLEL_TASK"),
  task: TaskSchema,
  childErrors: z.array(RunJobErrorResponseSchema)
});
var RunJobResponseSchema = z.discriminatedUnion("status", [
  RunJobAutoYieldExecutionErrorSchema,
  RunJobAutoYieldWithCompletedTaskExecutionErrorSchema,
  RunJobYieldExecutionErrorSchema,
  RunJobAutoYieldRateLimitErrorSchema,
  RunJobErrorSchema,
  RunJobUnresolvedAuthErrorSchema,
  RunJobInvalidPayloadErrorSchema,
  RunJobResumeWithTaskSchema,
  RunJobResumeWithParallelTaskSchema,
  RunJobRetryWithTaskSchema,
  RunJobCanceledWithTaskSchema,
  RunJobSuccessSchema
]);
var PreprocessRunBodySchema = z.object({
  event: ApiEventLogSchema,
  job: z.object({
    id: z.string(),
    version: z.string()
  }),
  run: z.object({
    id: z.string(),
    isTest: z.boolean()
  }),
  environment: z.object({
    id: z.string(),
    slug: z.string(),
    type: RuntimeEnvironmentTypeSchema
  }),
  organization: z.object({
    id: z.string(),
    title: z.string(),
    slug: z.string()
  }),
  account: z.object({
    id: z.string(),
    metadata: z.any()
  }).optional()
});
var PreprocessRunResponseSchema = z.object({
  abort: z.boolean(),
  properties: z.array(DisplayPropertySchema).optional()
});
var CreateRunResponseOkSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    id: z.string()
  })
});
var CreateRunResponseErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string()
});
var CreateRunResponseBodySchema = z.discriminatedUnion("ok", [
  CreateRunResponseOkSchema,
  CreateRunResponseErrorSchema
]);
var RedactStringSchema = z.object({
  __redactedString: z.literal(true),
  strings: z.array(z.string()),
  interpolations: z.array(z.string())
});
var LogMessageSchema = z.object({
  level: z.enum(["DEBUG", "INFO", "WARN", "ERROR"]),
  message: z.string(),
  data: SerializableJsonSchema.optional()
});
var RedactSchema = z.object({
  paths: z.array(z.string())
});
var RetryOptionsSchema = z.object({
  /** The maximum number of times to retry the request. */
  limit: z.number().optional(),
  /** The exponential factor to use when calculating the next retry time. */
  factor: z.number().optional(),
  /** The minimum amount of time to wait before retrying the request. */
  minTimeoutInMs: z.number().optional(),
  /** The maximum amount of time to wait before retrying the request. */
  maxTimeoutInMs: z.number().optional(),
  /** Whether to randomize the retry time. */
  randomize: z.boolean().optional()
});
var RunTaskOptionsSchema = z.object({
  /** The name of the Task is required. This is displayed on the Task in the logs. */
  name: z.string().optional(),
  /** The Task will wait and only start at the specified Date  */
  delayUntil: z.coerce.date().optional(),
  /** Retry options */
  retry: RetryOptionsSchema.optional(),
  /** The icon for the Task, it will appear in the logs.
   *  You can use the name of a company in lowercase, e.g. "github".
   *  Or any icon name that [Tabler Icons](https://tabler-icons.io/) supports. */
  icon: z.string().optional(),
  /** The key for the Task that you want to appear in the logs */
  displayKey: z.string().optional(),
  /** A description of the Task */
  description: z.string().optional(),
  /** Properties that are displayed in the logs */
  properties: z.array(DisplayPropertySchema).optional(),
  /** The input params to the Task, will be displayed in the logs  */
  params: z.any(),
  /** The style of the log entry. */
  style: StyleSchema.optional(),
  /** Allows you to expose a `task.callbackUrl` to use in your tasks. Enabling this feature will cause the task to return the data sent to the callbackUrl instead of the usual async callback result. */
  callback: z.object({
    /** Causes the task to wait for and return the data of the first request sent to `task.callbackUrl`. */
    enabled: z.boolean(),
    /** Time to wait for the first request to `task.callbackUrl`. Default: One hour. */
    timeoutInSeconds: z.number()
  }).partial().optional(),
  /** Allows you to link the Integration connection in the logs. This is handled automatically in integrations.  */
  connectionKey: z.string().optional(),
  /** An operation you want to perform on the Trigger.dev platform, current only "fetch", "fetch-response", and "fetch-poll" is supported. If you wish to `fetch` use [`io.backgroundFetch()`](https://trigger.dev/docs/sdk/io/backgroundfetch) instead. */
  operation: z.enum(["fetch", "fetch-response", "fetch-poll"]).optional(),
  /** A No Operation means that the code won't be executed. This is used internally to implement features like [io.wait()](https://trigger.dev/docs/sdk/io/wait).  */
  noop: z.boolean().default(false),
  redact: RedactSchema.optional(),
  parallel: z.boolean().optional()
});
var RunTaskBodyInputSchema = RunTaskOptionsSchema.extend({
  idempotencyKey: z.string(),
  parentId: z.string().optional()
});
var RunTaskBodyOutputSchema = RunTaskBodyInputSchema.extend({
  properties: z.array(DisplayPropertySchema.partial()).optional(),
  params: DeserializedJsonSchema.optional().nullable(),
  callback: z.object({
    enabled: z.boolean(),
    timeoutInSeconds: z.number().default(3600)
  }).optional()
});
var RunTaskResponseWithCachedTasksBodySchema = z.object({
  task: ServerTaskSchema,
  cachedTasks: z.object({
    tasks: z.array(CachedTaskSchema),
    cursor: z.string().optional()
  }).optional()
});
var CompleteTaskBodyInputSchema = RunTaskBodyInputSchema.pick({
  properties: true,
  description: true,
  params: true
}).extend({
  output: SerializableJsonSchema.optional().transform((v) => v ? DeserializedJsonSchema.parse(JSON.parse(JSON.stringify(v))) : {})
});
var CompleteTaskBodyV2InputSchema = RunTaskBodyInputSchema.pick({
  properties: true,
  description: true,
  params: true
}).extend({
  output: z.string().optional()
});
var FailTaskBodyInputSchema = z.object({
  error: ErrorWithStackSchema
});
var NormalizedRequestSchema = z.object({
  headers: z.record(z.string()),
  method: z.string(),
  query: z.record(z.string()),
  url: z.string(),
  body: z.any()
});
var NormalizedResponseSchema = z.object({
  status: z.number(),
  body: z.any(),
  headers: z.record(z.string()).optional()
});
var HttpSourceResponseSchema = z.object({
  response: NormalizedResponseSchema,
  events: z.array(RawEventSchema),
  metadata: HttpSourceResponseMetadataSchema.optional()
});
var WebhookDeliveryResponseSchema = z.object({
  response: NormalizedResponseSchema,
  verified: z.boolean(),
  error: z.string().optional()
});
var RegisterTriggerBodySchemaV1 = z.object({
  rule: EventRuleSchema,
  source: SourceMetadataV1Schema
});
var RegisterTriggerBodySchemaV2 = z.object({
  rule: EventRuleSchema,
  source: SourceMetadataV2Schema,
  accountId: z.string().optional()
});
var InitializeTriggerBodySchema = z.object({
  id: z.string(),
  params: z.any(),
  accountId: z.string().optional(),
  metadata: z.any().optional()
});
var RegisterCommonScheduleBodySchema = z.object({
  /** A unique id for the schedule. This is used to identify and unregister the schedule later. */
  id: z.string(),
  /** Any additional metadata about the schedule. */
  metadata: z.any(),
  /** An optional Account ID to associate with runs triggered by this schedule */
  accountId: z.string().optional()
});
var RegisterIntervalScheduleBodySchema = RegisterCommonScheduleBodySchema.merge(IntervalMetadataSchema);
var InitializeCronScheduleBodySchema = RegisterCommonScheduleBodySchema.merge(CronMetadataSchema);
var RegisterScheduleBodySchema = z.discriminatedUnion("type", [
  RegisterIntervalScheduleBodySchema,
  InitializeCronScheduleBodySchema
]);
var RegisterScheduleResponseBodySchema = z.object({
  id: z.string(),
  schedule: ScheduleMetadataSchema,
  metadata: z.any(),
  active: z.boolean()
});
var CreateExternalConnectionBodySchema = z.object({
  accessToken: z.string(),
  type: z.enum(["oauth2"]),
  scopes: z.array(z.string()).optional(),
  metadata: z.any()
});
var GetRunStatusesSchema = z.object({
  run: z.object({ id: z.string(), status: RunStatusSchema, output: z.any().optional() }),
  statuses: z.array(JobRunStatusRecordSchema)
});
var InvokeJobResponseSchema = z.object({
  id: z.string()
});
var InvokeJobRequestBodySchema = z.object({
  payload: z.any(),
  context: z.any().optional(),
  options: z.object({
    accountId: z.string().optional(),
    callbackUrl: z.string().optional()
  }).optional()
});
var InvokeOptionsSchema = z.object({
  accountId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  context: z.any().optional(),
  callbackUrl: z.string().optional()
});
var EphemeralEventDispatcherRequestBodySchema = z.object({
  url: z.string(),
  name: z.string().or(z.array(z.string())),
  source: z.string().optional(),
  filter: EventFilterSchema.optional(),
  contextFilter: EventFilterSchema.optional(),
  accountId: z.string().optional(),
  timeoutInSeconds: z.number().int().positive().min(10).max(60 * 60 * 24 * 365).default(3600)
});
var EphemeralEventDispatcherResponseBodySchema = z.object({
  id: z.string()
});
var KeyValueStoreResponseBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("DELETE"),
    key: z.string(),
    deleted: z.boolean()
  }),
  z.object({
    action: z.literal("GET"),
    key: z.string(),
    value: z.string().optional()
  }),
  z.object({
    action: z.literal("HAS"),
    key: z.string(),
    has: z.boolean()
  }),
  z.object({
    action: z.literal("SET"),
    key: z.string(),
    value: z.string().optional()
  })
]);

// ../../node_modules/@trigger.dev/core/dist/esm/v3/schemas/webhooks.js
var AlertWebhookRunFailedObject = z.object({
  /** Task information */
  task: z.object({
    /** Unique identifier for the task */
    id: z.string(),
    /** File path where the task is defined */
    filePath: z.string(),
    /** Name of the exported task function */
    exportName: z.string(),
    /** Version of the task */
    version: z.string(),
    /** Version of the SDK used */
    sdkVersion: z.string(),
    /** Version of the CLI used */
    cliVersion: z.string()
  }),
  /** Run information */
  run: z.object({
    /** Unique identifier for the run */
    id: z.string(),
    /** Run number */
    number: z.number(),
    /** Current status of the run */
    status: RunStatus,
    /** When the run was created */
    createdAt: z.coerce.date(),
    /** When the run started executing */
    startedAt: z.coerce.date().optional(),
    /** When the run finished executing */
    completedAt: z.coerce.date().optional(),
    /** Whether this is a test run */
    isTest: z.boolean(),
    /** Idempotency key for the run */
    idempotencyKey: z.string().optional(),
    /** Associated tags */
    tags: z.array(z.string()),
    /** Error information */
    error: TaskRunError,
    /** Whether the run was an out-of-memory error */
    isOutOfMemoryError: z.boolean(),
    /** Machine preset used for the run */
    machine: z.string(),
    /** URL to view the run in the dashboard */
    dashboardUrl: z.string()
  }),
  /** Environment information */
  environment: z.object({
    /** Environment ID */
    id: z.string(),
    /** Environment type */
    type: RuntimeEnvironmentTypeSchema,
    /** Environment slug */
    slug: z.string()
  }),
  /** Organization information */
  organization: z.object({
    /** Organization ID */
    id: z.string(),
    /** Organization slug */
    slug: z.string(),
    /** Organization name */
    name: z.string()
  }),
  /** Project information */
  project: z.object({
    /** Project ID */
    id: z.string(),
    /** Project reference */
    ref: z.string(),
    /** Project slug */
    slug: z.string(),
    /** Project name */
    name: z.string()
  })
});
var DeployError = z.object({
  /** Error name */
  name: z.string(),
  /** Error message */
  message: z.string(),
  /** Error stack trace */
  stack: z.string().optional(),
  /** Standard error output */
  stderr: z.string().optional()
});
var deploymentCommonProperties = {
  /** Environment information */
  environment: z.object({
    id: z.string(),
    type: RuntimeEnvironmentTypeSchema,
    slug: z.string()
  }),
  /** Organization information */
  organization: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string()
  }),
  /** Project information */
  project: z.object({
    id: z.string(),
    ref: z.string(),
    slug: z.string(),
    name: z.string()
  })
};
var deploymentDeploymentCommonProperties = {
  /** Deployment ID */
  id: z.string(),
  /** Deployment status */
  status: z.string(),
  /** Deployment version */
  version: z.string(),
  /** Short code identifier */
  shortCode: z.string()
};
var AlertWebhookDeploymentSuccessObject = z.object({
  ...deploymentCommonProperties,
  deployment: z.object({
    ...deploymentDeploymentCommonProperties,
    /** When the deployment completed */
    deployedAt: z.coerce.date()
  }),
  /** Deployed tasks */
  tasks: z.array(z.object({
    /** Task ID */
    id: z.string(),
    /** File path where the task is defined */
    filePath: z.string(),
    /** Name of the exported task function */
    exportName: z.string(),
    /** Source of the trigger */
    triggerSource: z.string()
  }))
});
var AlertWebhookDeploymentFailedObject = z.object({
  ...deploymentCommonProperties,
  deployment: z.object({
    ...deploymentDeploymentCommonProperties,
    /** When the deployment failed */
    failedAt: z.coerce.date()
  }),
  /** Error information */
  error: DeployError
});
var commonProperties = {
  /** Webhook ID */
  id: z.string(),
  /** When the webhook was created */
  created: z.coerce.date(),
  /** Version of the webhook */
  webhookVersion: z.string()
};
var Webhook = z.discriminatedUnion("type", [
  /** Run failed alert webhook */
  z.object({
    ...commonProperties,
    type: z.literal("alert.run.failed"),
    object: AlertWebhookRunFailedObject
  }),
  /** Deployment success alert webhook */
  z.object({
    ...commonProperties,
    type: z.literal("alert.deployment.success"),
    object: AlertWebhookDeploymentSuccessObject
  }),
  /** Deployment failed alert webhook */
  z.object({
    ...commonProperties,
    type: z.literal("alert.deployment.failed"),
    object: AlertWebhookDeploymentFailedObject
  })
]);

// ../../node_modules/@trigger.dev/core/dist/esm/v3/task-context-api.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/taskContext/index.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/semanticInternalAttributes.js
init_esm();
var SemanticInternalAttributes = {
  ENVIRONMENT_ID: "ctx.environment.id",
  ENVIRONMENT_TYPE: "ctx.environment.type",
  ORGANIZATION_ID: "ctx.organization.id",
  ORGANIZATION_SLUG: "ctx.organization.slug",
  ORGANIZATION_NAME: "ctx.organization.name",
  PROJECT_ID: "ctx.project.id",
  PROJECT_REF: "ctx.project.ref",
  PROJECT_NAME: "ctx.project.title",
  PROJECT_DIR: "project.dir",
  ATTEMPT_ID: "ctx.attempt.id",
  ATTEMPT_NUMBER: "ctx.attempt.number",
  RUN_ID: "ctx.run.id",
  RUN_IS_TEST: "ctx.run.isTest",
  BATCH_ID: "ctx.batch.id",
  TASK_SLUG: "ctx.task.id",
  TASK_PATH: "ctx.task.filePath",
  TASK_EXPORT_NAME: "ctx.task.exportName",
  QUEUE_NAME: "ctx.queue.name",
  QUEUE_ID: "ctx.queue.id",
  MACHINE_PRESET_NAME: "ctx.machine.name",
  MACHINE_PRESET_CPU: "ctx.machine.cpu",
  MACHINE_PRESET_MEMORY: "ctx.machine.memory",
  MACHINE_PRESET_CENTS_PER_MS: "ctx.machine.centsPerMs",
  SPAN_PARTIAL: "$span.partial",
  SPAN_ID: "$span.span_id",
  OUTPUT: "$output",
  OUTPUT_TYPE: "$mime_type_output",
  STYLE: "$style",
  STYLE_ICON: "$style.icon",
  STYLE_VARIANT: "$style.variant",
  STYLE_ACCESSORY: "$style.accessory",
  METADATA: "$metadata",
  TRIGGER: "$trigger",
  PAYLOAD: "$payload",
  PAYLOAD_TYPE: "$mime_type_payload",
  SHOW: "$show",
  SHOW_ACTIONS: "$show.actions",
  WORKER_ID: "worker.id",
  WORKER_VERSION: "worker.version",
  CLI_VERSION: "cli.version",
  SDK_VERSION: "sdk.version",
  SDK_LANGUAGE: "sdk.language",
  RETRY_AT: "retry.at",
  RETRY_DELAY: "retry.delay",
  RETRY_COUNT: "retry.count",
  LINK_TITLE: "$link.title",
  IDEMPOTENCY_KEY: "ctx.run.idempotencyKey",
  USAGE_DURATION_MS: "$usage.durationMs",
  USAGE_COST_IN_CENTS: "$usage.costInCents",
  RATE_LIMIT_LIMIT: "response.rateLimit.limit",
  RATE_LIMIT_REMAINING: "response.rateLimit.remaining",
  RATE_LIMIT_RESET: "response.rateLimit.reset",
  SPAN_ATTEMPT: "$span.attempt",
  METRIC_EVENTS: "$metrics.events"
};

// ../../node_modules/@trigger.dev/core/dist/esm/v3/utils/globals.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/utils/platform.js
init_esm();
var _globalThis = typeof globalThis === "object" ? globalThis : global;

// ../../node_modules/@trigger.dev/core/dist/esm/v3/utils/globals.js
var GLOBAL_TRIGGER_DOT_DEV_KEY = Symbol.for(`dev.trigger.ts.api`);
var _global = _globalThis;
function registerGlobal(type, instance, allowOverride = false) {
  const api = _global[GLOBAL_TRIGGER_DOT_DEV_KEY] = _global[GLOBAL_TRIGGER_DOT_DEV_KEY] ?? {};
  if (!allowOverride && api[type]) {
    const err = new Error(`trigger.dev: Attempted duplicate registration of API: ${type}`);
    return false;
  }
  api[type] = instance;
  return true;
}
function getGlobal(type) {
  return _global[GLOBAL_TRIGGER_DOT_DEV_KEY]?.[type];
}
function unregisterGlobal(type) {
  const api = _global[GLOBAL_TRIGGER_DOT_DEV_KEY];
  if (api) {
    delete api[type];
  }
}

// ../../node_modules/@trigger.dev/core/dist/esm/v3/taskContext/index.js
var API_NAME = "task-context";
var TaskContextAPI = class _TaskContextAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _TaskContextAPI();
    }
    return this._instance;
  }
  get isInsideTask() {
    return this.#getTaskContext() !== void 0;
  }
  get ctx() {
    return this.#getTaskContext()?.ctx;
  }
  get worker() {
    return this.#getTaskContext()?.worker;
  }
  get attributes() {
    if (this.ctx) {
      return {
        ...this.contextAttributes,
        ...this.workerAttributes
      };
    }
    return {};
  }
  get workerAttributes() {
    if (this.worker) {
      return {
        [SemanticInternalAttributes.WORKER_ID]: this.worker.id,
        [SemanticInternalAttributes.WORKER_VERSION]: this.worker.version
      };
    }
    return {};
  }
  get contextAttributes() {
    if (this.ctx) {
      return {
        [SemanticInternalAttributes.ATTEMPT_ID]: this.ctx.attempt.id,
        [SemanticInternalAttributes.ATTEMPT_NUMBER]: this.ctx.attempt.number,
        [SemanticInternalAttributes.TASK_SLUG]: this.ctx.task.id,
        [SemanticInternalAttributes.TASK_PATH]: this.ctx.task.filePath,
        [SemanticInternalAttributes.TASK_EXPORT_NAME]: this.ctx.task.exportName,
        [SemanticInternalAttributes.QUEUE_NAME]: this.ctx.queue.name,
        [SemanticInternalAttributes.QUEUE_ID]: this.ctx.queue.id,
        [SemanticInternalAttributes.ENVIRONMENT_ID]: this.ctx.environment.id,
        [SemanticInternalAttributes.ENVIRONMENT_TYPE]: this.ctx.environment.type,
        [SemanticInternalAttributes.ORGANIZATION_ID]: this.ctx.organization.id,
        [SemanticInternalAttributes.PROJECT_ID]: this.ctx.project.id,
        [SemanticInternalAttributes.PROJECT_REF]: this.ctx.project.ref,
        [SemanticInternalAttributes.PROJECT_NAME]: this.ctx.project.name,
        [SemanticInternalAttributes.RUN_ID]: this.ctx.run.id,
        [SemanticInternalAttributes.RUN_IS_TEST]: this.ctx.run.isTest,
        [SemanticInternalAttributes.ORGANIZATION_SLUG]: this.ctx.organization.slug,
        [SemanticInternalAttributes.ORGANIZATION_NAME]: this.ctx.organization.name,
        [SemanticInternalAttributes.BATCH_ID]: this.ctx.batch?.id,
        [SemanticInternalAttributes.IDEMPOTENCY_KEY]: this.ctx.run.idempotencyKey,
        [SemanticInternalAttributes.MACHINE_PRESET_NAME]: this.ctx.machine?.name,
        [SemanticInternalAttributes.MACHINE_PRESET_CPU]: this.ctx.machine?.cpu,
        [SemanticInternalAttributes.MACHINE_PRESET_MEMORY]: this.ctx.machine?.memory,
        [SemanticInternalAttributes.MACHINE_PRESET_CENTS_PER_MS]: this.ctx.machine?.centsPerMs
      };
    }
    return {};
  }
  disable() {
    unregisterGlobal(API_NAME);
  }
  setGlobalTaskContext(taskContext2) {
    return registerGlobal(API_NAME, taskContext2);
  }
  #getTaskContext() {
    return getGlobal(API_NAME);
  }
};

// ../../node_modules/@trigger.dev/core/dist/esm/v3/task-context-api.js
var taskContext = TaskContextAPI.getInstance();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/apiClient/core.js
init_esm();
var import_zod_validation_error = __toESM(require_cjs2(), 1);

// ../../node_modules/@trigger.dev/core/dist/esm/v3/utils/retries.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/retry.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/utils/retries.js
var defaultRetryOptions = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 1e3,
  maxTimeoutInMs: 6e4,
  randomize: true
};
var defaultFetchRetryOptions = {
  byStatus: {
    "429,408,409,5xx": {
      strategy: "backoff",
      ...defaultRetryOptions
    }
  },
  connectionError: defaultRetryOptions,
  timeout: defaultRetryOptions
};
function calculateNextRetryDelay(options, attempt) {
  const opts = { ...defaultRetryOptions, ...options };
  if (attempt >= opts.maxAttempts) {
    return;
  }
  const { factor, minTimeoutInMs, maxTimeoutInMs, randomize } = opts;
  const random = randomize ? Math.random() + 1 : 1;
  const timeout2 = Math.min(maxTimeoutInMs, random * minTimeoutInMs * Math.pow(factor, attempt - 1));
  return Math.round(timeout2);
}

// ../../node_modules/@trigger.dev/core/dist/esm/v3/apiClient/errors.js
init_esm();
var ApiError = class _ApiError extends Error {
  status;
  headers;
  error;
  code;
  param;
  type;
  constructor(status, error, message, headers) {
    super(`${_ApiError.makeMessage(status, error, message)}`);
    this.name = "TriggerApiError";
    this.status = status;
    this.headers = headers;
    const data = error;
    this.error = data;
    this.code = data?.["code"];
    this.param = data?.["param"];
    this.type = data?.["type"];
  }
  static makeMessage(status, error, message) {
    const msg = error?.message ? typeof error.message === "string" ? error.message : JSON.stringify(error.message) : error ? JSON.stringify(error) : message;
    if (status && msg) {
      return `${status} ${msg}`;
    }
    if (status) {
      return `${status} status code (no body)`;
    }
    if (msg) {
      return msg;
    }
    return "(no status code or body)";
  }
  static generate(status, errorResponse, message, headers) {
    if (!status) {
      return new ApiConnectionError({ cause: castToError(errorResponse) });
    }
    const error = errorResponse?.["error"];
    if (status === 400) {
      return new BadRequestError(status, error, message, headers);
    }
    if (status === 401) {
      return new AuthenticationError(status, error, message, headers);
    }
    if (status === 403) {
      return new PermissionDeniedError(status, error, message, headers);
    }
    if (status === 404) {
      return new NotFoundError(status, error, message, headers);
    }
    if (status === 409) {
      return new ConflictError(status, error, message, headers);
    }
    if (status === 422) {
      return new UnprocessableEntityError(status, error, message, headers);
    }
    if (status === 429) {
      return new RateLimitError(status, error, message, headers);
    }
    if (status >= 500) {
      return new InternalServerError(status, error, message, headers);
    }
    return new _ApiError(status, error, message, headers);
  }
};
var ApiConnectionError = class extends ApiError {
  status = void 0;
  constructor({ message, cause }) {
    super(void 0, void 0, message || "Connection error.", void 0);
    if (cause)
      this.cause = cause;
  }
};
var BadRequestError = class extends ApiError {
  status = 400;
};
var AuthenticationError = class extends ApiError {
  status = 401;
};
var PermissionDeniedError = class extends ApiError {
  status = 403;
};
var NotFoundError = class extends ApiError {
  status = 404;
};
var ConflictError = class extends ApiError {
  status = 409;
};
var UnprocessableEntityError = class extends ApiError {
  status = 422;
};
var RateLimitError = class extends ApiError {
  status = 429;
  get millisecondsUntilReset() {
    const resetAtUnixEpochMs = (this.headers ?? {})["x-ratelimit-reset"];
    if (typeof resetAtUnixEpochMs === "string") {
      const resetAtUnixEpoch = parseInt(resetAtUnixEpochMs, 10);
      if (isNaN(resetAtUnixEpoch)) {
        return;
      }
      return Math.max(resetAtUnixEpoch - Date.now() + Math.floor(Math.random() * 2e3), 0);
    }
    return;
  }
};
var InternalServerError = class extends ApiError {
};
var ApiSchemaValidationError = class extends ApiError {
  status = 200;
  rawBody;
  constructor({ message, cause, status, rawBody, headers }) {
    super(status, void 0, message || "Validation error.", headers);
    if (cause)
      this.cause = cause;
    this.rawBody = rawBody;
  }
};
function castToError(err) {
  if (err instanceof Error)
    return err;
  return new Error(err);
}

// ../../node_modules/@trigger.dev/core/dist/esm/v3/apiClient/core.js
init_esm2();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/utils/styleAttributes.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/utils/flattenAttributes.js
init_esm();
var NULL_SENTINEL = "$@null((";
var CIRCULAR_REFERENCE_SENTINEL = "$@circular((";
function flattenAttributes(obj, prefix, seen = /* @__PURE__ */ new WeakSet()) {
  const result = {};
  if (obj === void 0) {
    return result;
  }
  if (obj === null) {
    result[prefix || ""] = NULL_SENTINEL;
    return result;
  }
  if (typeof obj === "string") {
    result[prefix || ""] = obj;
    return result;
  }
  if (typeof obj === "number") {
    result[prefix || ""] = obj;
    return result;
  }
  if (typeof obj === "boolean") {
    result[prefix || ""] = obj;
    return result;
  }
  if (obj instanceof Date) {
    result[prefix || ""] = obj.toISOString();
    return result;
  }
  if (obj !== null && typeof obj === "object" && seen.has(obj)) {
    result[prefix || ""] = CIRCULAR_REFERENCE_SENTINEL;
    return result;
  }
  if (obj !== null && typeof obj === "object") {
    seen.add(obj);
  }
  for (const [key, value] of Object.entries(obj)) {
    const newPrefix = `${prefix ? `${prefix}.` : ""}${Array.isArray(obj) ? `[${key}]` : key}`;
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (typeof value[i] === "object" && value[i] !== null) {
          Object.assign(result, flattenAttributes(value[i], `${newPrefix}.[${i}]`, seen));
        } else {
          if (value[i] === null) {
            result[`${newPrefix}.[${i}]`] = NULL_SENTINEL;
          } else {
            result[`${newPrefix}.[${i}]`] = value[i];
          }
        }
      }
    } else if (isRecord(value)) {
      Object.assign(result, flattenAttributes(value, newPrefix, seen));
    } else {
      if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
        result[newPrefix] = value;
      } else if (value === null) {
        result[newPrefix] = NULL_SENTINEL;
      }
    }
  }
  return result;
}
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// ../../node_modules/@trigger.dev/core/dist/esm/v3/utils/styleAttributes.js
function accessoryAttributes(accessory) {
  return flattenAttributes(accessory, SemanticInternalAttributes.STYLE_ACCESSORY);
}

// ../../node_modules/@trigger.dev/core/dist/esm/v3/apiClient/pagination.js
init_esm();
var CursorPage = class {
  pageFetcher;
  data;
  pagination;
  constructor(data, pagination, pageFetcher) {
    this.pageFetcher = pageFetcher;
    this.data = data;
    this.pagination = pagination;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  hasNextPage() {
    return !!this.pagination.next;
  }
  hasPreviousPage() {
    return !!this.pagination.previous;
  }
  getNextPage() {
    if (!this.pagination.next) {
      throw new Error("No next page available");
    }
    return this.pageFetcher({ after: this.pagination.next });
  }
  getPreviousPage() {
    if (!this.pagination.previous) {
      throw new Error("No previous page available");
    }
    return this.pageFetcher({ before: this.pagination.previous });
  }
  async *iterPages() {
    let page = this;
    yield page;
    while (page.hasNextPage()) {
      page = await page.getNextPage();
      yield page;
    }
  }
  async *[Symbol.asyncIterator]() {
    for await (const page of this.iterPages()) {
      for (const item of page.getPaginatedItems()) {
        yield item;
      }
    }
  }
};
var OffsetLimitPage = class {
  pageFetcher;
  data;
  pagination;
  constructor(data, pagination, pageFetcher) {
    this.pageFetcher = pageFetcher;
    this.data = data;
    this.pagination = pagination;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  hasNextPage() {
    return this.pagination.currentPage < this.pagination.totalPages;
  }
  hasPreviousPage() {
    return this.pagination.currentPage > 1;
  }
  getNextPage() {
    if (!this.hasNextPage()) {
      throw new Error("No next page available");
    }
    return this.pageFetcher({
      page: this.pagination.currentPage + 1
    });
  }
  getPreviousPage() {
    if (!this.hasPreviousPage()) {
      throw new Error("No previous page available");
    }
    return this.pageFetcher({
      page: this.pagination.currentPage - 1
    });
  }
  async *iterPages() {
    let page = this;
    yield page;
    while (page.hasNextPage()) {
      page = await page.getNextPage();
      yield page;
    }
  }
  async *[Symbol.asyncIterator]() {
    for await (const page of this.iterPages()) {
      for (const item of page.getPaginatedItems()) {
        yield item;
      }
    }
  }
};

// ../../node_modules/eventsource-parser/dist/index.js
init_esm();
var ParseError = class extends Error {
  constructor(message, options) {
    super(message), this.name = "ParseError", this.type = options.type, this.field = options.field, this.value = options.value, this.line = options.line;
  }
};
function noop(_arg) {
}
function createParser(callbacks) {
  if (typeof callbacks == "function")
    throw new TypeError(
      "`callbacks` must be an object, got a function instead. Did you mean `{onEvent: fn}`?"
    );
  const { onEvent = noop, onError = noop, onRetry = noop, onComment } = callbacks;
  let incompleteLine = "", isFirstChunk = true, id, data = "", eventType = "";
  function feed(newChunk) {
    const chunk = isFirstChunk ? newChunk.replace(/^\xEF\xBB\xBF/, "") : newChunk, [complete, incomplete] = splitLines(`${incompleteLine}${chunk}`);
    for (const line of complete)
      parseLine(line);
    incompleteLine = incomplete, isFirstChunk = false;
  }
  function parseLine(line) {
    if (line === "") {
      dispatchEvent();
      return;
    }
    if (line.startsWith(":")) {
      onComment && onComment(line.slice(line.startsWith(": ") ? 2 : 1));
      return;
    }
    const fieldSeparatorIndex = line.indexOf(":");
    if (fieldSeparatorIndex !== -1) {
      const field = line.slice(0, fieldSeparatorIndex), offset = line[fieldSeparatorIndex + 1] === " " ? 2 : 1, value = line.slice(fieldSeparatorIndex + offset);
      processField(field, value, line);
      return;
    }
    processField(line, "", line);
  }
  function processField(field, value, line) {
    switch (field) {
      case "event":
        eventType = value;
        break;
      case "data":
        data = `${data}${value}
`;
        break;
      case "id":
        id = value.includes("\0") ? void 0 : value;
        break;
      case "retry":
        /^\d+$/.test(value) ? onRetry(parseInt(value, 10)) : onError(
          new ParseError(`Invalid \`retry\` value: "${value}"`, {
            type: "invalid-retry",
            value,
            line
          })
        );
        break;
      default:
        onError(
          new ParseError(
            `Unknown field "${field.length > 20 ? `${field.slice(0, 20)}…` : field}"`,
            { type: "unknown-field", field, value, line }
          )
        );
        break;
    }
  }
  function dispatchEvent() {
    data.length > 0 && onEvent({
      id,
      event: eventType || void 0,
      // If the data buffer's last character is a U+000A LINE FEED (LF) character,
      // then remove the last character from the data buffer.
      data: data.endsWith(`
`) ? data.slice(0, -1) : data
    }), id = void 0, data = "", eventType = "";
  }
  function reset(options = {}) {
    incompleteLine && options.consume && parseLine(incompleteLine), isFirstChunk = true, id = void 0, data = "", eventType = "", incompleteLine = "";
  }
  return { feed, reset };
}
function splitLines(chunk) {
  const lines = [];
  let incompleteLine = "", searchIndex = 0;
  for (; searchIndex < chunk.length; ) {
    const crIndex = chunk.indexOf("\r", searchIndex), lfIndex = chunk.indexOf(`
`, searchIndex);
    let lineEnd = -1;
    if (crIndex !== -1 && lfIndex !== -1 ? lineEnd = Math.min(crIndex, lfIndex) : crIndex !== -1 ? lineEnd = crIndex : lfIndex !== -1 && (lineEnd = lfIndex), lineEnd === -1) {
      incompleteLine = chunk.slice(searchIndex);
      break;
    } else {
      const line = chunk.slice(searchIndex, lineEnd);
      lines.push(line), searchIndex = lineEnd + 1, chunk[searchIndex - 1] === "\r" && chunk[searchIndex] === `
` && searchIndex++;
    }
  }
  return [lines, incompleteLine];
}

// ../../node_modules/@trigger.dev/core/dist/esm/v3/apiClient/core.js
var defaultRetryOptions2 = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 1e3,
  maxTimeoutInMs: 6e4,
  randomize: false
};
function zodfetch(schema, url, requestInit, options) {
  return new ApiPromise(_doZodFetch(schema, url, requestInit, options));
}
function zodfetchCursorPage(schema, url, params, requestInit, options) {
  const query = new URLSearchParams(params.query);
  if (params.limit) {
    query.set("page[size]", String(params.limit));
  }
  if (params.after) {
    query.set("page[after]", params.after);
  }
  if (params.before) {
    query.set("page[before]", params.before);
  }
  const cursorPageSchema = z.object({
    data: z.array(schema),
    pagination: z.object({
      next: z.string().optional(),
      previous: z.string().optional()
    })
  });
  const $url = new URL(url);
  $url.search = query.toString();
  const fetchResult = _doZodFetch(cursorPageSchema, $url.href, requestInit, options);
  return new CursorPagePromise(fetchResult, schema, url, params, requestInit, options);
}
function zodfetchOffsetLimitPage(schema, url, params, requestInit, options) {
  const query = new URLSearchParams(params.query);
  if (params.limit) {
    query.set("perPage", String(params.limit));
  }
  if (params.page) {
    query.set("page", String(params.page));
  }
  const offsetLimitPageSchema = z.object({
    data: z.array(schema),
    pagination: z.object({
      currentPage: z.coerce.number(),
      totalPages: z.coerce.number(),
      count: z.coerce.number()
    })
  });
  const $url = new URL(url);
  $url.search = query.toString();
  const fetchResult = _doZodFetch(offsetLimitPageSchema, $url.href, requestInit, options);
  return new OffsetLimitPagePromise(fetchResult, schema, url, params, requestInit, options);
}
async function traceZodFetch(params, callback) {
  if (!params.options?.tracer) {
    return callback();
  }
  const url = new URL(params.url);
  const method = params.requestInit?.method ?? "GET";
  const name = params.options.name ?? `${method} ${url.pathname}`;
  return await params.options.tracer.startActiveSpan(name, async (span) => {
    return await callback(span);
  }, {
    attributes: {
      [SemanticInternalAttributes.STYLE_ICON]: params.options?.icon ?? "api",
      ...params.options.attributes
    }
  });
}
async function _doZodFetch(schema, url, requestInit, options) {
  let $requestInit = await requestInit;
  return traceZodFetch({ url, requestInit: $requestInit, options }, async (span) => {
    $requestInit = injectPropagationHeadersIfInWorker($requestInit);
    const result = await _doZodFetchWithRetries(schema, url, $requestInit, options);
    if (options?.onResponseBody && span) {
      options.onResponseBody(result.data, span);
    }
    if (options?.prepareData) {
      result.data = await options.prepareData(result.data);
    }
    return result;
  });
}
async function _doZodFetchWithRetries(schema, url, requestInit, options, attempt = 1) {
  try {
    const response = await fetch(url, requestInitWithCache(requestInit));
    const responseHeaders = createResponseHeaders(response.headers);
    if (!response.ok) {
      const retryResult = shouldRetry(response, attempt, options?.retry);
      if (retryResult.retry) {
        await waitForRetry(url, attempt + 1, retryResult.delay, options, requestInit, response);
        return await _doZodFetchWithRetries(schema, url, requestInit, options, attempt + 1);
      } else {
        const errText = await response.text().catch((e) => castToError2(e).message);
        const errJSON = safeJsonParse(errText);
        const errMessage = errJSON ? void 0 : errText;
        throw ApiError.generate(response.status, errJSON, errMessage, responseHeaders);
      }
    }
    const jsonBody = await safeJsonFromResponse(response);
    const parsedResult = schema.safeParse(jsonBody);
    if (parsedResult.success) {
      return { data: parsedResult.data, response };
    }
    const validationError = (0, import_zod_validation_error.fromZodError)(parsedResult.error);
    throw new ApiSchemaValidationError({
      status: response.status,
      cause: validationError,
      message: validationError.message,
      rawBody: jsonBody,
      headers: responseHeaders
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof import_zod_validation_error.ValidationError) {
    }
    if (options?.retry) {
      const retry = { ...defaultRetryOptions2, ...options.retry };
      const delay = calculateNextRetryDelay(retry, attempt);
      if (delay) {
        await waitForRetry(url, attempt + 1, delay, options, requestInit);
        return await _doZodFetchWithRetries(schema, url, requestInit, options, attempt + 1);
      }
    }
    throw new ApiConnectionError({ cause: castToError2(error) });
  }
}
async function safeJsonFromResponse(response) {
  try {
    return await response.clone().json();
  } catch (error) {
    return;
  }
}
function castToError2(err) {
  if (err instanceof Error)
    return err;
  return new Error(err);
}
function shouldRetry(response, attempt, retryOptions) {
  function shouldRetryForOptions() {
    const retry = { ...defaultRetryOptions2, ...retryOptions };
    const delay = calculateNextRetryDelay(retry, attempt);
    if (delay) {
      return { retry: true, delay };
    } else {
      return { retry: false };
    }
  }
  const shouldRetryHeader = response.headers.get("x-should-retry");
  if (shouldRetryHeader === "true")
    return shouldRetryForOptions();
  if (shouldRetryHeader === "false")
    return { retry: false };
  if (response.status === 408)
    return shouldRetryForOptions();
  if (response.status === 409)
    return shouldRetryForOptions();
  if (response.status === 429) {
    if (attempt >= (typeof retryOptions?.maxAttempts === "number" ? retryOptions?.maxAttempts : 3)) {
      return { retry: false };
    }
    const resetAtUnixEpochMs = response.headers.get("x-ratelimit-reset");
    if (resetAtUnixEpochMs) {
      const resetAtUnixEpoch = parseInt(resetAtUnixEpochMs, 10);
      const delay = resetAtUnixEpoch - Date.now() + Math.floor(Math.random() * 1e3);
      if (delay > 0) {
        return { retry: true, delay };
      }
    }
    return shouldRetryForOptions();
  }
  if (response.status >= 500)
    return shouldRetryForOptions();
  return { retry: false };
}
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return void 0;
  }
}
function createResponseHeaders(headers) {
  return new Proxy(Object.fromEntries(
    // @ts-ignore
    headers.entries()
  ), {
    get(target, name) {
      const key = name.toString();
      return target[key.toLowerCase()] || target[key];
    }
  });
}
function requestInitWithCache(requestInit) {
  try {
    const withCache = {
      ...requestInit,
      cache: "no-cache"
    };
    const _ = new Request("http://localhost", withCache);
    return withCache;
  } catch (error) {
    return requestInit ?? {};
  }
}
var ApiPromise = class extends Promise {
  responsePromise;
  constructor(responsePromise) {
    super((resolve) => {
      resolve(null);
    });
    this.responsePromise = responsePromise;
  }
  /**
   * Gets the raw `Response` instance instead of parsing the response
   * data.
   *
   * If you want to parse the response body but still get the `Response`
   * instance, you can use {@link withResponse()}.
   */
  asResponse() {
    return this.responsePromise.then((p) => p.response);
  }
  /**
   * Gets the parsed response data and the raw `Response` instance.
   *
   * If you just want to get the raw `Response` instance without parsing it,
   * you can use {@link asResponse()}.
   */
  async withResponse() {
    const [data, response] = await Promise.all([this.parse(), this.asResponse()]);
    return { data, response };
  }
  parse() {
    return this.responsePromise.then((result) => result.data);
  }
  then(onfulfilled, onrejected) {
    return this.parse().then(onfulfilled, onrejected);
  }
  catch(onrejected) {
    return this.parse().catch(onrejected);
  }
  finally(onfinally) {
    return this.parse().finally(onfinally);
  }
};
var CursorPagePromise = class extends ApiPromise {
  schema;
  url;
  params;
  requestInit;
  options;
  constructor(result, schema, url, params, requestInit, options) {
    super(result.then((result2) => ({
      data: new CursorPage(result2.data.data, result2.data.pagination, this.#fetchPage.bind(this)),
      response: result2.response
    })));
    this.schema = schema;
    this.url = url;
    this.params = params;
    this.requestInit = requestInit;
    this.options = options;
  }
  #fetchPage(params) {
    return zodfetchCursorPage(this.schema, this.url, { ...this.params, ...params }, this.requestInit, this.options);
  }
  /**
   * Allow auto-paginating iteration on an unawaited list call, eg:
   *
   *    for await (const item of client.items.list()) {
   *      console.log(item)
   *    }
   */
  async *[Symbol.asyncIterator]() {
    const page = await this;
    for await (const item of page) {
      yield item;
    }
  }
};
var OffsetLimitPagePromise = class extends ApiPromise {
  schema;
  url;
  params;
  requestInit;
  options;
  constructor(result, schema, url, params, requestInit, options) {
    super(result.then((result2) => ({
      data: new OffsetLimitPage(result2.data.data, result2.data.pagination, this.#fetchPage.bind(this)),
      response: result2.response
    })));
    this.schema = schema;
    this.url = url;
    this.params = params;
    this.requestInit = requestInit;
    this.options = options;
  }
  #fetchPage(params) {
    return zodfetchOffsetLimitPage(this.schema, this.url, { ...this.params, ...params }, this.requestInit, this.options);
  }
  /**
   * Allow auto-paginating iteration on an unawaited list call, eg:
   *
   *    for await (const item of client.items.list()) {
   *      console.log(item)
   *    }
   */
  async *[Symbol.asyncIterator]() {
    const page = await this;
    for await (const item of page) {
      yield item;
    }
  }
};
async function waitForRetry(url, attempt, delay, options, requestInit, response) {
  if (options?.tracer) {
    const method = requestInit?.method ?? "GET";
    return options.tracer.startActiveSpan(response ? `wait after ${response.status}` : `wait after error`, async (span) => {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }, {
      attributes: {
        [SemanticInternalAttributes.STYLE_ICON]: "wait",
        ...accessoryAttributes({
          items: [
            {
              text: `retrying ${options?.name ?? method.toUpperCase()} in ${delay}ms`,
              variant: "normal"
            }
          ],
          style: "codepath"
        })
      }
    });
  }
  await new Promise((resolve) => setTimeout(resolve, delay));
}
function injectPropagationHeadersIfInWorker(requestInit) {
  const headers = new Headers(requestInit?.headers);
  if (headers.get("x-trigger-worker") !== "true") {
    return requestInit;
  }
  const headersObject = Object.fromEntries(headers.entries());
  propagation.inject(context.active(), headersObject);
  return {
    ...requestInit,
    headers: new Headers(headersObject)
  };
}

// ../../node_modules/@trigger.dev/core/dist/esm/v3/apiClient/runStream.js
init_esm();

// ../../node_modules/eventsource-parser/dist/stream.js
init_esm();
var EventSourceParserStream = class extends TransformStream {
  constructor({ onError, onRetry, onComment } = {}) {
    let parser;
    super({
      start(controller) {
        parser = createParser({
          onEvent: (event) => {
            controller.enqueue(event);
          },
          onError(error) {
            onError === "terminate" ? controller.error(error) : typeof onError == "function" && onError(error);
          },
          onRetry,
          onComment
        });
      },
      transform(chunk) {
        parser.feed(chunk);
      }
    });
  }
};

// ../../node_modules/@trigger.dev/core/dist/esm/v3/errors.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/links.js
init_esm();
var links = {
  docs: {
    config: {
      home: "https://trigger.dev/docs/config/config-file",
      additionalPackages: "https://trigger.dev/docs/config/config-file#additionalpackages",
      extensions: "https://trigger.dev/docs/config/config-file#extensions",
      prisma: "https://trigger.dev/docs/config/config-file#prisma"
    },
    machines: {
      home: "https://trigger.dev/docs/v3/machines"
    },
    upgrade: {
      beta: "https://trigger.dev/docs/upgrading-beta"
    },
    troubleshooting: {
      concurrentWaits: "https://trigger.dev/docs/troubleshooting#parallel-waits-are-not-supported"
    },
    concurrency: {
      recursiveDeadlock: "https://trigger.dev/docs/queue-concurrency#waiting-for-a-subtask-on-the-same-queue"
    }
  },
  site: {
    home: "https://trigger.dev",
    contact: "https://trigger.dev/contact"
  }
};

// ../../node_modules/@trigger.dev/core/dist/esm/utils.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/errors.js
var InternalError = class extends Error {
  code;
  skipRetrying;
  constructor({ code, message, showStackTrace = true, skipRetrying = false }) {
    super(`${code}: ${message ?? "No message"}`);
    this.name = "TriggerInternalError";
    this.code = code;
    this.message = message ?? "InternalError";
    if (!showStackTrace) {
      this.stack = void 0;
    }
    this.skipRetrying = skipRetrying;
  }
};
function isInternalError(error) {
  return error instanceof Error && error.name === "TriggerInternalError";
}
var MANUAL_OOM_KILL_ERROR_MESSAGE = "MANUAL_OOM_KILL_ERROR";
function isManualOutOfMemoryError(error) {
  if (error.type === "BUILT_IN_ERROR") {
    if (error.message && error.message === MANUAL_OOM_KILL_ERROR_MESSAGE) {
      return true;
    }
  }
  return false;
}
var TaskPayloadParsedError = class extends Error {
  cause;
  constructor(cause) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause);
    super("Parsing payload with schema failed: " + causeMessage);
    this.name = "TaskPayloadParsedError";
    this.cause = cause;
  }
};
function parseError(error) {
  if (isInternalError(error)) {
    return {
      type: "INTERNAL_ERROR",
      code: error.code,
      message: error.message,
      stackTrace: error.stack ?? ""
    };
  }
  if (error instanceof Error) {
    return {
      type: "BUILT_IN_ERROR",
      name: error.name,
      message: error.message,
      stackTrace: error.stack ?? ""
    };
  }
  if (typeof error === "string") {
    return {
      type: "STRING_ERROR",
      raw: error
    };
  }
  try {
    return {
      type: "CUSTOM_ERROR",
      raw: JSON.stringify(error)
    };
  } catch (e) {
    return {
      type: "CUSTOM_ERROR",
      raw: String(error)
    };
  }
}
function createErrorTaskError(error) {
  switch (error.type) {
    case "BUILT_IN_ERROR": {
      const e = new Error(error.message);
      e.name = error.name;
      e.stack = error.stackTrace;
      return e;
    }
    case "STRING_ERROR": {
      return error.raw;
    }
    case "CUSTOM_ERROR": {
      return JSON.parse(error.raw);
    }
    case "INTERNAL_ERROR": {
      const e = new Error(error.message ?? `Internal error (${error.code})`);
      e.name = error.code;
      e.stack = error.stackTrace;
      return e;
    }
  }
}
function createJsonErrorObject(error) {
  const enhancedError = taskRunErrorEnhancer(error);
  switch (enhancedError.type) {
    case "BUILT_IN_ERROR": {
      return {
        name: enhancedError.name,
        message: enhancedError.message,
        stackTrace: enhancedError.stackTrace
      };
    }
    case "STRING_ERROR": {
      return {
        message: enhancedError.raw
      };
    }
    case "CUSTOM_ERROR": {
      return {
        message: enhancedError.raw
      };
    }
    case "INTERNAL_ERROR": {
      return {
        message: `trigger.dev internal error (${enhancedError.code})`
      };
    }
  }
}
function sanitizeError(error) {
  switch (error.type) {
    case "BUILT_IN_ERROR": {
      return {
        type: "BUILT_IN_ERROR",
        message: error.message?.replace(/\0/g, ""),
        name: error.name?.replace(/\0/g, ""),
        stackTrace: error.stackTrace?.replace(/\0/g, "")
      };
    }
    case "STRING_ERROR": {
      return {
        type: "STRING_ERROR",
        raw: error.raw.replace(/\0/g, "")
      };
    }
    case "CUSTOM_ERROR": {
      return {
        type: "CUSTOM_ERROR",
        raw: error.raw.replace(/\0/g, "")
      };
    }
    case "INTERNAL_ERROR": {
      return {
        type: "INTERNAL_ERROR",
        code: error.code,
        message: error.message?.replace(/\0/g, ""),
        stackTrace: error.stackTrace?.replace(/\0/g, "")
      };
    }
  }
}
var prettyInternalErrors = {
  TASK_PROCESS_OOM_KILLED: {
    message: "Your task ran out of memory. Try increasing the machine specs. If this doesn't fix it there might be a memory leak.",
    link: {
      name: "Machines",
      href: links.docs.machines.home
    }
  },
  TASK_PROCESS_MAYBE_OOM_KILLED: {
    message: "We think your task ran out of memory, but we can't be certain. If this keeps happening, try increasing the machine specs.",
    link: {
      name: "Machines",
      href: links.docs.machines.home
    }
  },
  TASK_PROCESS_SIGSEGV: {
    message: "Your task crashed with a segmentation fault (SIGSEGV). Most likely there's a bug in a package or binary you're using. If this keeps happening and you're unsure why, please get in touch.",
    link: {
      name: "Contact us",
      href: links.site.contact,
      magic: "CONTACT_FORM"
    }
  },
  TASK_PROCESS_SIGTERM: {
    message: "Your task exited after receiving SIGTERM but we don't know why. If this keeps happening, please get in touch so we can investigate.",
    link: {
      name: "Contact us",
      href: links.site.contact,
      magic: "CONTACT_FORM"
    }
  },
  OUTDATED_SDK_VERSION: {
    message: "Your task is using an outdated version of the SDK. Please upgrade to the latest version.",
    link: {
      name: "Beta upgrade guide",
      href: links.docs.upgrade.beta
    }
  },
  TASK_DID_CONCURRENT_WAIT: {
    message: "Parallel waits are not supported, e.g. using Promise.all() around our wait functions.",
    link: {
      name: "Read the docs for solutions",
      href: links.docs.troubleshooting.concurrentWaits
    }
  },
  RECURSIVE_WAIT_DEADLOCK: {
    message: "This run will never execute because it was triggered recursively and the task has no remaining concurrency available.",
    link: {
      name: "See docs for help",
      href: links.docs.concurrency.recursiveDeadlock
    }
  }
};
var getPrettyTaskRunError = (code) => {
  return {
    type: "INTERNAL_ERROR",
    code,
    ...prettyInternalErrors[code]
  };
};
var findSignalInMessage = (message, truncateLength = 100) => {
  if (!message) {
    return;
  }
  const trunc = truncateLength ? message.slice(0, truncateLength) : message;
  if (trunc.includes("SIGTERM")) {
    return "SIGTERM";
  } else if (trunc.includes("SIGSEGV")) {
    return "SIGSEGV";
  } else if (trunc.includes("SIGKILL")) {
    return "SIGKILL";
  } else {
    return;
  }
};
function taskRunErrorEnhancer(error) {
  switch (error.type) {
    case "BUILT_IN_ERROR": {
      if (error.name === "UnexpectedExitError") {
        if (error.message.startsWith("Unexpected exit with code -1")) {
          const signal = findSignalInMessage(error.stackTrace);
          switch (signal) {
            case "SIGTERM":
              return {
                ...getPrettyTaskRunError("TASK_PROCESS_SIGTERM")
              };
            case "SIGSEGV":
              return {
                ...getPrettyTaskRunError("TASK_PROCESS_SIGSEGV")
              };
            case "SIGKILL":
              return {
                ...getPrettyTaskRunError("TASK_PROCESS_MAYBE_OOM_KILLED")
              };
            default:
              return {
                ...getPrettyTaskRunError("TASK_PROCESS_EXITED_WITH_NON_ZERO_CODE"),
                message: error.message,
                stackTrace: error.stackTrace
              };
          }
        }
      }
      if (error.name === "Error") {
        if (error.message === "ffmpeg was killed with signal SIGKILL") {
          return {
            ...getPrettyTaskRunError("TASK_PROCESS_OOM_KILLED")
          };
        }
      }
      if (isManualOutOfMemoryError(error)) {
        return {
          ...getPrettyTaskRunError("TASK_PROCESS_OOM_KILLED")
        };
      }
      break;
    }
    case "STRING_ERROR": {
      break;
    }
    case "CUSTOM_ERROR": {
      break;
    }
    case "INTERNAL_ERROR": {
      if (error.code === TaskRunErrorCodes.TASK_PROCESS_EXITED_WITH_NON_ZERO_CODE) {
        const signal = findSignalInMessage(error.message);
        switch (signal) {
          case "SIGTERM":
            return {
              ...getPrettyTaskRunError("TASK_PROCESS_SIGTERM")
            };
          case "SIGSEGV":
            return {
              ...getPrettyTaskRunError("TASK_PROCESS_SIGSEGV")
            };
          case "SIGKILL":
            return {
              ...getPrettyTaskRunError("TASK_PROCESS_MAYBE_OOM_KILLED")
            };
          default: {
            return {
              ...getPrettyTaskRunError("TASK_PROCESS_EXITED_WITH_NON_ZERO_CODE"),
              message: error.message,
              stackTrace: error.stackTrace
            };
          }
        }
      }
      return {
        ...error,
        ...getPrettyTaskRunError(error.code)
      };
    }
  }
  return error;
}

// ../../node_modules/@trigger.dev/core/dist/esm/v3/utils/ioSerialization.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/limits.js
init_esm();
var OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT = 256;
var OTEL_LOG_ATTRIBUTE_COUNT_LIMIT = 256;
var OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT = 1028;
var OTEL_LOG_ATTRIBUTE_VALUE_LENGTH_LIMIT = 1028;
var OTEL_SPAN_EVENT_COUNT_LIMIT = 10;
var OTEL_LINK_COUNT_LIMIT = 2;
var OTEL_ATTRIBUTE_PER_LINK_COUNT_LIMIT = 10;
var OTEL_ATTRIBUTE_PER_EVENT_COUNT_LIMIT = 10;
var OFFLOAD_IO_PACKET_LENGTH_LIMIT = 128 * 1024;

// ../../node_modules/@trigger.dev/core/dist/esm/v3/zodfetch.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/utils/ioSerialization.js
async function parsePacket(value, options) {
  if (!value.data) {
    return void 0;
  }
  switch (value.dataType) {
    case "application/json":
      return JSON.parse(value.data, makeSafeReviver(options));
    case "application/super+json":
      const { parse } = await loadSuperJSON();
      return parse(value.data);
    case "text/plain":
      return value.data;
    case "application/store":
      throw new Error(`Cannot parse an application/store packet (${value.data}). Needs to be imported first.`);
    default:
      return value.data;
  }
}
async function conditionallyImportAndParsePacket(value, client) {
  const importedPacket = await conditionallyImportPacket(value, void 0, client);
  return await parsePacket(importedPacket);
}
async function stringifyIO(value) {
  if (value === void 0) {
    return { dataType: "application/json" };
  }
  if (typeof value === "string") {
    return { data: value, dataType: "text/plain" };
  }
  try {
    const { stringify } = await loadSuperJSON();
    const data = stringify(value);
    return { data, dataType: "application/super+json" };
  } catch {
    return { data: value, dataType: "application/json" };
  }
}
async function conditionallyExportPacket(packet, pathPrefix, tracer) {
  if (apiClientManager.client) {
    const { needsOffloading, size } = packetRequiresOffloading(packet);
    if (needsOffloading) {
      if (!tracer) {
        return await exportPacket(packet, pathPrefix);
      } else {
        const result = await tracer.startActiveSpan("store.uploadOutput", async (span) => {
          return await exportPacket(packet, pathPrefix);
        }, {
          attributes: {
            byteLength: size,
            [SemanticInternalAttributes.STYLE_ICON]: "cloud-upload"
          }
        });
        return result ?? packet;
      }
    }
  }
  return packet;
}
function packetRequiresOffloading(packet, lengthLimit) {
  if (!packet.data) {
    return {
      needsOffloading: false,
      size: 0
    };
  }
  const byteSize = Buffer.byteLength(packet.data, "utf8");
  return {
    needsOffloading: byteSize >= (lengthLimit ?? OFFLOAD_IO_PACKET_LENGTH_LIMIT),
    size: byteSize
  };
}
var ioRetryOptions = {
  minTimeoutInMs: 500,
  maxTimeoutInMs: 5e3,
  maxAttempts: 5,
  factor: 2,
  randomize: true
};
async function exportPacket(packet, pathPrefix) {
  const filename = `${pathPrefix}.${getPacketExtension(packet.dataType)}`;
  const presignedResponse = await apiClientManager.client.createUploadPayloadUrl(filename);
  const uploadResponse = await zodfetch(z.any(), presignedResponse.presignedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": packet.dataType
    },
    body: packet.data
  }, {
    retry: ioRetryOptions
  }).asResponse();
  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload output to ${presignedResponse.presignedUrl}: ${uploadResponse.statusText}`);
  }
  return {
    data: filename,
    dataType: "application/store"
  };
}
async function conditionallyImportPacket(packet, tracer, client) {
  if (packet.dataType !== "application/store") {
    return packet;
  }
  if (!tracer) {
    return await importPacket(packet, void 0, client);
  } else {
    const result = await tracer.startActiveSpan("store.downloadPayload", async (span) => {
      return await importPacket(packet, span, client);
    }, {
      attributes: {
        [SemanticInternalAttributes.STYLE_ICON]: "cloud-download"
      }
    });
    return result ?? packet;
  }
}
async function importPacket(packet, span, client) {
  if (!packet.data) {
    return packet;
  }
  const $client = client ?? apiClientManager.client;
  if (!$client) {
    return packet;
  }
  const presignedResponse = await $client.getPayloadUrl(packet.data);
  const response = await zodfetch(z.any(), presignedResponse.presignedUrl, void 0, {
    retry: ioRetryOptions
  }).asResponse();
  if (!response.ok) {
    throw new Error(`Failed to import packet ${presignedResponse.presignedUrl}: ${response.statusText}`);
  }
  const data = await response.text();
  span?.setAttribute("size", Buffer.byteLength(data, "utf8"));
  return {
    data,
    dataType: response.headers.get("content-type") ?? "application/json"
  };
}
async function createPacketAttributes(packet, dataKey, dataTypeKey) {
  if (!packet.data) {
    return;
  }
  switch (packet.dataType) {
    case "application/json":
      return {
        ...flattenAttributes(packet, dataKey),
        [dataTypeKey]: packet.dataType
      };
    case "application/super+json":
      const { parse } = await loadSuperJSON();
      if (typeof packet.data === "undefined" || packet.data === null) {
        return;
      }
      try {
        const parsed = parse(packet.data);
        const jsonified = JSON.parse(JSON.stringify(parsed, makeSafeReplacer()));
        const result = {
          ...flattenAttributes(jsonified, dataKey),
          [dataTypeKey]: "application/json"
        };
        return result;
      } catch (e) {
        return;
      }
    case "application/store":
      return {
        [dataKey]: packet.data,
        [dataTypeKey]: packet.dataType
      };
    case "text/plain":
      return {
        [dataKey]: packet.data,
        [dataTypeKey]: packet.dataType
      };
    default:
      return;
  }
}
function makeSafeReplacer(options) {
  return function replacer(key, value) {
    if (options?.filteredKeys?.includes(key)) {
      return void 0;
    }
    if (typeof value === "bigint") {
      return value.toString();
    }
    if (value instanceof RegExp) {
      return value.toString();
    }
    if (value instanceof Set) {
      return Array.from(value);
    }
    if (value instanceof Map) {
      const obj = {};
      value.forEach((v, k) => {
        obj[k] = v;
      });
      return obj;
    }
    return value;
  };
}
function makeSafeReviver(options) {
  if (!options) {
    return void 0;
  }
  return function reviver(key, value) {
    if (options?.filteredKeys?.includes(key)) {
      return void 0;
    }
    return value;
  };
}
function getPacketExtension(outputType) {
  switch (outputType) {
    case "application/json":
      return "json";
    case "application/super+json":
      return "json";
    case "text/plain":
      return "txt";
    default:
      return "txt";
  }
}
async function loadSuperJSON() {
  const superjson = await import("./dist-HZSGL5T7.mjs");
  superjson.registerCustom({
    isApplicable: (v) => typeof Buffer === "function" && Buffer.isBuffer(v),
    serialize: (v) => [...v],
    deserialize: (v) => Buffer.from(v)
  }, "buffer");
  return superjson;
}

// ../../node_modules/@trigger.dev/core/dist/esm/v3/apiClient/stream.js
init_esm();

// ../../node_modules/@electric-sql/client/dist/index.mjs
init_esm();
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
var FetchError = class _FetchError extends Error {
  constructor(status, text, json, headers, url, message) {
    super(
      message || `HTTP Error ${status} at ${url}: ${text != null ? text : JSON.stringify(json)}`
    );
    this.url = url;
    this.name = `FetchError`;
    this.status = status;
    this.text = text;
    this.json = json;
    this.headers = headers;
  }
  static fromResponse(response, url) {
    return __async(this, null, function* () {
      const status = response.status;
      const headers = Object.fromEntries([...response.headers.entries()]);
      let text = void 0;
      let json = void 0;
      const contentType = response.headers.get(`content-type`);
      if (contentType && contentType.includes(`application/json`)) {
        json = yield response.json();
      } else {
        text = yield response.text();
      }
      return new _FetchError(status, text, json, headers, url);
    });
  }
};
var FetchBackoffAbortError = class extends Error {
  constructor() {
    super(`Fetch with backoff aborted`);
    this.name = `FetchBackoffAbortError`;
  }
};
var MissingShapeUrlError = class extends Error {
  constructor() {
    super(`Invalid shape options: missing required url parameter`);
    this.name = `MissingShapeUrlError`;
  }
};
var InvalidSignalError = class extends Error {
  constructor() {
    super(`Invalid signal option. It must be an instance of AbortSignal.`);
    this.name = `InvalidSignalError`;
  }
};
var MissingShapeHandleError = class extends Error {
  constructor() {
    super(
      `shapeHandle is required if this isn't an initial fetch (i.e. offset > -1)`
    );
    this.name = `MissingShapeHandleError`;
  }
};
var ReservedParamError = class extends Error {
  constructor(reservedParams) {
    super(
      `Cannot use reserved Electric parameter names in custom params: ${reservedParams.join(`, `)}`
    );
    this.name = `ReservedParamError`;
  }
};
var ParserNullValueError = class extends Error {
  constructor(columnName) {
    super(`Column "${columnName != null ? columnName : `unknown`}" does not allow NULL values`);
    this.name = `ParserNullValueError`;
  }
};
var MissingHeadersError = class extends Error {
  constructor(url, missingHeaders) {
    let msg = `The response for the shape request to ${url} didn't include the following required headers:
`;
    missingHeaders.forEach((h) => {
      msg += `- ${h}
`;
    });
    msg += `
This is often due to a proxy not setting CORS correctly so that all Electric headers can be read by the client.`;
    msg += `
For more information visit the troubleshooting guide: /docs/guides/troubleshooting/missing-headers`;
    super(msg);
  }
};
var parseNumber = (value) => Number(value);
var parseBool = (value) => value === `true` || value === `t`;
var parseBigInt = (value) => BigInt(value);
var parseJson = (value) => JSON.parse(value);
var identityParser = (v) => v;
var defaultParser = {
  int2: parseNumber,
  int4: parseNumber,
  int8: parseBigInt,
  bool: parseBool,
  float4: parseNumber,
  float8: parseNumber,
  json: parseJson,
  jsonb: parseJson
};
function pgArrayParser(value, parser) {
  let i = 0;
  let char = null;
  let str = ``;
  let quoted = false;
  let last = 0;
  let p = void 0;
  function loop(x) {
    const xs = [];
    for (; i < x.length; i++) {
      char = x[i];
      if (quoted) {
        if (char === `\\`) {
          str += x[++i];
        } else if (char === `"`) {
          xs.push(parser ? parser(str) : str);
          str = ``;
          quoted = x[i + 1] === `"`;
          last = i + 2;
        } else {
          str += char;
        }
      } else if (char === `"`) {
        quoted = true;
      } else if (char === `{`) {
        last = ++i;
        xs.push(loop(x));
      } else if (char === `}`) {
        quoted = false;
        last < i && xs.push(parser ? parser(x.slice(last, i)) : x.slice(last, i));
        last = i + 1;
        break;
      } else if (char === `,` && p !== `}` && p !== `"`) {
        xs.push(parser ? parser(x.slice(last, i)) : x.slice(last, i));
        last = i + 1;
      }
      p = char;
    }
    last < i && xs.push(parser ? parser(x.slice(last, i + 1)) : x.slice(last, i + 1));
    return xs;
  }
  return loop(value)[0];
}
var MessageParser = class {
  constructor(parser) {
    this.parser = __spreadValues(__spreadValues({}, defaultParser), parser);
  }
  parse(messages, schema) {
    return JSON.parse(messages, (key, value) => {
      if (key === `value` && typeof value === `object` && value !== null) {
        const row = value;
        Object.keys(row).forEach((key2) => {
          row[key2] = this.parseRow(key2, row[key2], schema);
        });
      }
      return value;
    });
  }
  // Parses the message values using the provided parser based on the schema information
  parseRow(key, value, schema) {
    var _b;
    const columnInfo = schema[key];
    if (!columnInfo) {
      return value;
    }
    const _a = columnInfo, { type: typ, dims: dimensions } = _a, additionalInfo = __objRest(_a, ["type", "dims"]);
    const typeParser = (_b = this.parser[typ]) != null ? _b : identityParser;
    const parser = makeNullableParser(typeParser, columnInfo, key);
    if (dimensions && dimensions > 0) {
      const nullablePgArrayParser = makeNullableParser(
        (value2, _) => pgArrayParser(value2, parser),
        columnInfo,
        key
      );
      return nullablePgArrayParser(value);
    }
    return parser(value, additionalInfo);
  }
};
function makeNullableParser(parser, columnInfo, columnName) {
  var _a;
  const isNullable = !((_a = columnInfo.not_null) != null ? _a : false);
  return (value) => {
    if (isPgNull(value)) {
      if (!isNullable) {
        throw new ParserNullValueError(columnName != null ? columnName : `unknown`);
      }
      return null;
    }
    return parser(value, columnInfo);
  };
}
function isPgNull(value) {
  return value === null || value === `NULL`;
}
function isChangeMessage(message) {
  return `key` in message;
}
function isControlMessage(message) {
  return !isChangeMessage(message);
}
function isUpToDateMessage(message) {
  return isControlMessage(message) && message.headers.control === `up-to-date`;
}
var LIVE_CACHE_BUSTER_HEADER = `electric-cursor`;
var SHAPE_HANDLE_HEADER = `electric-handle`;
var CHUNK_LAST_OFFSET_HEADER = `electric-offset`;
var SHAPE_SCHEMA_HEADER = `electric-schema`;
var CHUNK_UP_TO_DATE_HEADER = `electric-up-to-date`;
var COLUMNS_QUERY_PARAM = `columns`;
var LIVE_CACHE_BUSTER_QUERY_PARAM = `cursor`;
var SHAPE_HANDLE_QUERY_PARAM = `handle`;
var LIVE_QUERY_PARAM = `live`;
var OFFSET_QUERY_PARAM = `offset`;
var TABLE_QUERY_PARAM = `table`;
var WHERE_QUERY_PARAM = `where`;
var REPLICA_PARAM = `replica`;
var HTTP_RETRY_STATUS_CODES = [429];
var BackoffDefaults = {
  initialDelay: 100,
  maxDelay: 1e4,
  multiplier: 1.3
};
function createFetchWithBackoff(fetchClient, backoffOptions = BackoffDefaults) {
  const {
    initialDelay,
    maxDelay,
    multiplier,
    debug = false,
    onFailedAttempt
  } = backoffOptions;
  return (...args) => __async(this, null, function* () {
    var _a;
    const url = args[0];
    const options = args[1];
    let delay = initialDelay;
    let attempt = 0;
    while (true) {
      try {
        const result = yield fetchClient(...args);
        if (result.ok) return result;
        else throw yield FetchError.fromResponse(result, url.toString());
      } catch (e) {
        onFailedAttempt == null ? void 0 : onFailedAttempt();
        if ((_a = options == null ? void 0 : options.signal) == null ? void 0 : _a.aborted) {
          throw new FetchBackoffAbortError();
        } else if (e instanceof FetchError && !HTTP_RETRY_STATUS_CODES.includes(e.status) && e.status >= 400 && e.status < 500) {
          throw e;
        } else {
          yield new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * multiplier, maxDelay);
          if (debug) {
            attempt++;
            console.log(`Retry attempt #${attempt} after ${delay}ms`);
          }
        }
      }
    }
  });
}
var ChunkPrefetchDefaults = {
  maxChunksToPrefetch: 2
};
function createFetchWithChunkBuffer(fetchClient, prefetchOptions = ChunkPrefetchDefaults) {
  const { maxChunksToPrefetch } = prefetchOptions;
  let prefetchQueue;
  const prefetchClient = (...args) => __async(this, null, function* () {
    const url = args[0].toString();
    const prefetchedRequest = prefetchQueue == null ? void 0 : prefetchQueue.consume(...args);
    if (prefetchedRequest) {
      return prefetchedRequest;
    }
    prefetchQueue == null ? void 0 : prefetchQueue.abort();
    const response = yield fetchClient(...args);
    const nextUrl = getNextChunkUrl(url, response);
    if (nextUrl) {
      prefetchQueue = new PrefetchQueue({
        fetchClient,
        maxPrefetchedRequests: maxChunksToPrefetch,
        url: nextUrl,
        requestInit: args[1]
      });
    }
    return response;
  });
  return prefetchClient;
}
var requiredElectricResponseHeaders = [
  `electric-offset`,
  `electric-handle`
];
var requiredLiveResponseHeaders = [`electric-cursor`];
var requiredNonLiveResponseHeaders = [`electric-schema`];
function createFetchWithResponseHeadersCheck(fetchClient) {
  return (...args) => __async(this, null, function* () {
    const response = yield fetchClient(...args);
    if (response.ok) {
      const headers = response.headers;
      const missingHeaders = [];
      const addMissingHeaders = (requiredHeaders) => missingHeaders.push(...requiredHeaders.filter((h) => !headers.has(h)));
      addMissingHeaders(requiredElectricResponseHeaders);
      const input = args[0];
      const urlString = input.toString();
      const url = new URL(urlString);
      if (url.searchParams.get(LIVE_QUERY_PARAM) === `true`) {
        addMissingHeaders(requiredLiveResponseHeaders);
      }
      if (!url.searchParams.has(LIVE_QUERY_PARAM) || url.searchParams.get(LIVE_QUERY_PARAM) === `false`) {
        addMissingHeaders(requiredNonLiveResponseHeaders);
      }
      if (missingHeaders.length > 0) {
        throw new MissingHeadersError(urlString, missingHeaders);
      }
    }
    return response;
  });
}
var _fetchClient;
var _maxPrefetchedRequests;
var _prefetchQueue;
var _queueHeadUrl;
var _queueTailUrl;
var _PrefetchQueue_instances;
var prefetch_fn;
var PrefetchQueue = class {
  constructor(options) {
    __privateAdd(this, _PrefetchQueue_instances);
    __privateAdd(this, _fetchClient);
    __privateAdd(this, _maxPrefetchedRequests);
    __privateAdd(this, _prefetchQueue, /* @__PURE__ */ new Map());
    __privateAdd(this, _queueHeadUrl);
    __privateAdd(this, _queueTailUrl);
    var _a;
    __privateSet(this, _fetchClient, (_a = options.fetchClient) != null ? _a : (...args) => fetch(...args));
    __privateSet(this, _maxPrefetchedRequests, options.maxPrefetchedRequests);
    __privateSet(this, _queueHeadUrl, options.url.toString());
    __privateSet(this, _queueTailUrl, __privateGet(this, _queueHeadUrl));
    __privateMethod(this, _PrefetchQueue_instances, prefetch_fn).call(this, options.url, options.requestInit);
  }
  abort() {
    __privateGet(this, _prefetchQueue).forEach(([_, aborter]) => aborter.abort());
  }
  consume(...args) {
    var _a;
    const url = args[0].toString();
    const request = (_a = __privateGet(this, _prefetchQueue).get(url)) == null ? void 0 : _a[0];
    if (!request || url !== __privateGet(this, _queueHeadUrl)) return;
    __privateGet(this, _prefetchQueue).delete(url);
    request.then((response) => {
      const nextUrl = getNextChunkUrl(url, response);
      __privateSet(this, _queueHeadUrl, nextUrl);
      if (__privateGet(this, _queueTailUrl) && !__privateGet(this, _prefetchQueue).has(__privateGet(this, _queueTailUrl))) {
        __privateMethod(this, _PrefetchQueue_instances, prefetch_fn).call(this, __privateGet(this, _queueTailUrl), args[1]);
      }
    }).catch(() => {
    });
    return request;
  }
};
_fetchClient = /* @__PURE__ */ new WeakMap();
_maxPrefetchedRequests = /* @__PURE__ */ new WeakMap();
_prefetchQueue = /* @__PURE__ */ new WeakMap();
_queueHeadUrl = /* @__PURE__ */ new WeakMap();
_queueTailUrl = /* @__PURE__ */ new WeakMap();
_PrefetchQueue_instances = /* @__PURE__ */ new WeakSet();
prefetch_fn = function(...args) {
  var _a, _b;
  const url = args[0].toString();
  if (__privateGet(this, _prefetchQueue).size >= __privateGet(this, _maxPrefetchedRequests)) return;
  const aborter = new AbortController();
  try {
    const request = __privateGet(this, _fetchClient).call(this, url, __spreadProps(__spreadValues({}, (_a = args[1]) != null ? _a : {}), {
      signal: chainAborter(aborter, (_b = args[1]) == null ? void 0 : _b.signal)
    }));
    __privateGet(this, _prefetchQueue).set(url, [request, aborter]);
    request.then((response) => {
      if (!response.ok || aborter.signal.aborted) return;
      const nextUrl = getNextChunkUrl(url, response);
      if (!nextUrl || nextUrl === url) {
        __privateSet(this, _queueTailUrl, void 0);
        return;
      }
      __privateSet(this, _queueTailUrl, nextUrl);
      return __privateMethod(this, _PrefetchQueue_instances, prefetch_fn).call(this, nextUrl, args[1]);
    }).catch(() => {
    });
  } catch (_) {
  }
};
function getNextChunkUrl(url, res) {
  const shapeHandle = res.headers.get(SHAPE_HANDLE_HEADER);
  const lastOffset = res.headers.get(CHUNK_LAST_OFFSET_HEADER);
  const isUpToDate = res.headers.has(CHUNK_UP_TO_DATE_HEADER);
  if (!shapeHandle || !lastOffset || isUpToDate) return;
  const nextUrl = new URL(url);
  if (nextUrl.searchParams.has(LIVE_QUERY_PARAM)) return;
  nextUrl.searchParams.set(SHAPE_HANDLE_QUERY_PARAM, shapeHandle);
  nextUrl.searchParams.set(OFFSET_QUERY_PARAM, lastOffset);
  nextUrl.searchParams.sort();
  return nextUrl.toString();
}
function chainAborter(aborter, sourceSignal) {
  if (!sourceSignal) return aborter.signal;
  if (sourceSignal.aborted) aborter.abort();
  else
    sourceSignal.addEventListener(`abort`, () => aborter.abort(), {
      once: true
    });
  return aborter.signal;
}
var RESERVED_PARAMS = /* @__PURE__ */ new Set([
  LIVE_CACHE_BUSTER_QUERY_PARAM,
  SHAPE_HANDLE_QUERY_PARAM,
  LIVE_QUERY_PARAM,
  OFFSET_QUERY_PARAM
]);
function toInternalParams(params) {
  const result = {};
  for (const [key, value] of Object.entries(params)) {
    result[key] = Array.isArray(value) ? value.join(`,`) : value;
  }
  return result;
}
var _error;
var _fetchClient2;
var _messageParser;
var _subscribers;
var _lastOffset;
var _liveCacheBuster;
var _lastSyncedAt;
var _isUpToDate;
var _connected;
var _shapeHandle;
var _schema;
var _onError;
var _ShapeStream_instances;
var start_fn;
var publish_fn;
var sendErrorToSubscribers_fn;
var reset_fn;
var ShapeStream = class {
  constructor(options) {
    __privateAdd(this, _ShapeStream_instances);
    __privateAdd(this, _error, null);
    __privateAdd(this, _fetchClient2);
    __privateAdd(this, _messageParser);
    __privateAdd(this, _subscribers, /* @__PURE__ */ new Map());
    __privateAdd(this, _lastOffset);
    __privateAdd(this, _liveCacheBuster);
    __privateAdd(this, _lastSyncedAt);
    __privateAdd(this, _isUpToDate, false);
    __privateAdd(this, _connected, false);
    __privateAdd(this, _shapeHandle);
    __privateAdd(this, _schema);
    __privateAdd(this, _onError);
    var _a, _b, _c;
    this.options = __spreadValues({ subscribe: true }, options);
    validateOptions(this.options);
    __privateSet(this, _lastOffset, (_a = this.options.offset) != null ? _a : `-1`);
    __privateSet(this, _liveCacheBuster, ``);
    __privateSet(this, _shapeHandle, this.options.handle);
    __privateSet(this, _messageParser, new MessageParser(options.parser));
    __privateSet(this, _onError, this.options.onError);
    const baseFetchClient = (_b = options.fetchClient) != null ? _b : (...args) => fetch(...args);
    const fetchWithBackoffClient = createFetchWithBackoff(baseFetchClient, __spreadProps(__spreadValues({}, (_c = options.backoffOptions) != null ? _c : BackoffDefaults), {
      onFailedAttempt: () => {
        var _a2, _b2;
        __privateSet(this, _connected, false);
        (_b2 = (_a2 = options.backoffOptions) == null ? void 0 : _a2.onFailedAttempt) == null ? void 0 : _b2.call(_a2);
      }
    }));
    __privateSet(this, _fetchClient2, createFetchWithResponseHeadersCheck(
      createFetchWithChunkBuffer(fetchWithBackoffClient)
    ));
    __privateMethod(this, _ShapeStream_instances, start_fn).call(this);
  }
  get shapeHandle() {
    return __privateGet(this, _shapeHandle);
  }
  get error() {
    return __privateGet(this, _error);
  }
  get isUpToDate() {
    return __privateGet(this, _isUpToDate);
  }
  get lastOffset() {
    return __privateGet(this, _lastOffset);
  }
  subscribe(callback, onError = () => {
  }) {
    const subscriptionId = Math.random();
    __privateGet(this, _subscribers).set(subscriptionId, [callback, onError]);
    return () => {
      __privateGet(this, _subscribers).delete(subscriptionId);
    };
  }
  unsubscribeAll() {
    __privateGet(this, _subscribers).clear();
  }
  /** Unix time at which we last synced. Undefined when `isLoading` is true. */
  lastSyncedAt() {
    return __privateGet(this, _lastSyncedAt);
  }
  /** Time elapsed since last sync (in ms). Infinity if we did not yet sync. */
  lastSynced() {
    if (__privateGet(this, _lastSyncedAt) === void 0) return Infinity;
    return Date.now() - __privateGet(this, _lastSyncedAt);
  }
  /** Indicates if we are connected to the Electric sync service. */
  isConnected() {
    return __privateGet(this, _connected);
  }
  /** True during initial fetch. False afterwise.  */
  isLoading() {
    return !__privateGet(this, _isUpToDate);
  }
};
_error = /* @__PURE__ */ new WeakMap();
_fetchClient2 = /* @__PURE__ */ new WeakMap();
_messageParser = /* @__PURE__ */ new WeakMap();
_subscribers = /* @__PURE__ */ new WeakMap();
_lastOffset = /* @__PURE__ */ new WeakMap();
_liveCacheBuster = /* @__PURE__ */ new WeakMap();
_lastSyncedAt = /* @__PURE__ */ new WeakMap();
_isUpToDate = /* @__PURE__ */ new WeakMap();
_connected = /* @__PURE__ */ new WeakMap();
_shapeHandle = /* @__PURE__ */ new WeakMap();
_schema = /* @__PURE__ */ new WeakMap();
_onError = /* @__PURE__ */ new WeakMap();
_ShapeStream_instances = /* @__PURE__ */ new WeakSet();
start_fn = function() {
  return __async(this, null, function* () {
    var _a, _b;
    try {
      while (!((_a = this.options.signal) == null ? void 0 : _a.aborted) && !__privateGet(this, _isUpToDate) || this.options.subscribe) {
        const { url, signal } = this.options;
        const fetchUrl = new URL(url);
        if (this.options.params) {
          const reservedParams = Object.keys(this.options.params).filter(
            (key) => RESERVED_PARAMS.has(key)
          );
          if (reservedParams.length > 0) {
            throw new Error(
              `Cannot use reserved Electric parameter names in custom params: ${reservedParams.join(`, `)}`
            );
          }
          const params = toInternalParams(this.options.params);
          if (params.table)
            fetchUrl.searchParams.set(TABLE_QUERY_PARAM, params.table);
          if (params.where)
            fetchUrl.searchParams.set(WHERE_QUERY_PARAM, params.where);
          if (params.columns)
            fetchUrl.searchParams.set(COLUMNS_QUERY_PARAM, params.columns);
          if (params.replica)
            fetchUrl.searchParams.set(REPLICA_PARAM, params.replica);
          const customParams = __spreadValues({}, params);
          delete customParams.table;
          delete customParams.where;
          delete customParams.columns;
          delete customParams.replica;
          for (const [key, value] of Object.entries(customParams)) {
            fetchUrl.searchParams.set(key, value);
          }
        }
        fetchUrl.searchParams.set(OFFSET_QUERY_PARAM, __privateGet(this, _lastOffset));
        if (__privateGet(this, _isUpToDate)) {
          fetchUrl.searchParams.set(LIVE_QUERY_PARAM, `true`);
          fetchUrl.searchParams.set(
            LIVE_CACHE_BUSTER_QUERY_PARAM,
            __privateGet(this, _liveCacheBuster)
          );
        }
        if (__privateGet(this, _shapeHandle)) {
          fetchUrl.searchParams.set(
            SHAPE_HANDLE_QUERY_PARAM,
            __privateGet(this, _shapeHandle)
          );
        }
        fetchUrl.searchParams.sort();
        let response;
        try {
          response = yield __privateGet(this, _fetchClient2).call(this, fetchUrl.toString(), {
            signal,
            headers: this.options.headers
          });
          __privateSet(this, _connected, true);
        } catch (e) {
          if (e instanceof FetchBackoffAbortError) break;
          if (!(e instanceof FetchError)) throw e;
          if (e.status == 409) {
            const newShapeHandle = e.headers[SHAPE_HANDLE_HEADER];
            __privateMethod(this, _ShapeStream_instances, reset_fn).call(this, newShapeHandle);
            yield __privateMethod(this, _ShapeStream_instances, publish_fn).call(this, e.json);
            continue;
          } else if (e.status >= 400 && e.status < 500) {
            __privateMethod(this, _ShapeStream_instances, sendErrorToSubscribers_fn).call(this, e);
            throw e;
          }
        }
        const { headers, status } = response;
        const shapeHandle = headers.get(SHAPE_HANDLE_HEADER);
        if (shapeHandle) {
          __privateSet(this, _shapeHandle, shapeHandle);
        }
        const lastOffset = headers.get(CHUNK_LAST_OFFSET_HEADER);
        if (lastOffset) {
          __privateSet(this, _lastOffset, lastOffset);
        }
        const liveCacheBuster = headers.get(LIVE_CACHE_BUSTER_HEADER);
        if (liveCacheBuster) {
          __privateSet(this, _liveCacheBuster, liveCacheBuster);
        }
        const getSchema = () => {
          const schemaHeader = headers.get(SHAPE_SCHEMA_HEADER);
          return schemaHeader ? JSON.parse(schemaHeader) : {};
        };
        __privateSet(this, _schema, (_b = __privateGet(this, _schema)) != null ? _b : getSchema());
        const messages = status === 204 ? `[]` : yield response.text();
        if (status === 204) {
          __privateSet(this, _lastSyncedAt, Date.now());
        }
        const batch = __privateGet(this, _messageParser).parse(messages, __privateGet(this, _schema));
        if (batch.length > 0) {
          const lastMessage = batch[batch.length - 1];
          if (isUpToDateMessage(lastMessage)) {
            __privateSet(this, _lastSyncedAt, Date.now());
            __privateSet(this, _isUpToDate, true);
          }
          yield __privateMethod(this, _ShapeStream_instances, publish_fn).call(this, batch);
        }
      }
    } catch (err) {
      __privateSet(this, _error, err);
      if (__privateGet(this, _onError)) {
        const retryOpts = yield __privateGet(this, _onError).call(this, err);
        if (typeof retryOpts === `object`) {
          __privateMethod(this, _ShapeStream_instances, reset_fn).call(this);
          if (`params` in retryOpts) {
            this.options.params = retryOpts.params;
          }
          if (`headers` in retryOpts) {
            this.options.headers = retryOpts.headers;
          }
          __privateMethod(this, _ShapeStream_instances, start_fn).call(this);
        }
        return;
      }
      throw err;
    } finally {
      __privateSet(this, _connected, false);
    }
  });
};
publish_fn = function(messages) {
  return __async(this, null, function* () {
    yield Promise.all(
      Array.from(__privateGet(this, _subscribers).values()).map((_0) => __async(this, [_0], function* ([callback, __]) {
        try {
          yield callback(messages);
        } catch (err) {
          queueMicrotask(() => {
            throw err;
          });
        }
      }))
    );
  });
};
sendErrorToSubscribers_fn = function(error) {
  __privateGet(this, _subscribers).forEach(([_, errorFn]) => {
    errorFn == null ? void 0 : errorFn(error);
  });
};
reset_fn = function(handle) {
  __privateSet(this, _lastOffset, `-1`);
  __privateSet(this, _liveCacheBuster, ``);
  __privateSet(this, _shapeHandle, handle);
  __privateSet(this, _isUpToDate, false);
  __privateSet(this, _connected, false);
  __privateSet(this, _schema, void 0);
};
ShapeStream.Replica = {
  FULL: `full`,
  DEFAULT: `default`
};
function validateOptions(options) {
  if (!options.url) {
    throw new MissingShapeUrlError();
  }
  if (options.signal && !(options.signal instanceof AbortSignal)) {
    throw new InvalidSignalError();
  }
  if (options.offset !== void 0 && options.offset !== `-1` && !options.handle) {
    throw new MissingShapeHandleError();
  }
  if (options.params) {
    const reservedParams = Object.keys(options.params).filter(
      (key) => RESERVED_PARAMS.has(key)
    );
    if (reservedParams.length > 0) {
      throw new ReservedParamError(reservedParams);
    }
  }
  return;
}
var _data;
var _subscribers2;
var _hasNotifiedSubscribersUpToDate;
var _error2;
var _Shape_instances;
var process_fn;
var handleError_fn;
var notify_fn;
_data = /* @__PURE__ */ new WeakMap();
_subscribers2 = /* @__PURE__ */ new WeakMap();
_hasNotifiedSubscribersUpToDate = /* @__PURE__ */ new WeakMap();
_error2 = /* @__PURE__ */ new WeakMap();
_Shape_instances = /* @__PURE__ */ new WeakSet();
process_fn = function(messages) {
  let dataMayHaveChanged = false;
  let isUpToDate = false;
  let newlyUpToDate = false;
  messages.forEach((message) => {
    if (isChangeMessage(message)) {
      dataMayHaveChanged = [`insert`, `update`, `delete`].includes(
        message.headers.operation
      );
      switch (message.headers.operation) {
        case `insert`:
          __privateGet(this, _data).set(message.key, message.value);
          break;
        case `update`:
          __privateGet(this, _data).set(message.key, __spreadValues(__spreadValues({}, __privateGet(this, _data).get(message.key)), message.value));
          break;
        case `delete`:
          __privateGet(this, _data).delete(message.key);
          break;
      }
    }
    if (isControlMessage(message)) {
      switch (message.headers.control) {
        case `up-to-date`:
          isUpToDate = true;
          if (!__privateGet(this, _hasNotifiedSubscribersUpToDate)) {
            newlyUpToDate = true;
          }
          break;
        case `must-refetch`:
          __privateGet(this, _data).clear();
          __privateSet(this, _error2, false);
          __privateSet(this, _hasNotifiedSubscribersUpToDate, false);
          isUpToDate = false;
          newlyUpToDate = false;
          break;
      }
    }
  });
  if (newlyUpToDate || isUpToDate && dataMayHaveChanged) {
    __privateSet(this, _hasNotifiedSubscribersUpToDate, true);
    __privateMethod(this, _Shape_instances, notify_fn).call(this);
  }
};
handleError_fn = function(e) {
  if (e instanceof FetchError) {
    __privateSet(this, _error2, e);
    __privateMethod(this, _Shape_instances, notify_fn).call(this);
  }
};
notify_fn = function() {
  __privateGet(this, _subscribers2).forEach((callback) => {
    callback({ value: this.currentValue, rows: this.currentRows });
  });
};

// ../../node_modules/@trigger.dev/core/dist/esm/v3/streams/asyncIterableStream.js
init_esm();
function createAsyncIterableStream(source, transformer) {
  const transformedStream = source.pipeThrough(new TransformStream(transformer));
  transformedStream[Symbol.asyncIterator] = () => {
    const reader = transformedStream.getReader();
    return {
      async next() {
        const { done, value } = await reader.read();
        return done ? { done: true, value: void 0 } : { done: false, value };
      }
    };
  };
  return transformedStream;
}
function createAsyncIterableReadable(source, transformer, signal) {
  return new ReadableStream({
    async start(controller) {
      const transformedStream = source.pipeThrough(new TransformStream(transformer));
      const reader = transformedStream.getReader();
      signal.addEventListener("abort", () => {
        queueMicrotask(() => {
          reader.cancel();
          controller.close();
        });
      });
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          break;
        }
        controller.enqueue(value);
      }
    }
  });
}

// ../../node_modules/@trigger.dev/core/dist/esm/v3/apiClient/stream.js
function zodShapeStream(schema, url, options) {
  const abortController = new AbortController();
  options?.signal?.addEventListener("abort", () => {
    abortController.abort();
  }, { once: true });
  const shapeStream = new ShapeStream({
    url,
    headers: {
      ...options?.headers,
      "x-trigger-electric-version": "1.0.0-beta.1"
    },
    fetchClient: options?.fetchClient,
    signal: abortController.signal,
    onError: (e) => {
      options?.onError?.(e);
    }
  });
  const readableShape = new ReadableShapeStream(shapeStream);
  const stream = readableShape.stream.pipeThrough(new TransformStream({
    async transform(chunk, controller) {
      const result = schema.safeParse(chunk);
      if (result.success) {
        controller.enqueue(result.data);
      } else {
        controller.error(new Error(`Unable to parse shape: ${result.error.message}`));
      }
    }
  }));
  return {
    stream,
    stop: (delay) => {
      if (delay) {
        setTimeout(() => {
          if (abortController.signal.aborted)
            return;
          abortController.abort();
        }, delay);
      } else {
        abortController.abort();
      }
    }
  };
}
var ReadableShapeStream = class {
  #stream;
  #currentState = /* @__PURE__ */ new Map();
  #changeStream;
  #error = false;
  #unsubscribe;
  stop() {
    this.#unsubscribe?.();
  }
  constructor(stream) {
    this.#stream = stream;
    const source = new ReadableStream({
      start: (controller) => {
        this.#unsubscribe = this.#stream.subscribe((messages) => controller.enqueue(messages), this.#handleError.bind(this));
      }
    });
    this.#changeStream = createAsyncIterableStream(source, {
      transform: (messages, controller) => {
        const updatedKeys = /* @__PURE__ */ new Set();
        for (const message of messages) {
          if (isChangeMessage(message)) {
            const key = message.key;
            switch (message.headers.operation) {
              case "insert": {
                this.#currentState.set(key, message.value);
                updatedKeys.add(key);
                break;
              }
              case "update": {
                const existingRow = this.#currentState.get(key);
                const updatedRow = existingRow ? { ...existingRow, ...message.value } : message.value;
                this.#currentState.set(key, updatedRow);
                updatedKeys.add(key);
                break;
              }
            }
          } else if (isControlMessage(message)) {
            if (message.headers.control === "must-refetch") {
              this.#currentState.clear();
              this.#error = false;
            }
          }
        }
        for (const key of updatedKeys) {
          const finalRow = this.#currentState.get(key);
          if (finalRow) {
            controller.enqueue(finalRow);
          }
        }
      }
    });
  }
  get stream() {
    return this.#changeStream;
  }
  get isUpToDate() {
    return this.#stream.isUpToDate;
  }
  get lastOffset() {
    return this.#stream.lastOffset;
  }
  get handle() {
    return this.#stream.shapeHandle;
  }
  get error() {
    return this.#error;
  }
  lastSyncedAt() {
    return this.#stream.lastSyncedAt();
  }
  lastSynced() {
    return this.#stream.lastSynced();
  }
  isLoading() {
    return this.#stream.isLoading();
  }
  isConnected() {
    return this.#stream.isConnected();
  }
  #handleError(e) {
    if (e instanceof FetchError) {
      this.#error = e;
    }
  }
};
var LineTransformStream = class extends TransformStream {
  buffer = "";
  constructor() {
    super({
      transform: (chunk, controller) => {
        this.buffer += chunk;
        const lines = this.buffer.split("\n");
        this.buffer = lines.pop() || "";
        const fullLines = lines.filter((line) => line.trim().length > 0);
        if (fullLines.length > 0) {
          controller.enqueue(fullLines);
        }
      },
      flush: (controller) => {
        const trimmed = this.buffer.trim();
        if (trimmed.length > 0) {
          controller.enqueue([trimmed]);
        }
      }
    });
  }
};

// ../../node_modules/@trigger.dev/core/dist/esm/v3/apiClient/runStream.js
function runShapeStream(url, options) {
  const abortController = new AbortController();
  const streamFactory = new SSEStreamSubscriptionFactory(getEnvVar("TRIGGER_STREAM_URL", getEnvVar("TRIGGER_API_URL")) ?? "https://api.trigger.dev", {
    headers: options?.headers,
    signal: abortController.signal
  });
  options?.signal?.addEventListener("abort", () => {
    if (!abortController.signal.aborted) {
      abortController.abort();
    }
  }, { once: true });
  const runStreamInstance = zodShapeStream(SubscribeRunRawShape, url, {
    ...options,
    signal: abortController.signal,
    onError: (e) => {
      options?.onFetchError?.(e);
    }
  });
  const $options = {
    runShapeStream: runStreamInstance.stream,
    stopRunShapeStream: () => runStreamInstance.stop(30 * 1e3),
    streamFactory,
    abortController,
    ...options
  };
  return new RunSubscription($options);
}
var SSEStreamSubscription = class {
  url;
  options;
  constructor(url, options) {
    this.url = url;
    this.options = options;
  }
  async subscribe() {
    return fetch(this.url, {
      headers: {
        Accept: "text/event-stream",
        ...this.options.headers
      },
      signal: this.options.signal
    }).then((response) => {
      if (!response.ok) {
        throw ApiError.generate(response.status, {}, "Could not subscribe to stream", Object.fromEntries(response.headers));
      }
      if (!response.body) {
        throw new Error("No response body");
      }
      return response.body.pipeThrough(new TextDecoderStream()).pipeThrough(new EventSourceParserStream()).pipeThrough(new TransformStream({
        transform(chunk, controller) {
          controller.enqueue(safeParseJSON(chunk.data));
        }
      }));
    });
  }
};
var SSEStreamSubscriptionFactory = class {
  baseUrl;
  options;
  constructor(baseUrl, options) {
    this.baseUrl = baseUrl;
    this.options = options;
  }
  createSubscription(runId, streamKey, baseUrl) {
    if (!runId || !streamKey) {
      throw new Error("runId and streamKey are required");
    }
    const url = `${baseUrl ?? this.baseUrl}/realtime/v1/streams/${runId}/${streamKey}`;
    return new SSEStreamSubscription(url, this.options);
  }
};
var RunSubscription = class {
  options;
  stream;
  packetCache = /* @__PURE__ */ new Map();
  _closeOnComplete;
  _isRunComplete = false;
  constructor(options) {
    this.options = options;
    this._closeOnComplete = typeof options.closeOnComplete === "undefined" ? true : options.closeOnComplete;
    this.stream = createAsyncIterableReadable(this.options.runShapeStream, {
      transform: async (chunk, controller) => {
        const run = await this.transformRunShape(chunk);
        controller.enqueue(run);
        this._isRunComplete = !!run.finishedAt;
        if (this._closeOnComplete && this._isRunComplete && !this.options.abortController.signal.aborted) {
          this.options.stopRunShapeStream();
        }
      }
    }, this.options.abortController.signal);
  }
  unsubscribe() {
    if (!this.options.abortController.signal.aborted) {
      this.options.abortController.abort();
    }
    this.options.stopRunShapeStream();
  }
  [Symbol.asyncIterator]() {
    return this.stream[Symbol.asyncIterator]();
  }
  getReader() {
    return this.stream.getReader();
  }
  withStreams() {
    const activeStreams = /* @__PURE__ */ new Set();
    return createAsyncIterableReadable(this.stream, {
      transform: async (run, controller) => {
        controller.enqueue({
          type: "run",
          run
        });
        if (run.metadata && "$$streams" in run.metadata && Array.isArray(run.metadata.$$streams)) {
          for (const streamKey of run.metadata.$$streams) {
            if (typeof streamKey !== "string") {
              continue;
            }
            if (!activeStreams.has(streamKey)) {
              activeStreams.add(streamKey);
              const subscription = this.options.streamFactory.createSubscription(run.id, streamKey, this.options.client?.baseUrl);
              subscription.subscribe().then((stream) => {
                stream.pipeThrough(new TransformStream({
                  transform(chunk, controller2) {
                    controller2.enqueue({
                      type: streamKey,
                      chunk,
                      run
                    });
                  }
                })).pipeTo(new WritableStream({
                  write(chunk) {
                    controller.enqueue(chunk);
                  }
                })).catch((error) => {
                  console.error(`Error in stream ${streamKey}:`, error);
                });
              }).catch((error) => {
                console.error(`Error subscribing to stream ${streamKey}:`, error);
              });
            }
          }
        }
      }
    }, this.options.abortController.signal);
  }
  async transformRunShape(row) {
    const payloadPacket = row.payloadType ? { data: row.payload ?? void 0, dataType: row.payloadType } : void 0;
    const outputPacket = row.outputType ? { data: row.output ?? void 0, dataType: row.outputType } : void 0;
    const [payload, output] = await Promise.all([
      { packet: payloadPacket, key: "payload" },
      { packet: outputPacket, key: "output" }
    ].map(async ({ packet, key }) => {
      if (!packet) {
        return;
      }
      const cachedResult = this.packetCache.get(`${row.friendlyId}/${key}`);
      if (typeof cachedResult !== "undefined") {
        return cachedResult;
      }
      const result = await conditionallyImportAndParsePacket(packet, this.options.client);
      this.packetCache.set(`${row.friendlyId}/${key}`, result);
      return result;
    }));
    const metadata = row.metadata && row.metadataType ? await parsePacket({ data: row.metadata, dataType: row.metadataType }) : void 0;
    return {
      id: row.friendlyId,
      payload,
      output,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      taskIdentifier: row.taskIdentifier,
      number: row.number,
      status: apiStatusFromRunStatus(row.status),
      durationMs: row.usageDurationMs,
      costInCents: row.costInCents,
      baseCostInCents: row.baseCostInCents,
      tags: row.runTags ?? [],
      idempotencyKey: row.idempotencyKey ?? void 0,
      expiredAt: row.expiredAt ?? void 0,
      finishedAt: row.completedAt ?? void 0,
      startedAt: row.startedAt ?? void 0,
      delayedUntil: row.delayUntil ?? void 0,
      queuedAt: row.queuedAt ?? void 0,
      error: row.error ? createJsonErrorObject(row.error) : void 0,
      isTest: row.isTest,
      metadata
    };
  }
};
function apiStatusFromRunStatus(status) {
  switch (status) {
    case "DELAYED": {
      return "DELAYED";
    }
    case "WAITING_FOR_DEPLOY": {
      return "WAITING_FOR_DEPLOY";
    }
    case "PENDING": {
      return "QUEUED";
    }
    case "PAUSED":
    case "WAITING_TO_RESUME": {
      return "FROZEN";
    }
    case "RETRYING_AFTER_FAILURE": {
      return "REATTEMPTING";
    }
    case "EXECUTING": {
      return "EXECUTING";
    }
    case "CANCELED": {
      return "CANCELED";
    }
    case "COMPLETED_SUCCESSFULLY": {
      return "COMPLETED";
    }
    case "SYSTEM_FAILURE": {
      return "SYSTEM_FAILURE";
    }
    case "INTERRUPTED": {
      return "INTERRUPTED";
    }
    case "CRASHED": {
      return "CRASHED";
    }
    case "COMPLETED_WITH_ERRORS": {
      return "FAILED";
    }
    case "EXPIRED": {
      return "EXPIRED";
    }
    case "TIMED_OUT": {
      return "TIMED_OUT";
    }
    default: {
      throw new Error(`Unknown status: ${status}`);
    }
  }
}
function safeParseJSON(data) {
  try {
    return JSON.parse(data);
  } catch (error) {
    return data;
  }
}
var isSafari = () => {
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && typeof navigator.userAgent === "string") {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || /iPad|iPhone|iPod/.test(navigator.userAgent);
  }
  return false;
};
if (isSafari()) {
  ReadableStream.prototype.values ??= function({ preventCancel = false } = {}) {
    const reader = this.getReader();
    return {
      async next() {
        try {
          const result = await reader.read();
          if (result.done) {
            reader.releaseLock();
          }
          return result;
        } catch (e) {
          reader.releaseLock();
          throw e;
        }
      },
      async return(value) {
        if (!preventCancel) {
          const cancelPromise = reader.cancel(value);
          reader.releaseLock();
          await cancelPromise;
        } else {
          reader.releaseLock();
        }
        return { done: true, value };
      },
      [Symbol.asyncIterator]() {
        return this;
      }
    };
  };
  ReadableStream.prototype[Symbol.asyncIterator] ??= ReadableStream.prototype.values;
}

// ../../node_modules/@trigger.dev/core/dist/esm/v3/apiClient/index.js
var DEFAULT_ZOD_FETCH_OPTIONS = {
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 1e3,
    maxTimeoutInMs: 3e4,
    factor: 1.6,
    randomize: false
  }
};
var ApiClient = class {
  baseUrl;
  accessToken;
  defaultRequestOptions;
  constructor(baseUrl, accessToken, requestOptions = {}) {
    this.accessToken = accessToken;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.defaultRequestOptions = mergeRequestOptions(DEFAULT_ZOD_FETCH_OPTIONS, requestOptions);
  }
  get fetchClient() {
    const headers = this.#getHeaders(false);
    const fetchClient = (input, requestInit) => {
      const $requestInit = {
        ...requestInit,
        headers: {
          ...requestInit?.headers,
          ...headers
        }
      };
      return fetch(input, $requestInit);
    };
    return fetchClient;
  }
  getHeaders() {
    return this.#getHeaders(false);
  }
  async getRunResult(runId, requestOptions) {
    try {
      return await zodfetch(TaskRunExecutionResult, `${this.baseUrl}/api/v1/runs/${runId}/result`, {
        method: "GET",
        headers: this.#getHeaders(false)
      }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) {
          return void 0;
        }
      }
      throw error;
    }
  }
  async getBatchResults(batchId, requestOptions) {
    return await zodfetch(BatchTaskRunExecutionResult, `${this.baseUrl}/api/v1/batches/${batchId}/results`, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  triggerTask(taskId, body, clientOptions, requestOptions) {
    const encodedTaskId = encodeURIComponent(taskId);
    return zodfetch(TriggerTaskResponse, `${this.baseUrl}/api/v1/tasks/${encodedTaskId}/trigger`, {
      method: "POST",
      headers: this.#getHeaders(clientOptions?.spanParentAsLink ?? false),
      body: JSON.stringify(body)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions)).withResponse().then(async ({ response, data }) => {
      const jwtHeader = response.headers.get("x-trigger-jwt");
      if (typeof jwtHeader === "string") {
        return {
          ...data,
          publicAccessToken: jwtHeader
        };
      }
      const claimsHeader = response.headers.get("x-trigger-jwt-claims");
      const claims = claimsHeader ? JSON.parse(claimsHeader) : void 0;
      const jwt = await generateJWT({
        secretKey: this.accessToken,
        payload: {
          ...claims,
          scopes: [`read:runs:${data.id}`]
        },
        expirationTime: requestOptions?.publicAccessToken?.expirationTime ?? "1h"
      });
      return {
        ...data,
        publicAccessToken: jwt
      };
    });
  }
  batchTriggerV2(body, clientOptions, requestOptions) {
    return zodfetch(BatchTriggerTaskV2Response, `${this.baseUrl}/api/v1/tasks/batch`, {
      method: "POST",
      headers: this.#getHeaders(clientOptions?.spanParentAsLink ?? false, {
        "idempotency-key": clientOptions?.idempotencyKey,
        "idempotency-key-ttl": clientOptions?.idempotencyKeyTTL,
        "batch-processing-strategy": clientOptions?.processingStrategy
      }),
      body: JSON.stringify(body)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions)).withResponse().then(async ({ response, data }) => {
      const claimsHeader = response.headers.get("x-trigger-jwt-claims");
      const claims = claimsHeader ? JSON.parse(claimsHeader) : void 0;
      const jwt = await generateJWT({
        secretKey: this.accessToken,
        payload: {
          ...claims,
          scopes: [`read:batch:${data.id}`]
        },
        expirationTime: requestOptions?.publicAccessToken?.expirationTime ?? "1h"
      });
      return {
        ...data,
        publicAccessToken: jwt
      };
    });
  }
  createUploadPayloadUrl(filename, requestOptions) {
    return zodfetch(CreateUploadPayloadUrlResponseBody, `${this.baseUrl}/api/v1/packets/${filename}`, {
      method: "PUT",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  getPayloadUrl(filename, requestOptions) {
    return zodfetch(CreateUploadPayloadUrlResponseBody, `${this.baseUrl}/api/v1/packets/${filename}`, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  retrieveRun(runId, requestOptions) {
    return zodfetch(RetrieveRunResponse, `${this.baseUrl}/api/v3/runs/${runId}`, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  listRuns(query, requestOptions) {
    const searchParams = createSearchQueryForListRuns(query);
    return zodfetchCursorPage(ListRunResponseItem, `${this.baseUrl}/api/v1/runs`, {
      query: searchParams,
      limit: query?.limit,
      after: query?.after,
      before: query?.before
    }, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  listProjectRuns(projectRef, query, requestOptions) {
    const searchParams = createSearchQueryForListRuns(query);
    if (query?.env) {
      searchParams.append("filter[env]", Array.isArray(query.env) ? query.env.join(",") : query.env);
    }
    return zodfetchCursorPage(ListRunResponseItem, `${this.baseUrl}/api/v1/projects/${projectRef}/runs`, {
      query: searchParams,
      limit: query?.limit,
      after: query?.after,
      before: query?.before
    }, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  replayRun(runId, requestOptions) {
    return zodfetch(ReplayRunResponse, `${this.baseUrl}/api/v1/runs/${runId}/replay`, {
      method: "POST",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  cancelRun(runId, requestOptions) {
    return zodfetch(CanceledRunResponse, `${this.baseUrl}/api/v2/runs/${runId}/cancel`, {
      method: "POST",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  rescheduleRun(runId, body, requestOptions) {
    return zodfetch(RetrieveRunResponse, `${this.baseUrl}/api/v1/runs/${runId}/reschedule`, {
      method: "POST",
      headers: this.#getHeaders(false),
      body: JSON.stringify(body)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  addTags(runId, body, requestOptions) {
    return zodfetch(z.object({ message: z.string() }), `${this.baseUrl}/api/v1/runs/${runId}/tags`, {
      method: "POST",
      headers: this.#getHeaders(false),
      body: JSON.stringify(body)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  createSchedule(options, requestOptions) {
    return zodfetch(ScheduleObject, `${this.baseUrl}/api/v1/schedules`, {
      method: "POST",
      headers: this.#getHeaders(false),
      body: JSON.stringify(options)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  listSchedules(options, requestOptions) {
    const searchParams = new URLSearchParams();
    if (options?.page) {
      searchParams.append("page", options.page.toString());
    }
    if (options?.perPage) {
      searchParams.append("perPage", options.perPage.toString());
    }
    return zodfetchOffsetLimitPage(ScheduleObject, `${this.baseUrl}/api/v1/schedules`, {
      page: options?.page,
      limit: options?.perPage
    }, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  retrieveSchedule(scheduleId, requestOptions) {
    return zodfetch(ScheduleObject, `${this.baseUrl}/api/v1/schedules/${scheduleId}`, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  updateSchedule(scheduleId, options, requestOptions) {
    return zodfetch(ScheduleObject, `${this.baseUrl}/api/v1/schedules/${scheduleId}`, {
      method: "PUT",
      headers: this.#getHeaders(false),
      body: JSON.stringify(options)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  deactivateSchedule(scheduleId, requestOptions) {
    return zodfetch(ScheduleObject, `${this.baseUrl}/api/v1/schedules/${scheduleId}/deactivate`, {
      method: "POST",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  activateSchedule(scheduleId, requestOptions) {
    return zodfetch(ScheduleObject, `${this.baseUrl}/api/v1/schedules/${scheduleId}/activate`, {
      method: "POST",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  deleteSchedule(scheduleId, requestOptions) {
    return zodfetch(DeletedScheduleObject, `${this.baseUrl}/api/v1/schedules/${scheduleId}`, {
      method: "DELETE",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  listEnvVars(projectRef, slug, requestOptions) {
    return zodfetch(EnvironmentVariables, `${this.baseUrl}/api/v1/projects/${projectRef}/envvars/${slug}`, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  importEnvVars(projectRef, slug, body, requestOptions) {
    return zodfetch(EnvironmentVariableResponseBody, `${this.baseUrl}/api/v1/projects/${projectRef}/envvars/${slug}/import`, {
      method: "POST",
      headers: this.#getHeaders(false),
      body: JSON.stringify(body)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  retrieveEnvVar(projectRef, slug, key, requestOptions) {
    return zodfetch(EnvironmentVariableValue, `${this.baseUrl}/api/v1/projects/${projectRef}/envvars/${slug}/${key}`, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  createEnvVar(projectRef, slug, body, requestOptions) {
    return zodfetch(EnvironmentVariableResponseBody, `${this.baseUrl}/api/v1/projects/${projectRef}/envvars/${slug}`, {
      method: "POST",
      headers: this.#getHeaders(false),
      body: JSON.stringify(body)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  updateEnvVar(projectRef, slug, key, body, requestOptions) {
    return zodfetch(EnvironmentVariableResponseBody, `${this.baseUrl}/api/v1/projects/${projectRef}/envvars/${slug}/${key}`, {
      method: "PUT",
      headers: this.#getHeaders(false),
      body: JSON.stringify(body)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  deleteEnvVar(projectRef, slug, key, requestOptions) {
    return zodfetch(EnvironmentVariableResponseBody, `${this.baseUrl}/api/v1/projects/${projectRef}/envvars/${slug}/${key}`, {
      method: "DELETE",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  updateRunMetadata(runId, body, requestOptions) {
    return zodfetch(UpdateMetadataResponseBody, `${this.baseUrl}/api/v1/runs/${runId}/metadata`, {
      method: "PUT",
      headers: this.#getHeaders(false),
      body: JSON.stringify(body)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  getRunMetadata(runId, requestOptions) {
    return zodfetch(UpdateMetadataResponseBody, `${this.baseUrl}/api/v1/runs/${runId}/metadata`, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  subscribeToRun(runId, options) {
    return runShapeStream(`${this.baseUrl}/realtime/v1/runs/${runId}`, {
      closeOnComplete: typeof options?.closeOnComplete === "boolean" ? options.closeOnComplete : true,
      headers: this.#getRealtimeHeaders(),
      client: this,
      signal: options?.signal,
      onFetchError: options?.onFetchError
    });
  }
  subscribeToRunsWithTag(tag, options) {
    const searchParams = createSearchQueryForSubscribeToRuns({
      tags: tag
    });
    return runShapeStream(`${this.baseUrl}/realtime/v1/runs${searchParams ? `?${searchParams}` : ""}`, {
      closeOnComplete: false,
      headers: this.#getRealtimeHeaders(),
      client: this,
      signal: options?.signal,
      onFetchError: options?.onFetchError
    });
  }
  subscribeToBatch(batchId, options) {
    return runShapeStream(`${this.baseUrl}/realtime/v1/batches/${batchId}`, {
      closeOnComplete: false,
      headers: this.#getRealtimeHeaders(),
      client: this,
      signal: options?.signal,
      onFetchError: options?.onFetchError
    });
  }
  async fetchStream(runId, streamKey, options) {
    const streamFactory = new SSEStreamSubscriptionFactory(options?.baseUrl ?? this.baseUrl, {
      headers: this.getHeaders(),
      signal: options?.signal
    });
    const subscription = streamFactory.createSubscription(runId, streamKey);
    const stream = await subscription.subscribe();
    return stream;
  }
  async generateJWTClaims(requestOptions) {
    return zodfetch(z.record(z.any()), `${this.baseUrl}/api/v1/auth/jwt/claims`, {
      method: "POST",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  retrieveBatch(batchId, requestOptions) {
    return zodfetch(RetrieveBatchResponse, `${this.baseUrl}/api/v1/batches/${batchId}`, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  #getHeaders(spanParentAsLink, additionalHeaders) {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.accessToken}`,
      "trigger-version": VERSION,
      ...Object.entries(additionalHeaders ?? {}).reduce((acc, [key, value]) => {
        if (value !== void 0) {
          acc[key] = value;
        }
        return acc;
      }, {})
    };
    if (taskContext.isInsideTask) {
      headers["x-trigger-worker"] = "true";
      if (spanParentAsLink) {
        headers["x-trigger-span-parent-as-link"] = "1";
      }
    }
    if (typeof window !== "undefined" && typeof window.document !== "undefined") {
      headers["x-trigger-client"] = "browser";
    }
    return headers;
  }
  #getRealtimeHeaders() {
    const headers = {
      Authorization: `Bearer ${this.accessToken}`,
      "trigger-version": VERSION
    };
    return headers;
  }
};
function createSearchQueryForSubscribeToRuns(query) {
  const searchParams = new URLSearchParams();
  if (query) {
    if (query.tasks) {
      searchParams.append("tasks", Array.isArray(query.tasks) ? query.tasks.join(",") : query.tasks);
    }
    if (query.tags) {
      searchParams.append("tags", Array.isArray(query.tags) ? query.tags.join(",") : query.tags);
    }
  }
  return searchParams;
}
function createSearchQueryForListRuns(query) {
  const searchParams = new URLSearchParams();
  if (query) {
    if (query.status) {
      searchParams.append("filter[status]", Array.isArray(query.status) ? query.status.join(",") : query.status);
    }
    if (query.taskIdentifier) {
      searchParams.append("filter[taskIdentifier]", Array.isArray(query.taskIdentifier) ? query.taskIdentifier.join(",") : query.taskIdentifier);
    }
    if (query.version) {
      searchParams.append("filter[version]", Array.isArray(query.version) ? query.version.join(",") : query.version);
    }
    if (query.bulkAction) {
      searchParams.append("filter[bulkAction]", query.bulkAction);
    }
    if (query.tag) {
      searchParams.append("filter[tag]", Array.isArray(query.tag) ? query.tag.join(",") : query.tag);
    }
    if (query.schedule) {
      searchParams.append("filter[schedule]", query.schedule);
    }
    if (typeof query.isTest === "boolean") {
      searchParams.append("filter[isTest]", String(query.isTest));
    }
    if (query.from) {
      searchParams.append("filter[createdAt][from]", query.from instanceof Date ? query.from.getTime().toString() : query.from.toString());
    }
    if (query.to) {
      searchParams.append("filter[createdAt][to]", query.to instanceof Date ? query.to.getTime().toString() : query.to.toString());
    }
    if (query.period) {
      searchParams.append("filter[createdAt][period]", query.period);
    }
    if (query.batch) {
      searchParams.append("filter[batch]", query.batch);
    }
  }
  return searchParams;
}
function mergeRequestOptions(defaultOptions, options) {
  if (!options) {
    return defaultOptions;
  }
  return {
    ...defaultOptions,
    ...options,
    retry: {
      ...defaultOptions.retry,
      ...options.retry
    }
  };
}

// ../../node_modules/@trigger.dev/core/dist/esm/v3/apiClientManager/index.js
var API_NAME7 = "api-client";
var ApiClientMissingError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ApiClientMissingError";
  }
};
var APIClientManagerAPI = class _APIClientManagerAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _APIClientManagerAPI();
    }
    return this._instance;
  }
  disable() {
    unregisterGlobal(API_NAME7);
  }
  get baseURL() {
    const config = this.#getConfig();
    return config?.baseURL ?? getEnvVar("TRIGGER_API_URL") ?? "https://api.trigger.dev";
  }
  get accessToken() {
    const config = this.#getConfig();
    return config?.secretKey ?? config?.accessToken ?? getEnvVar("TRIGGER_SECRET_KEY") ?? getEnvVar("TRIGGER_ACCESS_TOKEN");
  }
  get client() {
    if (!this.baseURL || !this.accessToken) {
      return void 0;
    }
    return new ApiClient(this.baseURL, this.accessToken);
  }
  clientOrThrow() {
    if (!this.baseURL || !this.accessToken) {
      throw new ApiClientMissingError(this.apiClientMissingError());
    }
    return new ApiClient(this.baseURL, this.accessToken);
  }
  runWithConfig(config, fn) {
    const originalConfig = this.#getConfig();
    const $config = { ...originalConfig, ...config };
    registerGlobal(API_NAME7, $config, true);
    return fn().finally(() => {
      registerGlobal(API_NAME7, originalConfig, true);
    });
  }
  setGlobalAPIClientConfiguration(config) {
    return registerGlobal(API_NAME7, config);
  }
  #getConfig() {
    return getGlobal(API_NAME7);
  }
  apiClientMissingError() {
    const hasBaseUrl = !!this.baseURL;
    const hasAccessToken = !!this.accessToken;
    if (!hasBaseUrl && !hasAccessToken) {
      return `You need to set the TRIGGER_API_URL and TRIGGER_SECRET_KEY environment variables. See https://trigger.dev/docs/management/overview#authentication`;
    } else if (!hasBaseUrl) {
      return `You need to set the TRIGGER_API_URL environment variable. See https://trigger.dev/docs/management/overview#authentication`;
    } else if (!hasAccessToken) {
      return `You need to set the TRIGGER_SECRET_KEY environment variable. See https://trigger.dev/docs/management/overview#authentication`;
    }
    return `Unknown error`;
  }
};

// ../../node_modules/@trigger.dev/core/dist/esm/v3/apiClientManager-api.js
var apiClientManager = APIClientManagerAPI.getInstance();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/clock-api.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/clock/index.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/clock/simpleClock.js
init_esm();
var import_precise_date = __toESM(require_src(), 1);
var SimpleClock = class {
  preciseNow() {
    const now = new import_precise_date.PreciseDate();
    const nowStruct = now.toStruct();
    return [nowStruct.seconds, nowStruct.nanos];
  }
  reset() {
  }
};

// ../../node_modules/@trigger.dev/core/dist/esm/v3/clock/index.js
var API_NAME8 = "clock";
var SIMPLE_CLOCK = new SimpleClock();
var ClockAPI = class _ClockAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _ClockAPI();
    }
    return this._instance;
  }
  setGlobalClock(clock2) {
    return registerGlobal(API_NAME8, clock2);
  }
  preciseNow() {
    return this.#getClock().preciseNow();
  }
  reset() {
    this.#getClock().reset();
  }
  #getClock() {
    return getGlobal(API_NAME8) ?? SIMPLE_CLOCK;
  }
};

// ../../node_modules/@trigger.dev/core/dist/esm/v3/clock-api.js
var clock = ClockAPI.getInstance();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/logger/taskLogger.js
init_esm();
var import_api_logs2 = __toESM(require_src2(), 1);

// ../../node_modules/@trigger.dev/core/dist/esm/v3/icons.js
init_esm();
var import_api_logs = __toESM(require_src2(), 1);
function iconStringForSeverity(severityNumber) {
  switch (severityNumber) {
    case import_api_logs.SeverityNumber.UNSPECIFIED:
      return void 0;
    case import_api_logs.SeverityNumber.TRACE:
    case import_api_logs.SeverityNumber.TRACE2:
    case import_api_logs.SeverityNumber.TRACE3:
    case import_api_logs.SeverityNumber.TRACE4:
      return "trace";
    case import_api_logs.SeverityNumber.DEBUG:
    case import_api_logs.SeverityNumber.DEBUG2:
    case import_api_logs.SeverityNumber.DEBUG3:
    case import_api_logs.SeverityNumber.DEBUG4:
      return "debug";
    case import_api_logs.SeverityNumber.INFO:
    case import_api_logs.SeverityNumber.INFO2:
    case import_api_logs.SeverityNumber.INFO3:
    case import_api_logs.SeverityNumber.INFO4:
      return "info";
    case import_api_logs.SeverityNumber.WARN:
    case import_api_logs.SeverityNumber.WARN2:
    case import_api_logs.SeverityNumber.WARN3:
    case import_api_logs.SeverityNumber.WARN4:
      return "warn";
    case import_api_logs.SeverityNumber.ERROR:
    case import_api_logs.SeverityNumber.ERROR2:
    case import_api_logs.SeverityNumber.ERROR3:
    case import_api_logs.SeverityNumber.ERROR4:
      return "error";
    case import_api_logs.SeverityNumber.FATAL:
    case import_api_logs.SeverityNumber.FATAL2:
    case import_api_logs.SeverityNumber.FATAL3:
    case import_api_logs.SeverityNumber.FATAL4:
      return "fatal";
  }
}

// ../../node_modules/@trigger.dev/core/dist/esm/v3/logger/taskLogger.js
var logLevels = ["none", "error", "warn", "info", "debug"];
var OtelTaskLogger = class {
  _config;
  _level;
  constructor(_config) {
    this._config = _config;
    this._level = logLevels.indexOf(_config.level);
  }
  debug(message, properties) {
    if (this._level < 4)
      return;
    this.#emitLog(message, this.#getTimestampInHrTime(), "debug", import_api_logs2.SeverityNumber.DEBUG, properties);
  }
  log(message, properties) {
    if (this._level < 3)
      return;
    this.#emitLog(message, this.#getTimestampInHrTime(), "log", import_api_logs2.SeverityNumber.INFO, properties);
  }
  info(message, properties) {
    if (this._level < 3)
      return;
    this.#emitLog(message, this.#getTimestampInHrTime(), "info", import_api_logs2.SeverityNumber.INFO, properties);
  }
  warn(message, properties) {
    if (this._level < 2)
      return;
    this.#emitLog(message, this.#getTimestampInHrTime(), "warn", import_api_logs2.SeverityNumber.WARN, properties);
  }
  error(message, properties) {
    if (this._level < 1)
      return;
    this.#emitLog(message, this.#getTimestampInHrTime(), "error", import_api_logs2.SeverityNumber.ERROR, properties);
  }
  #emitLog(message, timestamp, severityText, severityNumber, properties) {
    let attributes = { ...flattenAttributes(safeJsonProcess(properties)) };
    const icon = iconStringForSeverity(severityNumber);
    if (icon !== void 0) {
      attributes[SemanticInternalAttributes.STYLE_ICON] = icon;
    }
    this._config.logger.emit({
      severityNumber,
      severityText,
      body: message,
      attributes,
      timestamp
    });
  }
  trace(name, fn, options) {
    return this._config.tracer.startActiveSpan(name, fn, options);
  }
  startSpan(name, options) {
    return this._config.tracer.startSpan(name, options);
  }
  #getTimestampInHrTime() {
    return clock.preciseNow();
  }
};
var NoopTaskLogger = class {
  debug() {
  }
  log() {
  }
  info() {
  }
  warn() {
  }
  error() {
  }
  trace(name, fn) {
    return fn({});
  }
  startSpan() {
    return {};
  }
};
function safeJsonProcess(value) {
  try {
    return JSON.parse(JSON.stringify(value, jsonErrorReplacer));
  } catch {
    return value;
  }
}
function jsonErrorReplacer(key, value) {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    };
  }
  return value;
}

// ../../node_modules/@trigger.dev/core/dist/esm/v3/logger-api.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/logger/index.js
init_esm();
var API_NAME9 = "logger";
var NOOP_TASK_LOGGER = new NoopTaskLogger();
var LoggerAPI = class _LoggerAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _LoggerAPI();
    }
    return this._instance;
  }
  disable() {
    unregisterGlobal(API_NAME9);
  }
  setGlobalTaskLogger(taskLogger) {
    return registerGlobal(API_NAME9, taskLogger);
  }
  debug(message, metadata) {
    this.#getTaskLogger().debug(message, metadata);
  }
  log(message, metadata) {
    this.#getTaskLogger().log(message, metadata);
  }
  info(message, metadata) {
    this.#getTaskLogger().info(message, metadata);
  }
  warn(message, metadata) {
    this.#getTaskLogger().warn(message, metadata);
  }
  error(message, metadata) {
    this.#getTaskLogger().error(message, metadata);
  }
  trace(name, fn, options) {
    return this.#getTaskLogger().trace(name, fn, options);
  }
  startSpan(name, options) {
    return this.#getTaskLogger().startSpan(name, options);
  }
  #getTaskLogger() {
    return getGlobal(API_NAME9) ?? NOOP_TASK_LOGGER;
  }
};

// ../../node_modules/@trigger.dev/core/dist/esm/v3/logger-api.js
var logger = LoggerAPI.getInstance();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/usage-api.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/usage/api.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/usage/noopUsageManager.js
init_esm();
var NoopUsageManager = class {
  disable() {
  }
  start() {
    return {
      sample: () => ({ cpuTime: 0, wallTime: 0 })
    };
  }
  stop(measurement) {
    return measurement.sample();
  }
  pauseAsync(cb) {
    return cb();
  }
  sample() {
    return void 0;
  }
};

// ../../node_modules/@trigger.dev/core/dist/esm/v3/usage/api.js
var API_NAME10 = "usage";
var NOOP_USAGE_MANAGER = new NoopUsageManager();
var UsageAPI = class _UsageAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _UsageAPI();
    }
    return this._instance;
  }
  setGlobalUsageManager(manager) {
    return registerGlobal(API_NAME10, manager);
  }
  disable() {
    this.#getUsageManager().disable();
    unregisterGlobal(API_NAME10);
  }
  start() {
    return this.#getUsageManager().start();
  }
  stop(measurement) {
    return this.#getUsageManager().stop(measurement);
  }
  pauseAsync(cb) {
    return this.#getUsageManager().pauseAsync(cb);
  }
  sample() {
    return this.#getUsageManager().sample();
  }
  #getUsageManager() {
    return getGlobal(API_NAME10) ?? NOOP_USAGE_MANAGER;
  }
};

// ../../node_modules/@trigger.dev/core/dist/esm/v3/usage-api.js
var usage = UsageAPI.getInstance();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/runtime-api.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/runtime/index.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/runtime/noopRuntimeManager.js
init_esm();
var NoopRuntimeManager = class {
  disable() {
  }
  waitForDuration(ms) {
    return Promise.resolve();
  }
  waitUntil(date) {
    return Promise.resolve();
  }
  waitForTask(params) {
    return Promise.resolve({
      ok: false,
      id: params.id,
      error: {
        type: "INTERNAL_ERROR",
        code: TaskRunErrorCodes.CONFIGURED_INCORRECTLY
      }
    });
  }
  waitForBatch(params) {
    return Promise.resolve({
      id: params.id,
      items: []
    });
  }
};

// ../../node_modules/@trigger.dev/core/dist/esm/v3/runtime/index.js
var API_NAME11 = "runtime";
var NOOP_RUNTIME_MANAGER = new NoopRuntimeManager();
var RuntimeAPI = class _RuntimeAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _RuntimeAPI();
    }
    return this._instance;
  }
  waitForDuration(ms) {
    return usage.pauseAsync(() => this.#getRuntimeManager().waitForDuration(ms));
  }
  waitUntil(date) {
    return usage.pauseAsync(() => this.#getRuntimeManager().waitUntil(date));
  }
  waitForTask(params) {
    return usage.pauseAsync(() => this.#getRuntimeManager().waitForTask(params));
  }
  waitForBatch(params) {
    return usage.pauseAsync(() => this.#getRuntimeManager().waitForBatch(params));
  }
  setGlobalRuntimeManager(runtimeManager) {
    return registerGlobal(API_NAME11, runtimeManager);
  }
  disable() {
    this.#getRuntimeManager().disable();
    unregisterGlobal(API_NAME11);
  }
  #getRuntimeManager() {
    return getGlobal(API_NAME11) ?? NOOP_RUNTIME_MANAGER;
  }
};

// ../../node_modules/@trigger.dev/core/dist/esm/v3/runtime-api.js
var runtime = RuntimeAPI.getInstance();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/run-metadata-api.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/runMetadata/index.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/runMetadata/noopManager.js
init_esm();
var NoopRunMetadataManager = class {
  append(key, value) {
    throw new Error("Method not implemented.");
  }
  remove(key, value) {
    throw new Error("Method not implemented.");
  }
  increment(key, value) {
    throw new Error("Method not implemented.");
  }
  decrement(key, value) {
    throw new Error("Method not implemented.");
  }
  stream(key, value) {
    throw new Error("Method not implemented.");
  }
  fetchStream(key, signal) {
    throw new Error("Method not implemented.");
  }
  flush(requestOptions) {
    throw new Error("Method not implemented.");
  }
  refresh(requestOptions) {
    throw new Error("Method not implemented.");
  }
  enterWithMetadata(metadata) {
  }
  current() {
    throw new Error("Method not implemented.");
  }
  getKey(key) {
    throw new Error("Method not implemented.");
  }
  set(key, value) {
    throw new Error("Method not implemented.");
  }
  del(key) {
    throw new Error("Method not implemented.");
  }
  update(metadata) {
    throw new Error("Method not implemented.");
  }
  get parent() {
    return {
      append: () => this.parent,
      set: () => this.parent,
      del: () => this.parent,
      increment: () => this.parent,
      decrement: () => this.parent,
      remove: () => this.parent,
      stream: () => Promise.resolve({
        [Symbol.asyncIterator]: () => ({
          next: () => Promise.resolve({ done: true, value: void 0 })
        })
      }),
      update: () => this.parent
    };
  }
  get root() {
    return {
      append: () => this.root,
      set: () => this.root,
      del: () => this.root,
      increment: () => this.root,
      decrement: () => this.root,
      remove: () => this.root,
      stream: () => Promise.resolve({
        [Symbol.asyncIterator]: () => ({
          next: () => Promise.resolve({ done: true, value: void 0 })
        })
      }),
      update: () => this.root
    };
  }
};

// ../../node_modules/@trigger.dev/core/dist/esm/v3/runMetadata/index.js
var API_NAME12 = "run-metadata";
var NOOP_MANAGER = new NoopRunMetadataManager();
var RunMetadataAPI = class _RunMetadataAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _RunMetadataAPI();
    }
    return this._instance;
  }
  setGlobalManager(manager) {
    return registerGlobal(API_NAME12, manager);
  }
  #getManager() {
    return getGlobal(API_NAME12) ?? NOOP_MANAGER;
  }
  enterWithMetadata(metadata) {
    this.#getManager().enterWithMetadata(metadata);
  }
  current() {
    return this.#getManager().current();
  }
  getKey(key) {
    return this.#getManager().getKey(key);
  }
  set(key, value) {
    this.#getManager().set(key, value);
    return this;
  }
  del(key) {
    this.#getManager().del(key);
    return this;
  }
  increment(key, value) {
    this.#getManager().increment(key, value);
    return this;
  }
  decrement(key, value) {
    this.#getManager().decrement(key, value);
    return this;
  }
  append(key, value) {
    this.#getManager().append(key, value);
    return this;
  }
  remove(key, value) {
    this.#getManager().remove(key, value);
    return this;
  }
  update(metadata) {
    this.#getManager().update(metadata);
    return this;
  }
  stream(key, value, signal) {
    return this.#getManager().stream(key, value, signal);
  }
  fetchStream(key, signal) {
    return this.#getManager().fetchStream(key, signal);
  }
  flush(requestOptions) {
    return this.#getManager().flush(requestOptions);
  }
  refresh(requestOptions) {
    return this.#getManager().refresh(requestOptions);
  }
  get parent() {
    return this.#getManager().parent;
  }
  get root() {
    return this.#getManager().root;
  }
};

// ../../node_modules/@trigger.dev/core/dist/esm/v3/runMetadata/types.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/runMetadata/operations.js
init_esm();
var import_path = __toESM(require_lib(), 1);

// ../../node_modules/dequal/dist/index.mjs
init_esm();
var has = Object.prototype.hasOwnProperty;
function find(iter, tar, key) {
  for (key of iter.keys()) {
    if (dequal(key, tar)) return key;
  }
}
function dequal(foo, bar) {
  var ctor, len, tmp;
  if (foo === bar) return true;
  if (foo && bar && (ctor = foo.constructor) === bar.constructor) {
    if (ctor === Date) return foo.getTime() === bar.getTime();
    if (ctor === RegExp) return foo.toString() === bar.toString();
    if (ctor === Array) {
      if ((len = foo.length) === bar.length) {
        while (len-- && dequal(foo[len], bar[len])) ;
      }
      return len === -1;
    }
    if (ctor === Set) {
      if (foo.size !== bar.size) {
        return false;
      }
      for (len of foo) {
        tmp = len;
        if (tmp && typeof tmp === "object") {
          tmp = find(bar, tmp);
          if (!tmp) return false;
        }
        if (!bar.has(tmp)) return false;
      }
      return true;
    }
    if (ctor === Map) {
      if (foo.size !== bar.size) {
        return false;
      }
      for (len of foo) {
        tmp = len[0];
        if (tmp && typeof tmp === "object") {
          tmp = find(bar, tmp);
          if (!tmp) return false;
        }
        if (!dequal(len[1], bar.get(tmp))) {
          return false;
        }
      }
      return true;
    }
    if (ctor === ArrayBuffer) {
      foo = new Uint8Array(foo);
      bar = new Uint8Array(bar);
    } else if (ctor === DataView) {
      if ((len = foo.byteLength) === bar.byteLength) {
        while (len-- && foo.getInt8(len) === bar.getInt8(len)) ;
      }
      return len === -1;
    }
    if (ArrayBuffer.isView(foo)) {
      if ((len = foo.byteLength) === bar.byteLength) {
        while (len-- && foo[len] === bar[len]) ;
      }
      return len === -1;
    }
    if (!ctor || typeof foo === "object") {
      len = 0;
      for (ctor in foo) {
        if (has.call(foo, ctor) && ++len && !has.call(bar, ctor)) return false;
        if (!(ctor in bar) || !dequal(foo[ctor], bar[ctor])) return false;
      }
      return Object.keys(bar).length === len;
    }
  }
  return foo !== foo && bar !== bar;
}

// ../../node_modules/@trigger.dev/core/dist/esm/v3/runMetadata/operations.js
function applyMetadataOperations(currentMetadata, operations) {
  const unappliedOperations = [];
  let newMetadata = structuredClone(currentMetadata);
  for (const operation of Array.isArray(operations) ? operations : [operations]) {
    switch (operation.type) {
      case "set": {
        if (operation.key.startsWith("$.")) {
          const path = new import_path.JSONHeroPath(operation.key);
          path.set(newMetadata, operation.value);
        } else {
          newMetadata[operation.key] = operation.value;
        }
        break;
      }
      case "delete": {
        if (operation.key in newMetadata) {
          delete newMetadata[operation.key];
        }
        break;
      }
      case "append": {
        if (operation.key.startsWith("$.")) {
          const path = new import_path.JSONHeroPath(operation.key);
          const currentValue = path.first(newMetadata);
          if (currentValue === void 0) {
            path.set(newMetadata, [operation.value]);
          } else if (Array.isArray(currentValue)) {
            path.set(newMetadata, [...currentValue, operation.value]);
          } else {
            path.set(newMetadata, [currentValue, operation.value]);
          }
        } else {
          const existingValue = newMetadata[operation.key];
          if (Array.isArray(existingValue)) {
            existingValue.push(operation.value);
          } else if (existingValue === void 0) {
            newMetadata[operation.key] = [operation.value];
          } else {
            newMetadata[operation.key] = [existingValue, operation.value];
          }
        }
        break;
      }
      case "remove": {
        if (operation.key.startsWith("$.")) {
          const path = new import_path.JSONHeroPath(operation.key);
          const currentValue = path.first(newMetadata);
          if (Array.isArray(currentValue)) {
            const newArray = currentValue.filter((item) => !dequal(item, operation.value));
            path.set(newMetadata, newArray);
          } else {
            unappliedOperations.push(operation);
          }
        } else {
          const existingValue = newMetadata[operation.key];
          if (Array.isArray(existingValue)) {
            newMetadata[operation.key] = existingValue.filter((item) => !dequal(item, operation.value));
          } else {
            unappliedOperations.push(operation);
          }
        }
        break;
      }
      case "increment": {
        let currentValue = operation.key.startsWith("$.") ? new import_path.JSONHeroPath(operation.key).first(newMetadata) : newMetadata[operation.key];
        const newValue = (typeof currentValue === "number" ? currentValue : 0) + operation.value;
        if (operation.key.startsWith("$.")) {
          new import_path.JSONHeroPath(operation.key).set(newMetadata, newValue);
        } else {
          newMetadata[operation.key] = newValue;
        }
        break;
      }
      case "update": {
        newMetadata = operation.value;
        break;
      }
      default: {
        unappliedOperations.push(operation);
        break;
      }
    }
  }
  return { newMetadata, unappliedOperations };
}

// ../../node_modules/@trigger.dev/core/dist/esm/v3/run-metadata-api.js
var runMetadata = RunMetadataAPI.getInstance();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/wait-until-api.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/waitUntil/index.js
init_esm();
var API_NAME13 = "wait-until";
var NoopManager = class {
  register(promise) {
  }
  blockUntilSettled(timeout2) {
    return Promise.resolve();
  }
  requiresResolving() {
    return false;
  }
};
var NOOP_MANAGER2 = new NoopManager();
var WaitUntilAPI = class _WaitUntilAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _WaitUntilAPI();
    }
    return this._instance;
  }
  setGlobalManager(manager) {
    return registerGlobal(API_NAME13, manager);
  }
  #getManager() {
    return getGlobal(API_NAME13) ?? NOOP_MANAGER2;
  }
  register(promise) {
    return this.#getManager().register(promise);
  }
  blockUntilSettled(timeout2) {
    return this.#getManager().blockUntilSettled(timeout2);
  }
  requiresResolving() {
    return this.#getManager().requiresResolving();
  }
};

// ../../node_modules/@trigger.dev/core/dist/esm/v3/wait-until-api.js
var waitUntil = WaitUntilAPI.getInstance();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/timeout-api.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/timeout/api.js
init_esm();
var API_NAME14 = "timeout";
var NoopTimeoutManager = class {
  abortAfterTimeout(timeoutInSeconds) {
    return new AbortController().signal;
  }
};
var NOOP_TIMEOUT_MANAGER = new NoopTimeoutManager();
var TimeoutAPI = class _TimeoutAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _TimeoutAPI();
    }
    return this._instance;
  }
  get signal() {
    return this.#getManagerManager().signal;
  }
  abortAfterTimeout(timeoutInSeconds) {
    return this.#getManagerManager().abortAfterTimeout(timeoutInSeconds);
  }
  setGlobalManager(manager) {
    return registerGlobal(API_NAME14, manager);
  }
  disable() {
    unregisterGlobal(API_NAME14);
  }
  #getManagerManager() {
    return getGlobal(API_NAME14) ?? NOOP_TIMEOUT_MANAGER;
  }
};

// ../../node_modules/@trigger.dev/core/dist/esm/v3/timeout-api.js
var timeout = TimeoutAPI.getInstance();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/runTimelineMetrics/runTimelineMetricsManager.js
init_esm();
var StandardRunTimelineMetricsManager = class {
  _metrics = [];
  registerMetric(metric) {
    this._metrics.push(metric);
  }
  getMetrics() {
    return this._metrics;
  }
  registerMetricsFromExecution(metrics2) {
    if (metrics2) {
      metrics2.forEach((metric) => {
        this.registerMetric({
          name: `trigger.dev/${metric.name}`,
          event: metric.event,
          timestamp: metric.timestamp,
          attributes: {
            duration: metric.duration
          }
        });
      });
    }
  }
  seedMetricsFromEnvironment() {
    const forkStartTime = getEnvVar("TRIGGER_PROCESS_FORK_START_TIME");
    if (typeof forkStartTime === "string") {
      const forkStartTimeMs = parseInt(forkStartTime, 10);
      this.registerMetric({
        name: "trigger.dev/start",
        event: "fork",
        attributes: {
          duration: Date.now() - forkStartTimeMs
        },
        timestamp: forkStartTimeMs
      });
    }
  }
};
var NoopRunTimelineMetricsManager = class {
  registerMetric(metric) {
  }
  getMetrics() {
    return [];
  }
};

// ../../node_modules/@trigger.dev/core/dist/esm/v3/run-timeline-metrics-api.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/runTimelineMetrics/index.js
init_esm();
var API_NAME15 = "run-timeline-metrics";
var NOOP_MANAGER3 = new NoopRunTimelineMetricsManager();
var RunTimelineMetricsAPI = class _RunTimelineMetricsAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _RunTimelineMetricsAPI();
    }
    return this._instance;
  }
  registerMetric(metric) {
    this.#getManager().registerMetric(metric);
  }
  getMetrics() {
    return this.#getManager().getMetrics();
  }
  /**
   * Measures the execution time of an async function and registers it as a metric
   * @param metricName The name of the metric
   * @param eventName The event name
   * @param attributesOrCallback Optional attributes or the callback function
   * @param callbackFn The async function to measure (if attributes were provided)
   * @returns The result of the callback function
   */
  async measureMetric(metricName, eventName, attributesOrCallback, callbackFn) {
    let attributes = {};
    let callback;
    if (typeof attributesOrCallback === "function") {
      callback = attributesOrCallback;
    } else {
      attributes = attributesOrCallback || {};
      if (!callbackFn) {
        throw new Error("Callback function is required when attributes are provided");
      }
      callback = callbackFn;
    }
    const startTime = Date.now();
    try {
      const result = await callback();
      const duration = Date.now() - startTime;
      this.registerMetric({
        name: metricName,
        event: eventName,
        attributes: {
          ...attributes,
          duration
        },
        timestamp: startTime
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.registerMetric({
        name: metricName,
        event: eventName,
        attributes: {
          ...attributes,
          duration,
          error: error instanceof Error ? error.message : String(error),
          status: "failed"
        },
        timestamp: startTime
      });
      throw error;
    }
  }
  convertMetricsToSpanEvents() {
    const metrics2 = this.getMetrics();
    const spanEvents = metrics2.map((metric) => {
      return {
        name: metric.name,
        startTime: metric.timestamp,
        attributes: {
          ...metric.attributes,
          event: metric.event
        }
      };
    });
    return spanEvents;
  }
  convertMetricsToSpanAttributes() {
    const metrics2 = this.getMetrics();
    if (metrics2.length === 0) {
      return {};
    }
    const metricsByName = metrics2.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric);
      return acc;
    }, {});
    const reducedMetrics = metrics2.reduce((acc, metric) => {
      acc[metric.event] = {
        name: metric.name,
        timestamp: metric.timestamp,
        event: metric.event,
        ...flattenAttributes(metric.attributes, "attributes")
      };
      return acc;
    }, {});
    const metricEventRollups = {};
    for (const [metricName, metricEvents] of Object.entries(metricsByName)) {
      if (metricEvents.length === 0)
        continue;
      const sortedEvents = [...metricEvents].sort((a, b) => a.timestamp - b.timestamp);
      const firstTimestamp = sortedEvents[0].timestamp;
      const lastEvent = sortedEvents[sortedEvents.length - 1];
      const lastEventDuration = lastEvent.attributes?.duration ?? 0;
      const lastEventEndTime = lastEvent.timestamp + lastEventDuration;
      const duration = lastEventEndTime - firstTimestamp;
      const timestamp = firstTimestamp;
      metricEventRollups[metricName] = {
        name: metricName,
        duration,
        timestamp
      };
    }
    return {
      ...flattenAttributes(reducedMetrics, SemanticInternalAttributes.METRIC_EVENTS),
      ...flattenAttributes(metricEventRollups, SemanticInternalAttributes.METRIC_EVENTS)
    };
  }
  setGlobalManager(manager) {
    return registerGlobal(API_NAME15, manager);
  }
  #getManager() {
    return getGlobal(API_NAME15) ?? NOOP_MANAGER3;
  }
};

// ../../node_modules/@trigger.dev/core/dist/esm/v3/run-timeline-metrics-api.js
var runTimelineMetrics = RunTimelineMetricsAPI.getInstance();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/task-catalog-api.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/task-catalog/index.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/task-catalog/noopTaskCatalog.js
init_esm();
var NoopTaskCatalog = class {
  registerTaskMetadata(task) {
  }
  registerTaskFileMetadata(id, metadata) {
  }
  updateTaskMetadata(id, updates) {
  }
  listTaskManifests() {
    return [];
  }
  getTaskManifest(id) {
    return void 0;
  }
  getTask(id) {
    return void 0;
  }
  taskExists(id) {
    return false;
  }
  disable() {
  }
};

// ../../node_modules/@trigger.dev/core/dist/esm/v3/task-catalog/index.js
var API_NAME16 = "task-catalog";
var NOOP_TASK_CATALOG = new NoopTaskCatalog();
var TaskCatalogAPI = class _TaskCatalogAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _TaskCatalogAPI();
    }
    return this._instance;
  }
  setGlobalTaskCatalog(taskCatalog2) {
    return registerGlobal(API_NAME16, taskCatalog2);
  }
  disable() {
    unregisterGlobal(API_NAME16);
  }
  registerTaskMetadata(task) {
    this.#getCatalog().registerTaskMetadata(task);
  }
  updateTaskMetadata(id, updates) {
    this.#getCatalog().updateTaskMetadata(id, updates);
  }
  registerTaskFileMetadata(id, metadata) {
    this.#getCatalog().registerTaskFileMetadata(id, metadata);
  }
  listTaskManifests() {
    return this.#getCatalog().listTaskManifests();
  }
  getTaskManifest(id) {
    return this.#getCatalog().getTaskManifest(id);
  }
  getTask(id) {
    return this.#getCatalog().getTask(id);
  }
  taskExists(id) {
    return this.#getCatalog().taskExists(id);
  }
  #getCatalog() {
    return getGlobal(API_NAME16) ?? NOOP_TASK_CATALOG;
  }
};

// ../../node_modules/@trigger.dev/core/dist/esm/v3/task-catalog-api.js
var taskCatalog = TaskCatalogAPI.getInstance();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/index.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/apiClient/types.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/types/index.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/types/utils.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/types/tasks.js
init_esm();
var SubtaskUnwrapError = class extends Error {
  taskId;
  runId;
  cause;
  constructor(taskId, runId, subtaskError) {
    if (subtaskError instanceof Error) {
      super(`Error in ${taskId}: ${subtaskError.message}`);
      this.cause = subtaskError;
      this.name = "SubtaskUnwrapError";
    } else {
      super(`Error in ${taskId}`);
      this.name = "SubtaskUnwrapError";
      this.cause = subtaskError;
    }
    this.taskId = taskId;
    this.runId = runId;
  }
};
var TaskRunPromise = class extends Promise {
  taskId;
  constructor(executor, taskId) {
    super(executor);
    this.taskId = taskId;
  }
  unwrap() {
    return this.then((result) => {
      if (result.ok) {
        return result.output;
      } else {
        throw new SubtaskUnwrapError(this.taskId, result.id, result.error);
      }
    });
  }
};

// ../../node_modules/@trigger.dev/core/dist/esm/v3/types/idempotencyKeys.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/types/tools.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/idempotencyKeys.js
init_esm();
function isIdempotencyKey(value) {
  return typeof value === "string" && value.length === 64;
}
async function makeIdempotencyKey(idempotencyKey) {
  if (!idempotencyKey) {
    return;
  }
  if (isIdempotencyKey(idempotencyKey)) {
    return idempotencyKey;
  }
  return await createIdempotencyKey(idempotencyKey, { scope: "global" });
}
async function createIdempotencyKey(key, options) {
  const idempotencyKey = await generateIdempotencyKey([...Array.isArray(key) ? key : [key]].concat(injectScope(options?.scope ?? "run")));
  return idempotencyKey;
}
function injectScope(scope) {
  switch (scope) {
    case "run": {
      if (taskContext?.ctx) {
        return [taskContext.ctx.run.id];
      }
      break;
    }
    case "attempt": {
      if (taskContext?.ctx) {
        return [taskContext.ctx.attempt.id];
      }
      break;
    }
  }
  return [];
}
async function generateIdempotencyKey(keyMaterial) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(keyMaterial.join("-")));
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// ../../node_modules/@trigger.dev/core/dist/esm/v3/utils/durations.js
init_esm();
var import_humanize_duration = __toESM(require_humanize_duration(), 1);

// ../../node_modules/@trigger.dev/core/dist/esm/eventFilterMatches.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/utils/omit.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/config.js
init_esm();

// ../../node_modules/@trigger.dev/core/dist/esm/v3/types/schemas.js
init_esm();
function getSchemaParseFn(procedureParser) {
  const parser = procedureParser;
  if (typeof parser === "function" && typeof parser.assert === "function") {
    return parser.assert.bind(parser);
  }
  if (typeof parser === "function") {
    return parser;
  }
  if (typeof parser.parseAsync === "function") {
    return parser.parseAsync.bind(parser);
  }
  if (typeof parser.parse === "function") {
    return parser.parse.bind(parser);
  }
  if (typeof parser.validateSync === "function") {
    return parser.validateSync.bind(parser);
  }
  if (typeof parser.create === "function") {
    return parser.create.bind(parser);
  }
  if (typeof parser.assert === "function") {
    return (value) => {
      parser.assert(value);
      return value;
    };
  }
  throw new Error("Could not find a validator fn");
}

// ../../node_modules/@trigger.dev/core/dist/esm/v3/otel/utils.js
init_esm();
init_esm2();
function recordSpanException(span, error) {
  if (error instanceof Error) {
    span.recordException(sanitizeSpanError(error));
  } else if (typeof error === "string") {
    span.recordException(error.replace(/\0/g, ""));
  } else {
    span.recordException(JSON.stringify(error).replace(/\0/g, ""));
  }
  span.setStatus({ code: SpanStatusCode.ERROR });
}
function sanitizeSpanError(error) {
  const sanitizedError = new Error(error.message.replace(/\0/g, ""));
  sanitizedError.name = error.name.replace(/\0/g, "");
  sanitizedError.stack = error.stack?.replace(/\0/g, "");
  return sanitizedError;
}

export {
  z,
  VERSION,
  TaskRunErrorCodes,
  TaskRunContext,
  BuildManifest,
  WorkerManifest,
  indexerToWorkerMessages,
  ExecutorToWorkerMessageCatalog,
  WorkerToExecutorMessageCatalog,
  SemanticInternalAttributes,
  taskContext,
  defaultRetryOptions,
  calculateNextRetryDelay,
  DiagLogLevel,
  DiagConsoleLogger,
  SpanKind,
  SpanStatusCode,
  context,
  diag2 as diag,
  propagation,
  trace,
  esm_exports,
  init_esm2 as init_esm,
  flattenAttributes,
  accessoryAttributes,
  InternalError,
  isInternalError,
  TaskPayloadParsedError,
  parseError,
  createErrorTaskError,
  sanitizeError,
  getEnvVar,
  getNumberEnvVar,
  OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT,
  OTEL_LOG_ATTRIBUTE_COUNT_LIMIT,
  OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT,
  OTEL_LOG_ATTRIBUTE_VALUE_LENGTH_LIMIT,
  OTEL_SPAN_EVENT_COUNT_LIMIT,
  OTEL_LINK_COUNT_LIMIT,
  OTEL_ATTRIBUTE_PER_LINK_COUNT_LIMIT,
  OTEL_ATTRIBUTE_PER_EVENT_COUNT_LIMIT,
  apiClientManager,
  parsePacket,
  stringifyIO,
  conditionallyExportPacket,
  conditionallyImportPacket,
  createPacketAttributes,
  mergeRequestOptions,
  require_src,
  clock,
  require_src2,
  iconStringForSeverity,
  logLevels,
  OtelTaskLogger,
  logger,
  usage,
  runtime,
  applyMetadataOperations,
  runMetadata,
  waitUntil,
  timeout,
  StandardRunTimelineMetricsManager,
  runTimelineMetrics,
  taskCatalog,
  TaskRunPromise,
  makeIdempotencyKey,
  getSchemaParseFn,
  require_src3,
  recordSpanException
};
/*! Bundled license information:

@google-cloud/precise-date/build/src/index.js:
  (*!
   * Copyright 2019 Google Inc. All Rights Reserved.
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
*/
//# sourceMappingURL=chunk-O2FJUH2A.mjs.map
