# Coding Standards

## Purpose
Repository-level implementation rules that recur across active workstreams.

## Standards
- Prefer shared package/domain logic over app-local duplication.
- Follow the implementation order `Schema -> API -> UI -> Validation -> Polish` for cross-layer features and fixes.
- Keep correctness-critical business behavior inside explicit package boundaries rather than route-local helpers.
- Add focused regression coverage for fixes touching pricing, persistence, payments, dispatch, or other high-risk business flows.
- Preserve existing production behavior when building replacement systems in parallel; cutovers should be explicit, reversible, and documented.
