"use server";

import { prisma, Prisma } from "@/db";
import { nextId } from "@/lib/nextId";
import { transformData } from "@/lib/utils";
import { BaseQuery } from "@/types/action";
import { IInboundOrder } from "@/types/sales-inbound";
import dayjs from "dayjs";

import { getPageInfo, queryFilter } from "../action-utils";

export interface InboundOrderQueryParamsProps extends BaseQuery {}
