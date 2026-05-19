"use client";

export type WorkflowComponentPreviewProps = {
	imageSrc?: string | null;
	title: string;
	price?: string | null;
	alt?: string | null;
};

export function WorkflowComponentPreview(props: WorkflowComponentPreviewProps) {
	return (
		<>
			<div className="h-32 bg-muted">
				{props.imageSrc ? (
					<img
						src={props.imageSrc}
						alt={props.alt || props.title}
						className="h-full w-full object-contain p-2"
					/>
				) : (
					<div className="flex h-full items-center justify-center text-xs text-muted-foreground">
						No image
					</div>
				)}
			</div>
			<div className="space-y-1 p-3">
				<p className="font-semibold leading-tight">{props.title}</p>
				{props.price ? (
					<p className="text-xs font-medium text-primary">{props.price}</p>
				) : null}
			</div>
		</>
	);
}
