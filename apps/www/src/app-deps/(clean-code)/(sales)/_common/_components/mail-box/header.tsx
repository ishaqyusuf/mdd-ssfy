import { Avatar } from "@/components/avatar";
import { Label } from "@gnd/ui/label";

import { useMailbox } from "./context";

export default function MailboxHeader() {
	const ctx = useMailbox();
	return (
		<div className="abolute top-0 w-full flex-col border-b p-2 sm:px-8">
			<div className="flex gap-4">
				<Avatar name={ctx.data?.name} email={ctx.data?.email} />
				<div className="">
					<Label>{ctx.data?.name}</Label>
					<div className="text-muted-foreground">
						{ctx.data.email || ctx.data.fallbackEmail || "No email attached"}
					</div>
				</div>
			</div>
		</div>
	);
}
