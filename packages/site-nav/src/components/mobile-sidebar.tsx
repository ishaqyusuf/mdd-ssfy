import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Sheet } from "@gnd/ui/namespace";
import { useState } from "react";
import { ModuleSelector } from "./module-selector";
import { NavsList } from "./navs-list";
import { useSiteNav } from "./use-site-nav";

export function MobileSidebar() {
	const [isOpen, setOpen] = useState(false);
	const { linkModules, props } = useSiteNav();
	const BrandIcon = props.LogoSmIcon || props.LogoIcon;
	if (linkModules?.noSidebar) return null;

	return (
		<div className="md:hidden">
			<Sheet.Root open={isOpen} onOpenChange={setOpen}>
				<Sheet.Trigger asChild>
					<Button
						variant="outline"
						size="icon"
						aria-label="Open navigation"
						className="relative flex size-11 items-center rounded-full md:hidden"
					>
						<Icons.Menu className="size-5" />
					</Button>
				</Sheet.Trigger>
				<Sheet.Content
					side="left"
					hideClose
					className="flex h-dvh w-[min(22rem,calc(100vw-1rem))] flex-col gap-0 rounded-none border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground sm:max-w-[22rem]"
				>
					<Sheet.Close asChild>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							aria-label="Close navigation"
							className="absolute right-2.5 top-2.5 z-10 size-11 rounded-full text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
						>
							<Icons.X className="size-5" />
						</Button>
					</Sheet.Close>
					<Sheet.Header className="flex h-16 shrink-0 flex-row items-center space-y-0 border-b border-sidebar-border/80 px-4 pr-14 text-left">
						<Sheet.Title className="sr-only">Navigation</Sheet.Title>
						<Sheet.Description className="sr-only">
							Choose a module and navigate to a page.
						</Sheet.Description>
						<div className="flex min-w-0 items-center gap-3">
							{BrandIcon ? (
								<span className="inline-flex size-9 shrink-0 items-center justify-center overflow-hidden [&_img]:block">
									<BrandIcon />
								</span>
							) : (
								<span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
									<Icons.Menu className="size-5" />
								</span>
							)}
							<span className="truncate text-sm font-semibold">Navigation</span>
						</div>
					</Sheet.Header>

					<div className="shrink-0 border-b border-sidebar-border/80 p-3">
						<ModuleSelector forceExpanded expandNavOnOpen={false} />
					</div>

					<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hide pb-[max(1rem,env(safe-area-inset-bottom))]">
						<NavsList mobile onSelect={() => setOpen(false)} />
					</div>
				</Sheet.Content>
			</Sheet.Root>
		</div>
	);
}
