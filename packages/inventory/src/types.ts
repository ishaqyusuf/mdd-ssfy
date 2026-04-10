import type { Prisma } from "@gnd/db";

export type StepMeta = {
  custom: boolean;
  priceStepDeps: string[];
  doorSizeVariation?: {
    rules: {
      stepUid: string;
      operator: "is" | "isNot";
      componentsUid: string[];
    }[];
    widthList?: string[];
  }[];
};

export interface StepComponentMeta {
  stepSequence?: { id?: number }[];
  deleted?: { [uid in string]: boolean };
  show?: { [uid in string]: boolean };
  variations?: {
    rules: {
      stepUid: string;
      operator: "is" | "isNot";
      componentsUid: string[];
    }[];
  }[];
  sortIndex?: number;
  sectionOverride?: {
    hasSwing?: boolean;
    noHandle?: boolean;
    overrideMode?: boolean;
  };
}

export type { Prisma };
