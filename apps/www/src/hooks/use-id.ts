let id = 0;
function generateId() {
  return ++id;
}

export function _useId(prefix: any = null, suffix: any = null) {
  return [prefix, generateId(), suffix].filter(Boolean).join("-");
}
