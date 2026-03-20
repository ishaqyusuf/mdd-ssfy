import type { IconKeys } from "@gnd/ui/icons";

export type Access = {
  type: "role" | "permission";
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
};

export type NavModule = ReturnType<typeof createNavModule>;
export type NavSection = ReturnType<typeof createNavSection>;
export type NavLink = ReturnType<typeof createNavLink>["data"] | undefined;

export const createNavModule = (
  name: string,
  icon: IconKeys,
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
  name,
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
