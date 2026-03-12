import { getLinkModules, validateLinks } from "../lib/utils";
import { createContext, useContext, useMemo, useRef, useState } from "react";

type SiteNavContext = ReturnType<typeof createSiteNavContext>;
export const SiteNavContext = createContext<SiteNavContext>(undefined);
export const SiteNavProvider = SiteNavContext.Provider;
interface Props {
  pathName: string;
  linkModules;
  permissions?;
  role?;
  userId?;
  Link?;
}
export const createSiteNavContext = (props: Props) => {
  const mainMenuRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const { activeLink, linkModules, modules, currentModule } = useMemo(() => {
    const linkModules = getLinkModules(
      validateLinks({
        linkModules: props.linkModules,
        can: props.permissions,
        role: props.role,
        userId: props.userId,
      })
    );
    const normalizePath = (path = "") =>
      path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
    const pathName = normalizePath(props.pathName?.toLocaleLowerCase() || "");
    const candidates: Array<{
      name?: string;
      module?: string;
      match?: "part";
      hasAccess: boolean;
      score: number;
      pathLength: number;
    }> = [];
    const moduleList = linkModules?.modules || [];
    moduleList.forEach((module) => {
      const moduleName = module?.name;
      const moduleScore =
        typeof moduleName === "string" && moduleName.trim() !== "" ? 1 : 0;
      module?.sections?.forEach((section) => {
        section?.links?.forEach((link) => {
          if (!link) return;
          const exactHref = normalizePath(link?.href?.toLocaleLowerCase() || "");
          if (exactHref && link.show && exactHref === pathName) {
            candidates.push({
              name: link.name,
              module: moduleName,
              hasAccess: true,
              score: 3 + moduleScore,
              pathLength: exactHref.length,
            });
          }
          (link?.paths || []).forEach((partPath) => {
            const normalizedPart = normalizePath(
              partPath?.toLocaleLowerCase() || "",
            );
            if (!normalizedPart || !link.show || !pathName.startsWith(normalizedPart)) {
              return;
            }
            candidates.push({
              name: link.name,
              module: moduleName,
              match: "part",
              hasAccess: true,
              score: 1 + moduleScore,
              pathLength: normalizedPart.length,
            });
          });
          (link?.subLinks || []).forEach((subLink) => {
            const subHref = normalizePath(
              subLink?.href?.toLocaleLowerCase() || "",
            );
            if (!subHref || !subLink?.show) return;
            if (subHref === pathName) {
              candidates.push({
                name: link.name,
                module: moduleName,
                hasAccess: true,
                score: 3 + moduleScore,
                pathLength: subHref.length,
              });
            }
          });
        });
      });
    });
    const activeLink =
      candidates.sort((a, b) => {
        const byScore = b.score - a.score;
        if (byScore !== 0) return byScore;
        return b.pathLength - a.pathLength;
      })[0] ||
      Object.entries(linkModules.linksNameMap || {})
        .map(([href, data]) => ({
          href: normalizePath(href?.toLocaleLowerCase() || ""),
          data: data as any,
        }))
        .find((entry) => entry.href === pathName && entry.data?.hasAccess !== false)
        ?.data;
    const modules = linkModules?.modules
      ?.filter((a) => a.activeLinkCount && a?.name)
      .map((module) => {
        const prim = module?.sections
          ?.map((a) => a.links?.filter((l) => l.show))
          ?.flat()
          ?.sort((a, b) => a.globalIndex - b.globalIndex)?.[0];
        const href =
          module.defaultLink ||
          prim?.href ||
          prim?.subLinks?.filter((a) => a.show)?.[0]?.href;
        return {
          ...module,
          href,
        };
      });
    const currentModule = modules.find(
      (m) => m.name == (activeLink as any)?.module
    );

    return { activeLink, modules, linkModules, currentModule };
  }, [props]);
  return {
    props,
    mainMenuRef,
    isExpanded,
    setIsExpanded,
    activeLink,
    modules,
    linkModules,
    currentModule,
  };
};
export const useSiteNav = () => {
  const context = useContext(SiteNavContext);
  if (context === undefined) {
    throw new Error("useSiteNavContext must be used within a SiteNavProvider");
  }
  return context;
};
