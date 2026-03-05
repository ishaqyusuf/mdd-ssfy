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
			<div className="flex items-between justify-between space-x-4 px-3 py-3 hover:bg-secondary">
				<button className={className} onClick={onNavigate} type="button">
					{children}
				</button>
				{actionButton}
			</div>
		);
	}

	return (
		<div className="flex items-between space-x-4 px-3 py-3">
			<div className="flex items-between justify-between space-x-4 flex-1">
				{children}
			</div>
			{actionButton}
		</div>
	);
}
