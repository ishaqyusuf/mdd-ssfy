import { cn } from "@/lib/utils";
import { Fragment } from "react";

type ProductionItemHeadlineInput = {
	title?: string | null;
	subtitle?: string | null;
};

const QUANTITY_SEGMENT =
	/^(?:QTY\s*:?\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*LH(?:\s*&\s*\d+(?:\.\d+)?\s*RH)?|\d+(?:\.\d+)?\s*RH)$/i;

function uppercaseText(value: string | null | undefined) {
	return value?.trim().toUpperCase() || "";
}

export function getProductionItemHeadlineSegments(
	item: ProductionItemHeadlineInput,
	options: { omitQuantitySegments?: boolean } = {},
) {
	const title = uppercaseText(item.title) || "UNTITLED ITEM";
	const details = uppercaseText(item.subtitle)
		.split("|")
		.map((segment) => segment.trim())
		.filter(
			(segment) =>
				segment &&
				(!options.omitQuantitySegments || !QUANTITY_SEGMENT.test(segment)),
		);
	return [title, ...details];
}

export function ProductionItemHeadline({
	segments,
	className,
}: {
	segments: string[];
	className?: string;
}) {
	return (
		<span
			className={cn(
				"flex min-w-0 flex-wrap items-baseline gap-y-0.5 uppercase",
				className,
			)}
		>
			{segments.map((segment, index) => (
				<Fragment key={`${segment}-${index}`}>
					{index > 0 ? (
						<span aria-hidden="true" className="mx-2 font-normal opacity-50">
							•
						</span>
					) : null}
					<span>{segment}</span>
				</Fragment>
			))}
		</span>
	);
}
