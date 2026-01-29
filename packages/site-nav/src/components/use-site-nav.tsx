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
    const activeLink = Object.entries(linkModules.linksNameMap || {}).find(
      ([href, data]) =>
        (data as any).match == "part"
          ? props.pathName?.toLocaleLowerCase()?.startsWith(href)
          : href?.toLocaleLowerCase() === props.pathName?.toLocaleLowerCase()
    )?.["1"];
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
