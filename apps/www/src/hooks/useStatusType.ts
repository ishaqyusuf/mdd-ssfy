export function useStatusType(status: string) {
  //
  const _m: { [key in string]: string[] } = {
    green: [],
    orange: ["pending"],
    red: ["late"],
  };

  let _status = "default";
  Object.entries(_m).map(([k, v]) => {
    if (v.includes(status?.toLowerCase())) _status = k;
  });
  return _status;
}
