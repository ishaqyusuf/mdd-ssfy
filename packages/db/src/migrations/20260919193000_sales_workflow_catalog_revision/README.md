# Sales workflow catalog revision and web verification value

Prisma 6.19.2 generated `migration.sql` with `migrate diff
--from-schema-datamodel=/private/tmp/sfc-migration-from
--to-schema-datamodel=/private/tmp/sfc-migration-to --script`.
The two schema folders contain the branch merge-base (`5ae5478855a2a4f5d89facc58ce72977331e5829`)
and PR HEAD versions of every Prisma schema file, respectively. The SQL
contains only the new `SalesWorkflowCatalogRevision` table and the
`WebAuthVerification.value` change from `VARCHAR(191)` to `TEXT`. It has no
catalog row updates or other table changes. Only the terminal blank lines from
Prisma's SQL output were normalized to one newline; regeneration with that
normalization matches the artifact byte-for-byte.

The normal local `db:migrate` command previously stopped on unrelated
migration-history drift and requested a destructive reset, which was declined.
The exact schema changes have already been applied through separately scoped
and reviewed `db:push` operations to local, preview, and production; read-only
post-push diffs were empty. A read-only check found no `_prisma_migrations`
table in any of those three databases. This SQL artifact is not an instruction
to run `migrate deploy` there: that would require a separately reviewed
baseline of the entire existing migration history. Continue using the scoped
schema rollout procedure and do not run the CREATE TABLE again where it exists.
