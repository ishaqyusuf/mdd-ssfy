import { z } from "zod";

const variationsSchema = z.array(
	z.object({
		rules: z.array(
			z.object({
				stepUid: z.string().min(1),
				operator: z.enum(["is", "isNot"]),
				componentsUid: z.array(z.string().min(1)),
			}),
		),
	}),
);

type ComponentSource = {
	uid: string | null;
	name?: string | null;
	deletedAt?: Date | string | null;
	redirectUid?: string | null;
	custom?: boolean | null;
	sortIndex?: number | null;
	product?: { title: string | null } | null;
	door?: { title: string | null } | null;
	meta?: unknown;
};

function metadata(value: unknown): Record<string, unknown> {
	if (value == null) return {};
	const parsed = typeof value === "string" ? JSON.parse(value) : value;
	return z.record(z.string(), z.unknown()).parse(parsed);
}

/** Price-free projection; malformed rules fail closed instead of disappearing. */
export function projectRequestComponent(component: ComponentSource) {
	// Persisted custom values are for human reuse after custom mode is selected;
	// they are never part of the model's standard candidate vocabulary.
	if (component.custom === true) return null;
	const meta = metadata(component.meta);
	if (component.deletedAt || meta.deletedAt) return null;
	if (!component.uid) throw new Error("Component is missing its UID");
	const title =
		component.name || component.door?.title || component.product?.title;
	if (!title?.trim())
		throw new Error(`Component ${component.uid} is missing its title`);
	return {
		uid: component.uid,
		title,
		redirectUid: component.redirectUid || null,
		variations: variationsSchema.parse(meta.variations ?? []),
		...(typeof component.sortIndex === "number" &&
		Number.isFinite(component.sortIndex)
			? { sortIndex: component.sortIndex }
			: {}),
		...(meta.sectionOverride == null
			? {}
			: {
					sectionOverride: z
						.object({
							overrideMode: z.boolean().optional(),
							noHandle: z.boolean().optional(),
							hasSwing: z.boolean().optional(),
						})
						.parse(meta.sectionOverride),
				}),
	};
}
