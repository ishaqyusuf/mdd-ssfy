import type { ReactNode } from "react";

interface NotificationLinkProps {
	onNavigate?: () => void;
	children: ReactNode;
	className?: string;
	actionButton?: ReactNode;
	isClickable?: boolean;
}

export function NotificationLink({
	onNavigate,
	children,
	className,
	actionButton,
	isClickable = true,
}: NotificationLinkProps) {
	if (isClickable) {
		return (
			<div className="flex items-start justify-between gap-3 px-3 py-3 hover:bg-secondary">
				<button className={className} onClick={onNavigate} type="button">
					{children}
				</button>
				{actionButton}
			</div>
		);
	}

	return (
		<div className="flex items-start justify-between gap-3 px-3 py-3">
			<div className="flex flex-1 items-start justify-between gap-3">
				{children}
			</div>
			{actionButton}
		</div>
	);
}
