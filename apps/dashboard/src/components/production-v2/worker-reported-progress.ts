type Assignment = {
 assignedQty: number;
 submissions: Array<{qty: number; reviewStatus?: string | null}>;
};
const positive = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;

/** Presentation only: reported work must not change approval or submission eligibility. */
export function getWorkerReportedProgress(assignments: Assignment[]) {
 const progress = assignments.map(assignment => {
  const assigned = positive(assignment.assignedQty);
  const submitted = assignment.submissions.reduce((total, submission) =>
   ["REJECTED", "CANCELLED"].includes(submission.reviewStatus?.toUpperCase() ?? "")
    ? total : total + positive(submission.qty), 0);
  return {assigned, submitted: Math.min(assigned, submitted)};
 });
 const assignedQty = progress.reduce((total,row) => total + row.assigned,0);
 const reportedQty = progress.reduce((total,row) => total + row.submitted,0);
 return {
  assignedQty,
  reportedQty,
  isCompleted: assignedQty > 0 && reportedQty >= assignedQty,
  label: assignedQty > 0 ? `${reportedQty}/${assignedQty} submitted` : "No assigned qty",
 };
}
