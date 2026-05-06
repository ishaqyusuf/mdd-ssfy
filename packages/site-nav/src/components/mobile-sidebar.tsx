import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Sheet } from "@gnd/ui/namespace";
import { useState } from "react";
import { LogoSm } from "./logo";
import { NavsList } from "./navs-list";
import { useSiteNav } from "./use-site-nav";

export function MobileSidebar() {
	const [isOpen, setOpen] = useState(false);
	const { linkModules } = useSiteNav();
	if (linkModules?.noSidebar) return null;
	return (
		<div className="md:hidden">
			<Sheet.Root open={isOpen} onOpenChange={setOpen}>
				<div>
					<Button
						variant="outline"
						size="icon"
						onClick={() => setOpen(true)}
						className="rounded-full w-8 h-8 items-center relative flex md:hidden"
					>
						<Icons.Menu size={16} />
					</Button>
				</div>
				<Sheet.Content
					side="left"
					className="border-none max-sm:w-full rounded-none -ml-4"
				>
					<Sheet.Header>
						<Sheet.Title />
						<Sheet.Description />
					</Sheet.Header>
					<div className="ml-2 mb-8">
						<LogoSm />
					</div>

					<div className="-ml-2 h-[85vh] overflow-auto scrollbar-hide pb-16">
						<NavsList mobile onSelect={() => setOpen(false)} />
					</div>
				</Sheet.Content>
			</Sheet.Root>
		</div>
	);
}
