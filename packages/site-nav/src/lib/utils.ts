import { sum } from "@gnd/utils";
import { IconKeys } from "@gnd/ui/icons";
export type NavModule = ReturnType<typeof createNavModule>;
export type NavSection = ReturnType<typeof createNavSection>;
export type NavLink = ReturnType<typeof createNavLink>["data"] | undefined;
export const createNavModule = (
  name: string,
  icon: IconKeys,
  // title?,
  subtitle?,
  sections: NavSection[] = [],
) => ({
  name,
  icon,
  title: name,
  subtitle,
  sections,
  index: -1,
  activeLinkCount: 0,
  activeSubLinkCount: 0,
  defaultLink: null,
});
export const createNavSection = (
  name: string,
  title?: string,
  links?: NavLink[],
  access: Access[] = [],
) => ({
  name,
  title,
  links: links.filter(Boolean).map((a) => a),
  access,
  index: -1,
  globalIndex: -1,
  linksCount: 0,
});
export const createNavSubLink = (name, href, access?: Access[]) =>
  createNavLink(name, null, href, null, access);

export const createNavLink = (
  name, //: linkNames,
  // title?: string,
  icon?: IconKeys,
  href?,
  subLinks: LinkItem[] = [],
  access: Access[] = [],
) => {
  const res = {
    name,
    title: name?.split("-").join(" "),
    icon,
    href,
    subLinks,
    access,
    index: -1,
    globalIndex: -1,
    show: false,
    paths: [],
    level: null,
  };
  const ctx = {
    data: res,
    level(level) {
      res.level = level;
      return ctx;
    },
    access(...access: Access[]) {
      res.access = access;
      return ctx;
    },
    childPaths(...paths) {
      res.paths = paths?.map((p) => (p?.startsWith("/") ? p : `/${p}`));
      return ctx;
    },
  };
  return ctx;
};
export type Access = {
  type: "role" | "permission"; // | "userId";
  equator: "is" | "isNot" | "in" | "notIn" | "every" | "some";
  values: string[];
};
export type LinkItem = {
  name;
  title;
  href?;
  paths?: string[];
  level?;
  show?: boolean;
  globalIndex?;
  index?;
  access?;
  // links?: {
  //     name;
  //     link: string;
  //     title;
  // }[];
};
export const navHasAccess = (
  type: Access["type"],
  equator: Access["equator"],
  ...values
) => ({ type, equator, values }) as Access;
export const initRoleAccess = <Role>(a: Role) => ({
  is: (role: Role) => navHasAccess("role", "is", role),
  isNot: (role: Role) => navHasAccess("role", "isNot", role),
  in: (...roles: Role[]) => navHasAccess("role", "in", ...roles),
  notIn: (...roles: Role[]) => navHasAccess("role", "notIn", ...roles),
  every: (...roles: Role[]) => navHasAccess("role", "every", ...roles),
  some: (...roles: Role[]) => navHasAccess("role", "some", ...roles),
});
export const initPermAccess = <PermissionScope>(a: PermissionScope) => ({
  is: (role: PermissionScope) => navHasAccess("permission", "is", role),
  isNot: (role: PermissionScope) => navHasAccess("permission", "isNot", role),
  in: (...roles: PermissionScope[]) =>
    navHasAccess("permission", "in", ...roles),
  notIn: (...roles: PermissionScope[]) =>
    navHasAccess("permission", "notIn", ...roles),
  every: (...roles: PermissionScope[]) =>
    navHasAccess("permission", "every", ...roles),
  some: (...roles: PermissionScope[]) =>
    navHasAccess("permission", "some", ...roles),
});
export const validateLinks = ({
  linkModules,
  role,
  can,
  userId,
}: {
  role?;
  can?;
  linkModules;
  userId?;
}) => {
  const validateAccess = (al) => validateRules(al, can, userId, role);
  return linkModules.map((lm) => {
    lm.sections = lm.sections.map((s) => {
      s.links = s.links.map((lnk) => {
        const valid = validateAccess(lnk.access);
        // lnk.show = valid;
        // if(!valid)return
        if (lnk.subLinks?.length)
          lnk.subLinks = lnk.subLinks.map((sl) => {
            sl.show = validateAccess(sl.access);
            return sl;
          });
        lnk.show =
          lnk.subLinks?.length && !lnk.href && !lnk?.access?.length
            ? lnk.subLinks.filter((a) => !a.meta)?.some((a) => a.show)
            : valid && !!lnk.access?.length;

        return lnk;
      });

      return s;
    });
    return lm;
  });
};
export function validateRules(accessList: Access[], can?, userId?, _role?) {
  if (!can) can = {};
  const role = (typeof _role === "string" ? _role : _role?.name)?.toLowerCase();
  Object.entries(can).map(([k, v]) => (can[k?.toLocaleLowerCase()] = v));
  const isValid = accessList.every((a) => {
    // a.values = a.values.map((v) => v?.toLocaleLowerCase());
    // role = role?.toLocaleLowerCase();
    switch (a.type) {
      // case "userId":
      //     return Number(a.values[0]) == userId;
      //     break;
      case "permission":
        switch (a.equator) {
          case "every":
          case "is":
            return a.values?.every((p) => can?.[p]);
          case "in":
          case "some":
            return a.values?.some((p) => can?.[p]);
          case "isNot":
          case "notIn":
            return a.values.every((p) => !can?.[p]);
        }
        break;
      case "role":
        switch (a.equator) {
          case "every":
          case "is":
            return a.values?.every((p) => role === p?.toLowerCase());
          case "in":
          case "some":
            return a.values?.some((p) => role === p?.toLowerCase());
          case "isNot":
          case "notIn":
            return a.values.every((p) => role !== p?.toLowerCase());
        }
        break;
    }

    return true;
  });
  // console.log(role, isValid, accessList);
  return isValid;
}

