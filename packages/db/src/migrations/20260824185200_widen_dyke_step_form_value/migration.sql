-- DykeStepForm.value stores a workflow component's human-readable title.
-- Titles are not identifiers and can legitimately exceed MySQL's default
-- VARCHAR(191) width, so preserve the submitted value without truncation.
ALTER TABLE `DykeStepForm`
    MODIFY `value` TEXT NULL;
