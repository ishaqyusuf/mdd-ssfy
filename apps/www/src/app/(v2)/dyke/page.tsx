"use client";

import PageShell from "@/components/page-shell";

import type { DykeShelfProducts } from "@/db";
import { useEffect } from "react";

import { createDykeProducts } from "./_dyke-action";
import categoryUtils from "./category-utils";
import { prods } from "./products";

export default function DykePage() {
	useEffect(() => {
		const products: DykeShelfProducts[] = [];
		prods._prods.map((productGroup) => {
			const cat = categoryUtils.generate(productGroup?.cats);

			productGroup?.products?.map((product) => {
				products.push({
					...product,
					createdAt: new Date(),
					updatedAt: new Date(),
					parentCategoryId: cat.parentCategoryId,
					categoryId: cat.categoryId,
					meta: {
						categoryIds: [cat.categories.map((c) => c.id)],
					},
				} as any);
			});
		});
		(async () => {
			await createDykeProducts(products, categoryUtils.categories);
		})();
	}, []);

	return (
		<PageShell>
			{" "}
			<></>
		</PageShell>
	);
}
