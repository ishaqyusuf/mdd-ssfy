import type { StorefrontRouterOutputs } from "@gnd/api/trpc/routers/storefront-app";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import Image from "next/image";
import Link from "next/link";

type Category =
	StorefrontRouterOutputs["storefrontCommerce"]["catalog"]["categories"][number];
interface CategoryCardProps extends Category {}

export function CategoryCard1({
	offerCount,
	imageUrl,
	href,
	title,
	description,
}: CategoryCardProps) {
	return (
		<Link href={href}>
			<Card className="group cursor-pointer hover:shadow-lg transition-shadow">
				<CardHeader className="p-0">
					<div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
						{!imageUrl || (
							<Image
								src={imageUrl}
								alt={title}
								fill
								sizes="(max-width: 768px) 100vw, 25vw"
								className="object-cover transition-transform duration-300 group-hover:scale-105"
							/>
						)}
					</div>
				</CardHeader>
				<CardContent className="p-6">
					<CardTitle className="text-xl mb-2">{title}</CardTitle>
					<CardDescription className="mb-3">{description}</CardDescription>
					<p className="text-sm font-medium text-amber-700">
						{offerCount} {offerCount === 1 ? "product" : "products"}
					</p>
				</CardContent>
			</Card>
		</Link>
	);
}
