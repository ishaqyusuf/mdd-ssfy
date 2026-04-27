import { Button } from "@gnd/ui/button";
import { ButtonGroup } from "@gnd/ui/button-group";
import { DropdownMenu } from "@gnd/ui/namespace";
import { Icons } from "@gnd/ui/icons";
import { Separator } from "@gnd/ui/separator";
import Link from "next/link";

export function CreateSalesBtn({ quote = false }) {
    const title = !quote ? "order" : "quote";
    const hrefs = quote ? ["order", "quote"] : ["quote", "order"];
    return (
        <ButtonGroup>
            <Button asChild>
                <Link href={`/sales-book/create-${title}`}>
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
                            <Link
                                href={`/sales-book/create-${href}`}
                                className="capitalize"
                            >
                                New {href}
                            </Link>
                        </DropdownMenu.Item>
                    ))}
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </ButtonGroup>
    );
}
