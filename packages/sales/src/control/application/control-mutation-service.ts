import type { Db } from "../../types";

export type ControlMutationMeta = {
  salesId: number;
  authorId: number;
  authorName: string;
};

export class ControlMutationService {
  constructor(private readonly db: Db) {}

  async applySubmissionBatch(_meta: ControlMutationMeta) {
    // Step 2 skeleton: command contract only.
    return { ok: true };
  }

  async applyPack(_meta: ControlMutationMeta) {
    return { ok: true };
  }

  async applyUnpackBulk(_meta: ControlMutationMeta) {
    return { ok: true };
  }

  async applyDispatchStatusTransition(_meta: ControlMutationMeta) {
    return { ok: true };
  }

  async applyAssignmentDelta(_meta: ControlMutationMeta) {
    return { ok: true };
  }

  async applySubmissionDelta(_meta: ControlMutationMeta) {
    return { ok: true };
  }
}

