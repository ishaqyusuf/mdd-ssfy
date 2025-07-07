import { PERMISSIONS } from "@/data/contants/permissions";

export type Permission = (typeof PERMISSIONS)[number];

export type ICan = { [permission in Permission]: boolean };
