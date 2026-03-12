function toBooleanFlag(value: string | undefined, defaultValue: boolean) {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

function resolveControlOverviewReadV2Flag(
  value: string | undefined,
  controlReadV2Enabled: boolean,
) {
  return toBooleanFlag(value, controlReadV2Enabled);
}

export function isControlWriteV2Enabled() {
  return toBooleanFlag(process.env.CONTROL_WRITE_V2, true);
}

export function isControlReadV2Enabled() {
  return toBooleanFlag(process.env.CONTROL_READ_V2, true);
}

export function isControlOverviewReadV2Enabled() {
  return resolveControlOverviewReadV2Flag(
    process.env.CONTROL_OVERVIEW_READ_V2,
    isControlReadV2Enabled(),
  );
}

export function isControlFilterV2Enabled() {
  return toBooleanFlag(process.env.CONTROL_FILTER_V2, true);
}

export const __controlFlagTestUtils = {
  toBooleanFlag,
  resolveControlOverviewReadV2Flag,
};
