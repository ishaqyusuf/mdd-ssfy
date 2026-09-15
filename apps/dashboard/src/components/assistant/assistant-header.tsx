"use client";

import { Button } from "@gnd/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import {
	Archive,
	ArrowLeft,
	BookmarkPlus,
	Globe2,
	History,
	MessageSquarePlus,
	MoreHorizontal,
	Plus,
	Settings2,
	Star,
	Trash2,
} from "lucide-react";

type AssistantHeaderProps = {
	title: string;
	quotaLabel?: string | null;
	onBack: () => void;
	onNewChat: () => void;
	onFavorites: () => void;
	onFeatureRequests: () => void;
	onHistory: () => void;
	onSources: () => void;
	onPreferences: () => void;
	onSaveAction?: () => void;
	onArchive?: () => void;
	onDelete?: () => void;
};

export function AssistantHeader(props: AssistantHeaderProps) {
	return (
		<header className="flex items-center gap-3 border-b px-4 py-3 md:px-6">
			<Button
				type="button"
				variant="outline"
				size="icon"
				aria-label="Back to dashboard"
				onClick={props.onBack}
			>
				<ArrowLeft className="size-4" />
			</Button>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{props.title}</p>
				{props.quotaLabel ? (
					<p className="truncate text-[10px] text-muted-foreground">
						{props.quotaLabel}
					</p>
				) : null}
			</div>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label="Conversation menu"
					>
						<MoreHorizontal className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-52">
					<DropdownMenuItem className="gap-2" onSelect={props.onFavorites}>
						<Star className="size-4" /> Favorites
					</DropdownMenuItem>
					<DropdownMenuItem
						className="gap-2"
						onSelect={props.onFeatureRequests}
					>
						<MessageSquarePlus className="size-4" /> Requests
					</DropdownMenuItem>
					<DropdownMenuItem className="gap-2" onSelect={props.onHistory}>
						<History className="size-4" /> History
					</DropdownMenuItem>
					<DropdownMenuItem className="gap-2" onSelect={props.onSources}>
						<Globe2 className="size-4" /> Sources
					</DropdownMenuItem>
					<DropdownMenuItem className="gap-2" onSelect={props.onPreferences}>
						<Settings2 className="size-4" /> Preferences
					</DropdownMenuItem>
					{props.onSaveAction ? (
						<DropdownMenuItem className="gap-2" onSelect={props.onSaveAction}>
							<BookmarkPlus className="size-4" /> Save action
						</DropdownMenuItem>
					) : null}
					{props.onArchive || props.onDelete ? <DropdownMenuSeparator /> : null}
					{props.onArchive ? (
						<DropdownMenuItem className="gap-2" onSelect={props.onArchive}>
							<Archive className="size-4" /> Archive
						</DropdownMenuItem>
					) : null}
					{props.onDelete ? (
						<DropdownMenuItem
							className="gap-2 text-destructive"
							onSelect={props.onDelete}
						>
							<Trash2 className="size-4" /> Delete
						</DropdownMenuItem>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>
			<Button type="button" variant="outline" onClick={props.onNewChat}>
				<Plus className="size-4" />
				<span className="hidden sm:inline">New chat</span>
			</Button>
		</header>
	);
}
