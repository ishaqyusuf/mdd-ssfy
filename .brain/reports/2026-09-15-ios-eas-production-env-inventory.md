# GND Millwork EAS production environment inventory

Date: 2026-09-15
Scope: authenticated, read-only EAS CLI checks for the existing `pcruz321`
owner and `8ea2eecb-4109-453c-827f-9b2de2e3a9aa` project. No environment
variable value, endpoint, DSN, credential, or file content was printed or
saved. No EAS project link, account setting, or Apple state was changed.

## Name-presence evidence

`eas whoami` confirmed the authorized owner. `eas env:list production` was
queried separately with `--scope project` and `--scope account`, without
`--include-sensitive` or `--include-file-content`. The output was captured
and reduced to the following name-presence results:

| Name | Project production | Account production |
| --- | --- | --- |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | Absent | Absent |
| `EXPO_PUBLIC_LOGLY_ENABLED` | Present | Absent |
| `EXPO_PUBLIC_LOGLY_ENDPOINT` | Present | Absent |
| `EXPO_PUBLIC_SENTRY_ENABLED` | Present | Absent |
| `EXPO_PUBLIC_SENTRY_DSN` | Present | Absent |
| `EXPO_PUBLIC_SENTRY_DEBUG` | Present | Absent |
| `EXPO_PUBLIC_SENTRY_SMOKE_TEST` | Absent | Absent |

Presence is **not** an enabled/disabled or valid-HTTPS determination. A
read-only, value-suppressed `env:get` probe for the three telemetry switches
did not yield a reliably parseable boolean; their effective values remain
unverified. The repo's `eas.json` supplies `APP_VARIANT=production` and the
iOS-only release guard through profile `env`/`ios.env`, independent of these
server variable rows.

## Release consequence

The approved policy URL must be added to the EAS **project production**
environment before a new public iOS candidate is built. Setting a variable,
including this public URL, is an external account mutation and requires
action-time owner confirmation. Then run the production preflight and inspect
the actual EAS build/configuration to verify embedded policy and telemetry
state; this read-only name inventory does not substitute for that check or
for the legal/vendor App Privacy questionnaire.

Do not use `eas env:pull`, `--include-sensitive`, or file-content flags merely
to answer this inventory: those paths can materialize or display credentials.

Source for command behavior: [Expo EAS CLI reference](https://docs.expo.dev/eas/cli/).
