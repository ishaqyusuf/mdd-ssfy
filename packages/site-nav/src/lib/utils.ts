// Re-export from focused modules for backward compatibility
export type { Access, LinkItem, NavModule, NavSection, NavLink } from "./types";
export {
  createNavModule,
  createNavSection,
  createNavSubLink,
  createNavLink,
} from "./types";
export {
  navHasAccess,
  initRoleAccess,
  initPermAccess,
  validateRules,
} from "./access";
export {
  validateLinks,
  getLinkModules,
  getActiveLinkFromMap,
  isPathInLink,
  normalizeNavPath,
} from "./links";
