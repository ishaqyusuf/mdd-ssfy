# GitHub reliability registration

Implementation is incomplete and publication is not activated.

`RELIABILITY_GITHUB_REGISTRATIONS` is a JSON array of strict entries:

- `serviceId`: exact incident service identity; unique in the registry.
- `repository`: GitHub owner/name.
- `repositoryId`: immutable numeric repository ID, verified during token exchange.
- `installationId`: numeric GitHub App installation ID.
- `clientId`: GitHub App client ID used for JWT signing.
- `actorId`: numeric automation account ID used to validate recovery receipts.
- `privateKeyEnv`: separate environment reference matching
  `RELIABILITY_GITHUB_APP_KEY_*`; never embed a key in the JSON or Brain.

Use an App with Issues write and Metadata read. Token exchange explicitly requests
only the selected repository and Issues write for publication or Issues read for
recovery, and rejects broader returned grants.
JWTs and installation tokens are transient credentials and must not be logged or
stored in incident evidence. Signing, exchange, and registration have local fixture
tests and are connected by `getGithubReliabilityCredentials`, which acquires a fresh
token per operation and returns only repository/actor/token/expiry. Callers must not
log or persist this credential object. Configured execution and hosted verification
are pending.

Setting this registry alone does not schedule or authorize publication. Production
activation still requires the research's shadow-quality and destination gates.

Recovery uses a separate `RELIABILITY_GITHUB_RECOVERY_ENABLED=true` flag and
PRODUCTION environment. It checks service-owned uncertain delivery eligibility
before obtaining credentials. Publication enablement does not enable recovery.
Recovery performs provider reads and local receipt updates, never ticket/comment
creation. `reliability-github-recovery` runs every five minutes after deployment,
selecting at most five due deliveries across registered services. Processing is
serial and stops starting work after 120 seconds; task duration is capped at 180
seconds. Persisted cooldowns prevent repeatedly selecting the same unresolved work.
The schedule is implemented but has not been deployed or activated.

`publishConfiguredGithubIncident` now requires `environment: PRODUCTION` and
`RELIABILITY_GITHUB_PUBLICATION_ENABLED=true`; it accepts a reviewed revision-bound
draft, acquires fresh credentials, and delegates to scoped delivery. It does not
select drafts or schedule itself. Keep the flag unset until activation is approved.
