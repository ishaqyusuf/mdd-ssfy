import { Button } from "@gnd/ui/button";
import { ButtonGroup } from "@gnd/ui/button-group";
import { Icons } from "@gnd/ui/icons";
import { DropdownMenu } from "@gnd/ui/namespace";
import { Separator } from "@gnd/ui/separator";
import Link from "next/link";

export function CreateSalesBtn({ quote = false }) {
	const title = quote ? "quote" : "quote";
	const hrefs = quote ? ["quote"] : ["quote"];

	return (
		<ButtonGroup>
			<Button asChild>
				<Link href={`/${title}s/new`}>
					<Icons.Add className="mr-2 size-4" />
					<span className="hidden lg:inline">New</span>
				</Link>
			</Button>
			<Separator orientation="vertical" />
			<DropdownMenu.Root>
				<DropdownMenu.Trigger asChild>
					<Button>
						<Icons.MoreHoriz className="size-4" />
					</Button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content className="w-[200px]" align="end">
					{hrefs.map((href) => (
						<DropdownMenu.Item key={href} asChild>
							<Link href={`/${href}s/new`} className="capitalize">
								New {href}
							</Link>
						</DropdownMenu.Item>
					))}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</ButtonGroup>
	);
}
