# ADR-031: Reuse the Active Shared Portless Proxy

- Status: accepted
- Date: 2026-07-28

## Context

Multiple local projects share one Portless proxy. GND dev scripts pinned
`PORTLESS_PORT` through `GND_PROXY_PORT`, even though proxy lifecycle, the proxy
port, and TLS mode are machine-wide concerns. When another project had already
started the shared proxy on port `1355`, GND routes inherited that active proxy
and displayed the nonstandard port despite GND's per-app `443` override.

School Clerk resolved the same ownership conflict by removing proxy-port and TLS
configuration from workspace dev scripts while retaining stable app names,
fixed internal app ports, and wildcard routing.

## Decision

- GND workspace dev scripts do not set `PORTLESS_PORT` or `PORTLESS_HTTPS`.
- Apps retain their stable `PORTLESS_APP_PORT` values and Portless route names.
- The shared dev launcher removes matching static aliases for selected
  Portless-backed workspaces before starting local services. Filtered runs
  inspect only Turbo-selected workspaces; unfiltered runs inspect all
  workspaces. A missing alias is a normal no-op, while live process conflicts
  continue through the interactive force-override path.
- Developers and agents reuse the active shared HTTPS wildcard proxy and use
  the URLs Portless reports.
- The machine-wide Portless service normally owns standard HTTPS port `443`.
- Changing the shared proxy configuration requires explicit approval because it
  can interrupt routes belonging to other projects.

## Consequences

- Starting GND no longer attempts to override global Portless configuration.
- GND can coexist with School Clerk and other local projects on one proxy.
- Standard port `443` produces clean HTTPS `.localhost` URLs without a visible
  port.
- If the shared proxy is intentionally configured on a nonstandard port, the
  displayed URL includes that port and GND must preserve it.
- Focused configuration coverage rejects future GND app scripts that reintroduce
  project-owned proxy port or TLS settings.
