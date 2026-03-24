import { sum } from "@gnd/utils";
import type { LinkItem, NavModule } from "./types";
import { validateRules } from "./access";

export const normalizeNavPath = (path = "") =>
  path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

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
            sl?.paths?.map((p) => {
              linksNameMap[p] = {
                name: sl.name ?? l.name,
                module: m.name,
                match: "part",
                hasAccess: sl.show,
              };
            });
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

export function getActiveLinkFromMap(
  pathName: string | null | undefined,
  linksNameMap: ReturnType<typeof getLinkModules>["linksNameMap"],
) {
  const normalizedPath = normalizeNavPath(pathName?.toLocaleLowerCase() || "");
  if (!normalizedPath) return undefined;

  const exactMatch = Object.entries(linksNameMap || {})
    .map(([href, data]) => ({
      href: normalizeNavPath(href?.toLocaleLowerCase() || ""),
      data,
    }))
    .find(
      (entry) => entry.href === normalizedPath && entry.data?.hasAccess !== false,
    )?.data;
  if (exactMatch) return exactMatch;

  return Object.entries(linksNameMap || {})
    .map(([href, data]) => ({
      href: normalizeNavPath(href?.toLocaleLowerCase() || ""),
      data,
    }))
    .filter(
      (entry) =>
        entry.data?.match === "part" &&
        entry.data?.hasAccess !== false &&
        entry.href &&
        normalizedPath.startsWith(entry.href),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.data;
}

export function isPathInLink(
  pathName: string | null | undefined,
  link?: LinkItem | null,
) {
  const normalizedPath = normalizeNavPath(pathName?.toLocaleLowerCase() || "");
  if (!normalizedPath || !link) return false;

  const href = normalizeNavPath(link?.href?.toLocaleLowerCase() || "");
  if (href && href === normalizedPath) return true;

  return (link?.paths || []).some((partPath) => {
    const normalizedPart = normalizeNavPath(partPath?.toLocaleLowerCase() || "");
    return normalizedPart && normalizedPath.startsWith(normalizedPart);
  });
}
