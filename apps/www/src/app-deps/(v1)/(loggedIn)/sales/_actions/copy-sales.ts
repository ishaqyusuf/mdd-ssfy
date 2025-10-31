"use server";

import { ISalesOrder } from "@/types/sales";
import { copyOrderAction } from "./sales";

export const _copyOrderAction = copyOrderAction;
