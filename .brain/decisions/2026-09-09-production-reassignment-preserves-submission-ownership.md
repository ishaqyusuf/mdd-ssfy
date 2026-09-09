# Preserve submission ownership when reassigning production

Date: 2026-09-09
Status: Accepted

Changing the owner of a partially submitted assignment would also change the
assignment identity used by material reviews and payroll. Reassignment therefore
splits only the unsubmitted remainder into a new assignment. The original retains
its worker and reports; due date, item identity and labor rate are copied to the
new assignment. Assignment locks serialize against the submission writer.

Pending reports count as submitted even before material approval. Reassignment
is not a receipt approval, payroll recalculation or historical evidence repair.
