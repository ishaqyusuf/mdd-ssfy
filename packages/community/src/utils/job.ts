import { generateRandomString } from "@gnd/utils";
import { formatDate } from "@gnd/utils/dayjs";

export function generateControlId() {
  const controlId = `${generateRandomString(10)?.toLowerCase()}-${formatDate(
    new Date(),
    "yymmdd"
  )}`;
  return controlId;
}
