"use client";

import { Badge } from "@gnd/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import Link from "next/link";

type StorefrontOfferCardProps = {
	offer: {
		id: string;
		href: string;
		title: string;
		description?: string | null;
		imageUrl?: string | null;
		category?: { title: string } | null;
		promotion?: {
			title: string;
			badgeText: string;
			percentageOff: number;
		} | null;
	};
	showDescription?: boolean;
};

export function StorefrontOfferCard({
	offer,
	showDescription = false,
}: StorefrontOfferCardProps) {
	return (
		<Link href={offer.href} className="group block h-full">
			<Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
				<CardHeader className="relative p-0">
					<div className="aspect-[4/3] bg-muted">
						{offer.imageUrl ? (
							<img
								src={offer.imageUrl}
								alt=""
								loading="lazy"
								className="size-full object-cover"
							/>
						) : null}
					</div>
					{offer.promotion ? (
						<Badge className="absolute left-3 top-3 bg-red-600 text-white hover:bg-red-600">
							{offer.promotion.badgeText}
						</Badge>
					) : null}
				</CardHeader>
				<CardContent className="p-5">
					{offer.category ? (
						<p className="mb-1 text-xs font-medium uppercase tracking-wide text-amber-800">
							{offer.category.title}
						</p>
					) : null}
					<CardTitle className="text-lg">{offer.title}</CardTitle>
					{offer.promotion ? (
						<p className="mt-2 text-sm font-medium text-red-700">
							Save {offer.promotion.percentageOff}% on eligible configurations
						</p>
					) : null}
					{showDescription && offer.description ? (
						<p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
							{offer.description}
						</p>
					) : null}
				</CardContent>
			</Card>
		</Link>
	);
}
