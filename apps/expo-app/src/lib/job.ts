export function getJobType(role) {
  return role === "1099 Contractor" ? "installation" : "punchout";
}
