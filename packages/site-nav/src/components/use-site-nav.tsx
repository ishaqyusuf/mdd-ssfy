import { createContext, useContext, useMemo, useRef, useState } from "react";
import {
	getActiveLinkFromMap,
	getLinkModules,
	validateLinks,
} from "../lib/utils";

type SiteNavContext = ReturnType<typeof createSiteNavContext>;
export const SiteNavContext = createContext<SiteNavContext>(undefined);
export const SiteNavProvider = SiteNavContext.Provider;
interface Props {
	pathName: string;
	linkModules;
	accessMode?: "rules" | "open";
	LogoIcon?;
	LogoSmIcon?;
	permissions?;
	role?;
	userId?;
	Link?;
	defaultHrefByPath?: Record<string, string>;
}
export const createSiteNavContext = (props: Props) => {
	const mainMenuRef = useRef<HTMLDivElement>(null);
	const [isExpanded, setIsExpanded] = useState(false);

	const { activeLink, linkModules, modules, currentModule } = useMemo(() => {
		const linkModules = getLinkModules(
			validateLinks({
				linkModules: props.linkModules,
				accessMode: props.accessMode,
				can: props.permissions,
				role: props.role,
				userId: props.userId,
			}),
		);
		applyDefaultTargets(linkModules.modules, props.defaultHrefByPath);
		const activeLink = getActiveLinkFromMap(
			props.pathName,
			linkModules.linksNameMap,
		);
		const modules = linkModules?.modules
			?.filter((a) => a.activeLinkCount && a?.name)
			.map((module) => {
				const prim = module?.sections
					?.flatMap((a) => a.links?.filter((l) => l.show))
					?.sort((a, b) => a.globalIndex - b.globalIndex)?.[0];
				const href =
					props.defaultHrefByPath?.[module.defaultLink] ||
					module.defaultLink ||
					prim?.targetHref ||
					prim?.href ||
					prim?.subLinks?.filter((a) => a.show)?.[0]?.targetHref ||
					prim?.subLinks?.filter((a) => a.show)?.[0]?.href;
				return {
					...module,
					href,
				};
			});
		const currentModule = modules.find((m) => m.name === activeLink?.module);

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

function applyDefaultTargets(
	modules,
	defaultHrefByPath?: Record<string, string>,
) {
	if (!defaultHrefByPath) return;

	for (const module of modules || []) {
		for (const section of module.sections || []) {
			for (const link of section.links || []) {
				applyDefaultTarget(link, defaultHrefByPath);
				for (const child of link.subLinks || []) {
					applyDefaultTarget(child, defaultHrefByPath);
				}
			}
		}
	}
}

function applyDefaultTarget(link, defaultHrefByPath: Record<string, string>) {
	if (!link?.href) return;
	link.targetHref = defaultHrefByPath[link.href] || link.href;
}
