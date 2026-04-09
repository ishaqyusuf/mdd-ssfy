import { Icons } from "@gnd/ui/icons";
import { Avatar } from "@/components/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useZodForm } from "@/hooks/use-zod-form";
import { Button } from "@gnd/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@gnd/ui/command";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Input } from "@gnd/ui/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import z from "zod";
import { _qc, _trpc } from "./static-trpc";
import { SubmitButton } from "./submit-button";

const orgSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters"),
});
const defaultValues = {
	id: null,
	name: "",
	opened: false,
};
type Org = { id: number; name: string; employeesCount: number };

export function Organization() {
	const auth = useAuth();
	const isSuperAdmin = auth.roleTitle === "Super Admin";

	const [view, setView] = useState<"list" | "create" | "edit">("list");
	const [editingOrg, setEditingOrg] = useState<Org | null>(null);

	const { data: profile } = useQuery(
		// @ts-ignore
		_trpc.orgs.getOrganizationProfile.queryOptions(undefined, {
			// Mock data for demonstration
			// initialData: {
			//     orgs: [
			//         { id: 1, name: "GND", employeesCount: 42 },
			//         { id: 2, name: "Innovate Inc.", employeesCount: 15 },
			//         { id: 3, name: "Synergy Corp", employeesCount: 8 },
			//     ],
			//     primaryOrganizationId: 1,
			// },
		}),
	);
	const form = useZodForm(
		z.object({
			id: z.number().optional().nullable(),
			name: z.string(),
			opened: z.boolean().optional().nullable(),
		}),
		{
			defaultValues,
		},
	);
	const invalidateOrgs = () => {
		// @ts-ignore
		_qc.invalidateQueries({
			queryKey: _trpc.orgs.getOrganizationProfile.queryKey(undefined),
		});
	};

	const { mutate: createOrg, isPending: isCreating } = useMutation(
		_trpc.orgs.createOrganizationProfile.mutationOptions({
			onSuccess(data, variables, onMutateResult, context) {
				_qc.invalidateQueries({
					queryKey: _trpc.orgs.getOrganizationProfile.queryKey(undefined),
				});
				form.reset(defaultValues);
			},
			onError(error, variables, onMutateResult, context) {},
			meta: {
				toastTitle: {
					error: "Unable to complete",
					loading: "Processing...",
					success: "Done!.",
				},
			},
		}),
	);

	// const { mutate: updateOrg, isPending: isUpdating } = useMutation(
	//   // @ts-ignore
	//   _trpc.orgs.updateOrganization.mutationOptions({
	//     onSuccess: () => {
	//       invalidateOrgs();
	//       setView("list");
	//     },
	//     meta: { toast: { success: "Organization updated!" } },
	//   })
	// );

	const { mutate: deleteOrg } = useMutation(
		// @ts-ignore
		_trpc.orgs.deleteOrganization.mutationOptions({
			onSuccess: invalidateOrgs,
			meta: { toast: { success: "Office deleted!" } },
		}),
	);

	const { mutate: setPrimary } = useMutation(
		// @ts-ignore
		_trpc.orgs.setPrimaryOrganization.mutationOptions({
			onSuccess: invalidateOrgs,
			meta: { toast: { success: "Switched Office!" } },
		}),
	);

	// const form = useZodForm(orgSchema);

	if (!isSuperAdmin) return null;
	// const currentOrg = profile?.orgs.find(
	//     (org) => org.id === profile.primaryOrganizationId
	// );

	const handleSwitch = (orgId: number) => {
		// @ts-ignore
		setPrimary({ id: orgId });
		// closePopover();
	};

	const handleDelete = (orgId: number) => {
		if (window.confirm("Are you sure? This action cannot be undone.")) {
			// @ts-ignore
			deleteOrg({ id: orgId });
		}
	};

	const onFormSubmit = form.handleSubmit((data) => {
		if (view === "create") {
			// @ts-ignore
			createOrg({ name: data.name, primary: !profile?.orgs?.length });
		} else if (view === "edit" && editingOrg) {
			// @ts-ignore
			updateOrg({ id: editingOrg.id, name: data.name });
		}
	});

	const views = {
		list: (
			<Command>
				{/* <CommandInput placeholder="Search organization..." /> */}
				<CommandList>
					<CommandEmpty>No results found.</CommandEmpty>
					<CommandGroup heading="Offices">
						{profile?.orgs.map((org) => (
							<CommandItem
								key={org.id}
								onSelect={() => handleSwitch(org.id)}
								className="flex justify-between items-center"
							>
								<div className="flex items-center gap-2 overflow-hidden">
									<Avatar
										name={org.name}
										className="h-6 w-6"
										fallbackClassName="text-xs"
									/>
									<div className="flex flex-col">
										<span className="truncate font-medium">{org.name}</span>
										<div className="flex items-center text-xs text-muted-foreground">
											<Icons.Users className="mr-1 h-3 w-3" /> {org.employeesCount}
										</div>
									</div>
								</div>
								<div className="flex items-center ml-2">
									{(org.id === auth?.orgId || org.primary) && (
										<Icons.ShieldCheck className="h-4 w-4 text-green-500" />
									)}
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className="h-6 w-6 ml-1"
												onClick={(e) => e.stopPropagation()}
											>
												<Icons.MoreVertical className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent
											align="end"
											onClick={(e) => e.stopPropagation()}
										>
											<DropdownMenuItem
												onSelect={() => {
													setEditingOrg(org);
													form.reset({
														name: org.name,
													});
													setView("edit");
												}}
											>
												<Icons.Edit className="mr-2 h-4 w-4" /> Edit
											</DropdownMenuItem>
											<DropdownMenuItem
												className="text-red-500"
												onSelect={() => handleDelete(org.id)}
												disabled
												// disabled={
												//     org.id === auth?.orgId ||
												//     org.primary
												// }
											>
												<Icons.Trash2 className="mr-2 h-4 w-4" /> Delete
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</CommandItem>
						))}
					</CommandGroup>
				</CommandList>
				<CommandSeparator />
				<CommandList>
					<CommandGroup>
						<CommandItem
							onSelect={() => {
								form.reset({ name: "" });
								setView("create");
							}}
						>
							<Icons.PlusCircle className="mr-2 h-5 w-5" />
							Create Office
						</CommandItem>
					</CommandGroup>
				</CommandList>
			</Command>
		),
		form: (
			<div className="p-2">
				<div className="flex items-center gap-2 mb-4">
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={() => setView("list")}
					>
						<Icons.ArrowLeft className="h-4 w-4" />
					</Button>
					<h3 className="font-semibold text-sm">
						{view === "create" ? "Create Office" : "Edit Office"}
					</h3>
				</div>
				<form onSubmit={onFormSubmit} className="space-y-4">
					<Input
						{...form.register("name")}
						placeholder="Office Name"
						autoFocus
					/>
					{form.formState.errors.name && (
						<p className="text-xs text-red-500">
							{form.formState.errors.name.message}
						</p>
					)}
					<SubmitButton
						type="submit"
						className="w-full"
						isSubmitting={isCreating}
					>
						{view === "create" ? "Create" : "Save Changes"}
					</SubmitButton>
				</form>
			</div>
		),
	};

	return (
		<div className="w-[250px] p-0">
			<AnimatePresence initial={false} mode="wait">
				<motion.div
					key={view}
					initial={{ x: view === "list" ? 0 : 30, opacity: 0 }}
					animate={{ x: 0, opacity: 1 }}
					exit={{ x: -30, opacity: 0 }}
					transition={{ duration: 0.2 }}
				>
					{view === "list" ? views.list : views.form}
				</motion.div>
			</AnimatePresence>
		</div>
	);
}
