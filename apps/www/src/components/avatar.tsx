import { env } from "@/env.mjs";
import {
	AvatarFallback,
	AvatarImage,
	Avatar as AvatarRoot,
} from "@gnd/ui/avatar";
import { cn } from "@gnd/ui/cn";
import { getInitials } from "@gnd/utils";

type AvatarProps = {
	alt?: string;
	className?: string;
	email?: string | null;
	fallbackClassName?: string;
	imageClassName?: string;
	name?: string | null;
	shape?: "circle" | "square";
	src?: string | null;
	url?: string | null;
};

function resolveAvatarSrc(src?: string | null) {
	if (!src) return undefined;
	if (
		src.startsWith("http://") ||
		src.startsWith("https://") ||
		src.startsWith("/") ||
		src.startsWith("data:") ||
		src.startsWith("blob:")
	) {
		return src;
	}

	return `${env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/${src}`;
}

export function Avatar({
	alt,
	className,
	email,
	fallbackClassName,
	imageClassName,
	name,
	shape = "circle",
	src,
	url,
}: AvatarProps) {
	const resolvedSrc = resolveAvatarSrc(src ?? url);
	const initials = getInitials(name ?? email ?? "U");
	const roundedClass = shape === "square" ? "rounded-lg" : "rounded-full";

	return (
		<AvatarRoot
			className={cn(
				"border border-border/30 bg-muted/60 shadow-sm",
				roundedClass,
				className,
			)}
		>
			{resolvedSrc && (
				<AvatarImage
					src={resolvedSrc}
					alt={alt ?? name ?? email ?? "Avatar"}
					className={cn("object-cover", imageClassName)}
				/>
			)}
			<AvatarFallback
				className={cn(
					"bg-muted text-foreground font-semibold uppercase",
					roundedClass,
					fallbackClassName,
				)}
			>
				{initials}
			</AvatarFallback>
		</AvatarRoot>
	);
}