export function getLinkModules(linkModules: NavModule[]) {
  let i = {
    section: 0,
    links: 0,
    subLinks: 0,
  };
  const moduleMap: {} = {};
  const linksNameMap: {
    [href in string]: {
      name?: string;
      module?: string;
      match?: "part";
      hasAccess?: boolean;
    };
  } = {};
  let __defaultLink = null;
  let __rankedLinks: { rank: number; href: string }[] = [];
  const modules = linkModules.map((m, mi) => {
    let rankedLinks: { rank: number; href: string }[] = [];
    let defaultLink = null;
    m.index = mi;
    let moduleLinks = 0;
    m.sections = m.sections.map((s, si) => {
      let sectionLinks = 0;
      s.index = si;
      s.globalIndex = i.section++;
      // i.section += 1;
      s.links = s.links.map((l, li) => {
        if (l.show) {
          if (l.href) {
            linksNameMap[l.href] = {
              name: l.name,
              module: m.name,
              hasAccess: l.show,
            };
            if (!defaultLink) defaultLink = l.href;
            if (l.level)
              rankedLinks.push({
                rank: l.level,
                href: l.href,
              });
          }
          l.index = li;
          l.globalIndex = i.links++;
          sectionLinks++;
          moduleLinks++;
        }
        if (l.href) {
          linksNameMap[l.href] = {
            name: l.name,
            module: m.name,
            hasAccess: l.show,
          };
        }
        l?.paths?.map((p) => {
          linksNameMap[p] = {
            name: l.name,
            module: m.name,
            match: "part",
            hasAccess: l.show,
          };
        });

        if (l?.subLinks?.length)
          l.subLinks = l.subLinks.map((sl, sli) => {
            if (sl.href && sl.show) {
              if (!defaultLink) defaultLink = sl.href;
              if (sl.level)
                rankedLinks.push({
                  rank: sl.level,
                  href: sl.href,
                });
            }
            linksNameMap[sl.href] = {
              name: l.name,
              module: m.name,
              hasAccess: sl.show,
            };
            return sl;
          });
        return l;
      });
      s.linksCount = sectionLinks;
      return s;
    });
    m.activeLinkCount = moduleLinks;
    __rankedLinks.push(...rankedLinks);
    m.defaultLink = defaultLink;
    if (!__defaultLink) __defaultLink = defaultLink;
    return m;
  });
  let renderMode: "default" | "suppressed" | "none" = "suppressed";
  const moduleLinksCount = sum(modules, "activeLinkCount");

  if (moduleLinksCount > 12) renderMode = "default";
  if (moduleLinksCount < 6) renderMode = "none";
  if (__rankedLinks?.length) {
    __defaultLink = __rankedLinks.sort((a, b) => a.rank - b.rank)?.[0]?.href;
  }
  const totalLinks = sum(modules, "activeLinkCount");
  const noSidebar = totalLinks < 5;
  return {
    modules,
    renderMode,
    linksNameMap,
    moduleLinksCount,
    defaultLink: __defaultLink,
    totalLinks,
    noSidebar,
  };
}
