"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelSupportsField = modelSupportsField;
exports.applyDefaultSoftDeleteFilter = applyDefaultSoftDeleteFilter;
function getModelDelegate(client, model) {
    if (!client || typeof client !== "object" || !model) {
        return null;
    }
    const clientKey = `${model.charAt(0).toLowerCase()}${model.slice(1)}`;
    const delegate = client[clientKey];
    if (!delegate || typeof delegate !== "object") {
        return null;
    }
    return delegate;
}
function modelSupportsField(client, model, field) {
    const fields = getModelDelegate(client, model)?.fields;
    return Boolean(fields && Object.keys(fields).includes(field));
}
function applyDefaultSoftDeleteFilter(client, model, args) {
    if (!modelSupportsField(client, model, "deletedAt")) {
        return args;
    }
    const where = args.where ?? {};
    if (!Object.hasOwn(where, "deletedAt")) {
        args.where = { deletedAt: null, ...where };
    }
    return args;
}
