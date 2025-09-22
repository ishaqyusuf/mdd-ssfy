import dayjs from "@gnd/utils/dayjs";

export function anyDateQuery() {
  return {
    lte: fixDbTime(dayjs()).toISOString(),
  };
}
export function fixDbTime(date: dayjs.Dayjs, h = 0, m = 0, s = 0) {
  return date.set("hours", h).set("minutes", m).set("seconds", s);
}
export function dateEquals(date) {
  return {
    gte: dayjs(date).startOf("day").toDate(),
    lte: dayjs(date).endOf("day").toDate(),
  };
  // return {
  //     gte: fixDbTime(dayjs(date)).toISOString(),
  //     lte: fixDbTime(dayjs(date), 23, 59, 59).toISOString(),
  // };
}
export function txContext(ctx, tx) {
  return {
    ...ctx,
    db: tx,
  };
}
