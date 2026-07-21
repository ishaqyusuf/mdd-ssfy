"use client";

import { CategoryCard1 } from "@/components/category-card-1";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export function FeaturedCategorySection() {
	const trpc = useTRPC();
	const { data: categories, isPending } = useQuery(
		trpc.storefrontCommerce.catalog.categories.queryOptions(),
	);

	return (
		<section className="py-16 bg-white">
			<div className="container mx-auto px-4">
				<div className="text-center mb-12">
					<h3 className="text-3xl font-bold text-gray-900 mb-4">
						Shop by Category
					</h3>
					<p className="text-gray-600 max-w-2xl mx-auto">
						Browse our comprehensive selection of doors and millwork components,
						carefully curated for quality and craftsmanship.
					</p>
				</div>

				<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
					{isPending ? (
						<></>
					) : (
						<>
							{categories?.map((category) => (
								<CategoryCard1 key={category.id} {...category} />
							))}
						</>
					)}
				</div>
			</div>
		</section>
	);
}
