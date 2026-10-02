# Mobile release assurance

Mobile changes are covered by the repository-level release assurance gate.
The planner compares changed paths, native fingerprints, runtime versions, and
Expo provider state to decide between an OTA update and a native rebuild.

Use the root commands to inspect Preview obligations locally:

```bash
bun run release:plan --env preview
bun run release:status --env preview
```

Documentation and JavaScript-only changes can use an OTA update when the native
fingerprint and runtime remain compatible. Native-candidate changes require
Android and iOS builds. The protected hosted check—not local status—is the final
source of release readiness.
