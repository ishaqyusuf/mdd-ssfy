"use client";

import {
  parseAsBoolean,
  parseAsInteger,
  parseAsJson,
  useQueryStates,
} from "nuqs";
import { z } from "zod";
import { useOnCloseQuery } from "./use-on-close-query";

const customerFormPayloadSchema = z
  .object({
    customerId: z.number().optional(),
  })
  .nullable();

export function useCustomerFormParams() {
  const onClose = useOnCloseQuery();
  const [params, setParams] = useQueryStates({
    customerForm: parseAsBoolean,
    customerId: parseAsInteger,
    returnPayload: parseAsBoolean,
    payload: parseAsJson(customerFormPayloadSchema.parse),
    onCloseQuery: parseAsJson(z.any().parse),
  });

  const opened = Boolean(params.customerForm);

  return {
    params,
    setParams,
    opened,
    title: params.customerId ? "Edit Customer" : "Create Customer",
    openCreate(
      onCloseQuery?: unknown,
      options?: {
        returnPayload?: boolean;
      },
    ) {
      setParams({
        customerForm: true,
        customerId: null,
        returnPayload: options?.returnPayload || null,
        payload: null,
        onCloseQuery: onCloseQuery || null,
      });
    },
    openEdit(customerId: number, onCloseQuery?: unknown) {
      setParams({
        customerForm: true,
        customerId,
        returnPayload: null,
        payload: null,
        onCloseQuery: onCloseQuery || null,
      });
    },
    close() {
      onClose.handle(params, setParams);
    },
  };
}
