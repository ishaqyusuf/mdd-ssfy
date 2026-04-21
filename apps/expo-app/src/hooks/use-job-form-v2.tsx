import { getFallbackInsuranceStatus } from "@/components/insurance/insurance-status-alert";
import { _qc, _trpc } from "@/components/static-trpc";
import { Toast } from "@/components/ui/toast";
import { useZodForm } from "@/components/use-zod-form";
import { useAuthContext } from "@/hooks/use-auth";
import {
	type JobFormV2Action,
	useJobFormV2Params,
} from "@/hooks/use-job-form-v2-params";
import { useNotificationTrigger } from "@/hooks/use-notification-trigger";
import { isAdminUser } from "@/lib/job";
import { getSessionProfile } from "@/lib/session-store";
import { useTRPC } from "@/trpc/client";
import { type JobFormSchema, jobFormSchema } from "@community/schema";
import { consoleLog, percentageValue, sum } from "@gnd/utils";
import {
	type InsuranceRequirement,
	getInsuranceRequirement,
} from "@gnd/utils/insurance-documents";
import { skipToken, useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useWatch } from "react-hook-form";

export interface JobFormV2Props {
	admin?: boolean;
	action?: JobFormV2Action;
}

const TABS = ["user", "project", "task", "unit", "form"] as const;
export type JobFormV2Tab = (typeof TABS)[number] | "completed";
type EmployeeRole =
	| "Production"
	| "Admin"
	| "1099 Contractor"
	| "Super Admin"
	| "Punchout";

type JobFormV2ContextType = ReturnType<typeof useCreateJobFormV2Context>;

const JobFormV2Context = createContext<JobFormV2ContextType>(
	undefined as never,
);
export const JobFormV2Provider = JobFormV2Context.Provider;

const getWorkerRoles = (jobType?: string): EmployeeRole[] => {
	const normalized = (jobType || "installation").toLowerCase();
	const roleMap: Record<string, EmployeeRole> = {
		installation: "1099 Contractor",
		punchout: "Punchout",
		maintenance: "1099 Contractor",
	};
	const role = roleMap[normalized];

	return role ? [role] : ["1099 Contractor", "Punchout"];
};

const clamp = (value: number, min: number, max: number) =>
	Math.max(min, Math.min(max, value));

export function useCreateJobFormV2Context(props: JobFormV2Props) {
	const router = useRouter();
	const auth = useAuthContext();
	const trpc = useTRPC();
	const params = useJobFormV2Params();
	const notification = useNotificationTrigger();

	const admin = isAdminUser();
	const action = props.action ?? params.action ?? "submit";
	const jobType = params.jobType;
	const profile = getSessionProfile();
	const allowedRoles: EmployeeRole[] = [
		"Production",
		"Admin",
		"1099 Contractor",
		"Super Admin",
		"Punchout",
	];
	const profileRole = profile?.role?.name;
	const safeProfileRole: EmployeeRole =
		allowedRoles.find((role) => role === profileRole) || "1099 Contractor";

	const tabs = useMemo(() => {
		if (action === "submit" && !!params.jobId)
			return ["form"] as JobFormV2Tab[];
		if (action === "re-assign") return ["user"] as JobFormV2Tab[];
		return admin ? [...TABS] : TABS.filter((tab) => tab !== "user");
	}, [action, admin, params.jobId]);
	const resolvedUserId = admin
		? params.userId
		: (params.userId ?? auth?.profile?.user?.id);

	const initialStep = clamp(params.step || 1, 1, tabs.length);
	const [completed, setCompleted] = useState(false);
	const [isInstallCostStepActive, setIsInstallCostStepActive] = useState(false);
	const [installCostBuilderTaskId, setInstallCostBuilderTaskId] = useState<
		number | null
	>(null);
	const [didAutoOpenRequestConfig, setDidAutoOpenRequestConfig] =
		useState(false);

	useEffect(() => {
		if (!params.step) {
			params.setParams({ step: 1, admin, action });
		}
	}, [action, admin, params]);

	useEffect(() => {
		setDidAutoOpenRequestConfig(false);
	}, [params.requestBuilderTaskId]);

	const form = useZodForm(jobFormSchema, {
		defaultValues: {
			// coWorker: {
			//   id: undefined,
			//   name: undefined,
			// },
			unit: {
				id: params.unitId!,
				projectId: params.projectId!,
			},
			user: {
				id: params.userId,
			},
			action: params.action ?? "submit",
			// projectId: null,
			// title: "",
			// description: "",
			// homeId: null,
			// subtitle: null,
			// additionalCost: undefined as any,
			// additionalReason: "",
			// status: admin ? "Assigned" : "Started",
			// adminMode: admin,
		},
	});

	const shouldLoadDefaults =
		!!params.unitId &&
		params.builderTaskId !== null &&
		params.builderTaskId !== undefined &&
		!!resolvedUserId &&
		!!params.modelId;
	// consoleLog("PARAMS", params,shouldLoadDefaults);

	const { data: defaultValues, isPending: isDefaultValuesPending } = useQuery(
		trpc.community.getJobForm.queryOptions(
			shouldLoadDefaults
				? {
						unitId: params.unitId!,
						builderTaskId:
							params.builderTaskId && params.builderTaskId > 0
								? params.builderTaskId
								: null,
						jobId: params.jobId,
						userId: resolvedUserId!,
						modelId: params.modelId!,
					}
				: skipToken,
			{
				enabled: shouldLoadDefaults,
			},
		),
	);

	useEffect(() => {
		if (defaultValues) {
			consoleLog("FORM RESET TASKS", {
				jobTasks: (defaultValues as any)?.job?.tasks?.[0],
			});
			form.reset({
				...(defaultValues as any),
				action: params.action ?? "submit",
				unit: {
					id: params.unitId,
					projectId: params.projectId!,
				},
				modelId: params.modelId!,
				user: {
					id: resolvedUserId,
				},
				isCustom: !!(defaultValues as any)?.job?.isCustom,
			});
		}
	}, [
		defaultValues,
		form,
		params.action,
		params.projectId,
		params.modelId,
		params.unitId,
		resolvedUserId,
	]);

	const workerRoles = admin ? getWorkerRoles(jobType) : [safeProfileRole];
	const { data: users, isPending: isUsersPending } = useQuery(
		_trpc.hrm.getEmployees.queryOptions({
			roles: workerRoles,
			size: 100,
		}),
	);
	const { data: profileData, isPending: isInsuranceStatusPending } = useQuery(
		trpc.user.getProfile.queryOptions(undefined, {
			enabled: !admin,
		}),
	);
	const { data: jobSettings } = useQuery(
		trpc.settings.getJobSettings.queryOptions(),
	);
	const insuranceStatus: InsuranceRequirement | null = useMemo(() => {
		if (admin) return null;
		if (!profileData) return getFallbackInsuranceStatus();
		return getInsuranceRequirement(profileData.documents || []);
	}, [admin, profileData]);

	const { data: projectList, isPending: isProjectsPending } = useQuery(
		_trpc.community.projectsList.queryOptions(),
	);
	const { data: costData } = useQuery(
		_trpc.jobs.getInstallCosts.queryOptions({}),
	);
	const { data: unitOptions, isPending: isUnitsPending } = useQuery(
		_trpc.community.getProjectUnitsWithJobStats.queryOptions(
			{
				projectId: params.projectId!,
			},
			{
				enabled: !!params.projectId,
			},
		),
	);
	const { data: taskOptions, isPending: isTasksPending } = useQuery(
		_trpc.community.getBuilderTasksForProject.queryOptions(
			{
				projectId: params.projectId!,
				homeId: params.unitId || -1,
			},
			{
				enabled: !!params.projectId,
			},
		),
	);
	const state = useMemo(
		() => ({
			showTaskQty: admin || !!jobSettings?.meta?.showTaskQty,
			allowCustomJobs:
				admin ||
				!!jobSettings?.meta?.allowCustomJobs ||
				!!auth?.profile?.can?.submitCustomJob,
		}),
		[
			admin,
			auth?.profile?.can?.submitCustomJob,
			jobSettings?.meta?.allowCustomJobs,
			jobSettings?.meta?.showTaskQty,
		],
	);

	const formData = useWatch({ control: form.control }) as any;
	const total = useMemo(() => {
		const tasks = (formData?.job?.tasks || []) as any[] as {
			qty?: number;
			rate?: number;
		}[];
		const taskTotal = sum(
			tasks.map((task) => (+task?.qty! || 0) * (+task?.rate! || 0)),
		);
		const addonPercent = +formData?.job?.meta?.addonPercent || 0;
		const projectAddon = +(defaultValues as any)?.unit?.projectAddon || 0;
		const addon = percentageValue(projectAddon, addonPercent) || 0;
		const isCustom = !!formData?.job?.isCustom;
		const extra = isCustom ? +formData?.job?.meta?.additional_cost || 0 : 0;
		return sum([taskTotal, addon, extra]);
	}, [defaultValues, formData]);

	const [errors, setErrors] = useState<any>(null);
	const navigateToJobAlert = useCallback(
		(jobId: number, alert: string) => {
			router.dismissAll();
			router.replace(`/job/${jobId}/alert/${alert}` as any);
		},
		[router],
	);
	// const [savedData, setSavedData] = useState<{ id?: number } | null>(null);
	const {
		mutate: saveJobForm,
		isPending: isSaving,
		error: saveJobError,
	} = useMutation(
		_trpc.community.saveJobForm.mutationOptions({
			onSuccess(data, args) {
				const savedJobId = Number((data as any)?.id);
				_qc.invalidateQueries({
					queryKey: _trpc.jobs.getJobs.queryKey(),
				});
				_qc.invalidateQueries({
					queryKey: _trpc.community.getJobForm.queryKey(),
				});
				consoleLog("SAVE JOB FORM SUCCESS", {
					id: savedJobId,
					requestTaskConfig: args?.requestTaskConfig,
				});
				if (args?.requestTaskConfig) {
					if (Number.isFinite(savedJobId) && savedJobId > 0) {
						navigateToJobAlert(savedJobId, "request-submitted");
					}
					return;
				}

				if (!Number.isFinite(savedJobId) || savedJobId <= 0) {
					return;
				}

				const alert =
					action === "re-assign"
						? "re-assigned"
						: admin
							? "assigned"
							: "submitted";
				navigateToJobAlert(savedJobId, alert);
			},
			// meta: {
			//   toastTitle: {
			//     error: "Failed to save job",
			//     loading: "Saving job...",
			//     success: "Job saved",
			//     show: true,
			//   },
			// },
		}),
	);
	const { mutate: reAssignJob, isPending: isReAssigning } = useMutation(
		_trpc.jobs.reAssignJob.mutationOptions({
			onSuccess(_, variables) {
				_qc.invalidateQueries({
					queryKey: _trpc.jobs.getJobs.queryKey(),
				});
				_qc.invalidateQueries({
					queryKey: _trpc.jobs.overview.queryKey({
						jobId: variables.jobId,
					}),
				});
				navigateToJobAlert(variables.jobId, "re-assigned");
			},
			onError() {
				Toast.show("Unable to re-assign job right now.", {
					type: "error",
				});
			},
		}),
	);

	const hasMissingTaskConfiguration = useMemo(() => {
		const builderTaskId = (defaultValues as any)?.builderTaskId;
		const isCustom = !!(defaultValues as any)?.job?.isCustom;
		const tasks = ((defaultValues as any)?.job?.tasks || []) as any[];
		if (!builderTaskId || isCustom) return false;
		if (!tasks.length) return true;
		return tasks.every((task) => !task?.maxQty || Number(task.maxQty) <= 0);
	}, [defaultValues]);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const setStep = useCallback(
		(nextStep: number) => {
			setCompleted(false);
			params.setParams({
				step: clamp(nextStep, 1, tabs.length),
				admin,
				action,
			});
		},
		[action, admin, params, tabs.length],
	);

	const currentTab: JobFormV2Tab = completed
		? "completed"
		: tabs[initialStep - 1]!;

	useEffect(() => {
		if (!state.allowCustomJobs && params.builderTaskId === -1) {
			params.setParams({ builderTaskId: null });
		}
	}, [params, params.builderTaskId, state.allowCustomJobs]);

	const refreshCurrentStep = useCallback(async () => {
		if (isRefreshing) return;
		setIsRefreshing(true);
		try {
			switch (currentTab) {
				case "user":
					await _qc.invalidateQueries({
						queryKey: _trpc.hrm.getEmployees.queryKey(),
					});
					break;
				case "project":
					await _qc.invalidateQueries({
						queryKey: _trpc.community.projectsList.queryKey(),
					});
					break;
				case "task":
					if (params.projectId) {
						await _qc.invalidateQueries({
							queryKey: _trpc.community.getBuilderTasksForProject.queryKey({
								projectId: params.projectId,
								homeId: params.unitId || -1,
							}),
						});
					}
					break;
				case "unit":
					if (params.projectId) {
						await _qc.invalidateQueries({
							queryKey: _trpc.community.getProjectUnitsWithJobStats.queryKey({
								projectId: params.projectId,
							}),
						});
					}
					break;
				case "form":
				case "completed":
					await Promise.all([
						params.projectId
							? _qc.invalidateQueries({
									queryKey: _trpc.community.getBuilderTasksForProject.queryKey({
										projectId: params.projectId,
										homeId: params.unitId || -1,
									}),
								})
							: Promise.resolve(),
						params.projectId
							? _qc.invalidateQueries({
									queryKey:
										_trpc.community.getProjectUnitsWithJobStats.queryKey({
											projectId: params.projectId,
										}),
								})
							: Promise.resolve(),
						_qc.invalidateQueries({
							queryKey: _trpc.community.projectsList.queryKey(),
						}),
						_qc.invalidateQueries({
							queryKey: _trpc.community.getJobForm.queryKey(),
						}),
					]);
					break;
			}
		} finally {
			setIsRefreshing(false);
		}
	}, [currentTab, isRefreshing, params.projectId, params.unitId]);

	const nextStep = useCallback(() => {
		if (completed) return;
		setStep(initialStep + 1);
	}, [completed, initialStep, setStep]);

	const prevStep = useCallback(() => {
		if (isInstallCostStepActive) {
			setIsInstallCostStepActive(false);
			return;
		}

		if (completed) {
			setCompleted(false);
			return;
		}

		if (initialStep <= 1) {
			const canGoBack =
				typeof (router as any).canGoBack === "function"
					? (router as any).canGoBack()
					: true;
			if (canGoBack) {
				router.back();
			} else {
				router.replace("/" as any);
			}
			return;
		}

		setStep(initialStep - 1);
	}, [
		completed,
		initialStep,
		isInstallCostStepActive,
		params,
		router,
		setStep,
	]);

	const selectUser = useCallback(
		(userId: number) => {
			if (action === "re-assign") {
				if (!params.jobId) {
					Toast.show("Job id is missing for re-assignment.", {
						type: "error",
					});
					return;
				}
				const oldUserId = Number((defaultValues as any)?.user?.id || 0);
				if (!oldUserId) {
					Toast.show("Current assignee is missing.", {
						type: "error",
					});
					return;
				}
				if (oldUserId === userId) {
					Toast.show("This contractor is already assigned.", {
						type: "info",
					});
					return;
				}
				reAssignJob({
					jobId: params.jobId,
					oldUserId,
					newUserId: userId,
				});
				return;
			}
			params.setParams({
				userId,
				step: clamp(initialStep + 1, 1, tabs.length),
			});
		},
		[action, defaultValues, initialStep, params, reAssignJob, tabs.length],
	);

	const selectProject = useCallback(
		(project: { id: number; title?: string; addon?: number }) => {
			// form.setValue("projectId", project.id);
			// form.setValue("title", project.title || "");
			// form.setValue("homeId", null);
			// form.setValue("subtitle", null as any);
			// form.setValue("addon", project?.addon || 0);
			// form.setValue("tasks", {} as any);

			params.setParams({
				projectId: project.id,
				unitId: null,
				modelId: null,
				builderTaskId: null,
				step: clamp(initialStep + 1, 1, tabs.length),
			});
		},
		[initialStep, params, tabs.length],
	);

	const selectTask = useCallback(
		(builderTaskId: number) => {
			params.setParams({
				builderTaskId,
				step: clamp(initialStep + 1, 1, tabs.length),
			});
		},
		[initialStep, params, tabs.length],
	);

	const selectUnit = useCallback(
		(unit: {
			id: number;
			modelId?: number;
			modelName?: string;
			lot?: string | number;
			block?: string | number;
			costing?: Record<string, number | string>;
		}) => {
			const homeId = unit.id === -1 ? null : unit.id;
			// const subtitle = [unit.modelName, `lot:${unit.lot}`, `blk:${unit.block}`]
			//   .filter(Boolean)
			//   .join(" ")
			//   .trim();

			// form.setValue("homeId", homeId as any);
			// form.setValue("subtitle", subtitle || null);

			// const nextTasks = Object.fromEntries(
			//   Object.entries(unit.costing || {})
			//     .filter(([uid, value]) => !!uid && !!value)
			//     .map(([uid, value]) => [
			//       uid,
			//       {
			//         maxQty: +value,
			//         qty: null,
			//         cost: costData?.data?.list?.find((item) => item.uid === uid)
			//           ?.cost,
			//       },
			//     ]),
			// );

			// form.setValue("tasks", nextTasks as any);

			params.setParams({
				unitId: homeId,
				modelId: unit.modelId || null,
				step: clamp(initialStep + 1, 1, tabs.length),
			});
		},
		[costData?.data?.list, initialStep, params, tabs.length],
	);

	const buildSaveJobFormPayload = useCallback(
		(options?: { requestTaskConfig?: boolean }) => {
			if (!defaultValues) return null;
			if (!params.unitId || !resolvedUserId) return null;

			const requestTaskConfig = !!options?.requestTaskConfig;
			const defaultJob = (defaultValues as any)?.job || {};
			const defaultMeta = defaultJob.meta || {};
			const values = form.getValues() as any;
			const formTasks = values?.job?.tasks || [];
			const selectedProject = (projectList || []).find(
				(project: any) => project?.id === params.projectId,
			);
			const selectedUnit = (unitOptions || []).find(
				(unit: any) => unit?.id === params.unitId,
			);
			const selectedTask = (taskOptions || []).find(
				(task: any) => task?.id === params.builderTaskId,
			);
			const fallbackTitle =
				values?.job?.title ||
				defaultJob.title ||
				selectedProject?.title ||
				"Job Request";
			const fallbackSubtitle =
				values?.job?.subtitle ||
				defaultJob.subtitle ||
				[selectedUnit?.modelName, selectedTask?.taskName]
					.filter(Boolean)
					.join(" - ") ||
				null;
			const hasModelConfigured =
				params.modelId !== null && params.modelId !== undefined;
			const isCustom = hasModelConfigured ? !!values?.job?.isCustom : true;

			const tasks = hasModelConfigured
				? (formTasks as any[])
						.map((task) => {
							const modelTaskId = task?.modelTaskId ?? null;
							if (!modelTaskId) return null;
							return {
								id: task?.id ?? undefined,
								modelTaskId,
								rate: Number(task?.rate || 0),
								qty: task?.qty ?? null,
								maxQty: task?.maxQty ?? null,
							};
						})
						.filter(Boolean)
				: [];

			let status =
				values?.job?.status ||
				defaultJob.status ||
				(admin ? "Assigned" : "Started");
			if (isCustom) status = "Submitted";
			if (defaultJob.id && status === "Assigned") status = "Submitted";
			if (!admin && status === "Started") status = "Submitted";
			if (requestTaskConfig) status = "Config Requested";

			return {
				adminMode: admin,
				action: requestTaskConfig ? "request-task-config" : action,
				unit: {
					id: params.unitId,
					projectId: params.projectId!,
				},
				user: {
					id: resolvedUserId,
				},
				builderTaskId: defaultValues.builderTaskId!,
				// modelInstallTaskIds: defaultValues.communityModelInstallTaskIds!,
				requestTaskConfig,
				modelId: params.modelId!,
				job: {
					id: defaultJob.id || undefined,
					amount: total || 0,
					description: values?.job?.description || defaultJob.description || "",
					isCustom,
					adminNote: defaultJob.adminNote ?? null,
					title: fallbackTitle,
					subtitle: fallbackSubtitle,
					status,
					tasks: tasks as any[],
					meta: {
						addon: percentageValue(
							(defaultValues as any)?.unit?.projectAddon || 0,
							values?.job?.meta?.addonPercent ?? defaultMeta.addonPercent ?? 0,
						),
						addonPercent:
							values?.job?.meta?.addonPercent ?? defaultMeta.addonPercent ?? 0,
						additionalCostReason:
							values?.job?.meta?.additionalCostReason ??
							defaultMeta.additionalCostReason ??
							"",
						additional_cost:
							values?.job?.meta?.additional_cost ??
							defaultMeta.additional_cost ??
							null,
					},
				},
			} satisfies JobFormSchema;
		},
		[
			action,
			admin,
			defaultValues,
			form,
			params.modelId,
			params.projectId,
			params.builderTaskId,
			params.unitId,
			projectList,
			resolvedUserId,
			taskOptions,
			total,
			unitOptions,
		],
	);

	const handleSubmit = useCallback(() => {
		form.handleSubmit(
			() => {
				if (!admin) {
					if (isInsuranceStatusPending) {
						Toast.show("Checking insurance status...", {
							type: "info",
						});
						return;
					}
					if (insuranceStatus?.blocking) {
						Toast.show(insuranceStatus.message, {
							type: "error",
						});
						return;
					}
				}
				const payload = buildSaveJobFormPayload();
				if (!payload) {
					Toast.show("Unable to save job right now.", {
						type: "error",
					});
					return;
				}
				// consoleLog("PAYLOAD TASKS", payload.job.tasks);
				// return;
				saveJobForm(payload);
			},
			(formErrors) => {
				setErrors(formErrors);
				Object.entries(formErrors)?.map(([key, error]) =>
					consoleLog("FORM VALIDATION ERRORS", key, error),
				);
				Toast.show("Error. Invalid form data.", {
					type: "error",
				});
			},
		)();
	}, [
		admin,
		buildSaveJobFormPayload,
		form,
		insuranceStatus,
		isInsuranceStatusPending,
		saveJobForm,
	]);

	const requestTaskConfiguration = useCallback(() => {
		// setSavedData(null);
		if (!defaultValues?.builderTaskId) {
			Toast.show("Builder task is required before requesting configuration.", {
				type: "error",
			});
			return;
		}
		if (!params.modelId) {
			Toast.show("Model is required before requesting configuration.", {
				type: "error",
			});
			return;
		}
		if (!admin && !form.getValues("job.description")?.trim()) {
			Toast.show("Add job details before requesting configuration.", {
				type: "error",
			});
			return;
		}
		const payload = buildSaveJobFormPayload({
			requestTaskConfig: true,
		});
		if (!payload) {
			Toast.show("Unable to request configuration right now.", {
				type: "error",
			});
			return;
		}

		saveJobForm(payload);
	}, [
		admin,
		buildSaveJobFormPayload,
		defaultValues?.builderTaskId,
		form,
		params.modelId,
		saveJobForm,
	]);

	const openInstallCostStep = useCallback((builderTaskId?: number | null) => {
		setInstallCostBuilderTaskId(builderTaskId || null);
		setIsInstallCostStepActive(true);
	}, []);

	useEffect(() => {
		if (
			didAutoOpenRequestConfig ||
			!params.modelId ||
			!params.requestBuilderTaskId
		) {
			return;
		}

		openInstallCostStep(params.requestBuilderTaskId);
		setDidAutoOpenRequestConfig(true);
	}, [
		didAutoOpenRequestConfig,
		openInstallCostStep,
		params.modelId,
		params.requestBuilderTaskId,
	]);

	const closeInstallCostStep = useCallback(() => {
		setIsInstallCostStepActive(false);
	}, []);

	const notifyContractorJobReady = useCallback(async () => {
		if (!params.contractorId || !params.jobId) {
			return;
		}

		try {
			await notification.jobTaskConfigured({
				contractorId: params.contractorId,
				jobId: params.jobId,
			});
			Toast.show("Contractor notified: job task is ready.", {
				type: "success",
			});
			params.setParams({
				requestBuilderTaskId: null,
				jobId: null,
			});
		} catch (_error) {
			Toast.show("Unable to notify contractor right now.", {
				type: "error",
			});
		}
	}, [notification, params]);

	const clearRequestTaskConfigurationState = useCallback(() => {
		// setSavedData(null);
	}, []);
	const isConfigRequestedStatus = useMemo(() => {
		return (
			String((defaultValues as any)?.job?.status || "").toLowerCase() ===
			"config requested"
		);
	}, [defaultValues]);

	const reset = useCallback(() => {
		setCompleted(false);
		// setSavedData(null);
		setIsInstallCostStepActive(false);
		form.reset({});
		params.setParams({
			step: 1,
			redirectStep: null,
			projectId: null,
			jobId: null,
			contractorId: null,
			unitId: null,
			builderTaskId: null,
			requestBuilderTaskId: null,
			userId: null,
			modelId: null,
			admin,
			action,
		});
	}, [action, admin, form, params]);

	return {
		admin,
		action,
		state,
		params,
		form,
		formData,
		tabs,
		step: initialStep,
		currentTab,
		completed,
		setCompleted,
		setStep,
		nextStep,
		prevStep,
		total,
		isInstallCostStepActive,
		installCostBuilderTaskId,
		defaultValues,
		isDefaultValuesPending,
		projectList: projectList || [],
		users: users?.data || [],
		isUsersPending,
		taskOptions: taskOptions || [],
		unitOptions: unitOptions || [],
		isProjectsPending,
		isUnitsPending,
		isTasksPending,
		costData: costData?.data,
		selectUser,
		selectProject,
		selectTask,
		selectUnit,
		handleSubmit,
		isSaving,
		isReAssigning,
		insuranceStatus,
		isInsuranceStatusPending,
		isConfigRequestedStatus,
		// savedData,
		isRequestingTaskConfiguration: isSaving,
		// requestTaskConfigurationData: savedData,
		errors,
		hasMissingTaskConfiguration,
		requestTaskConfiguration,
		clearRequestTaskConfigurationState,
		openInstallCostStep,
		closeInstallCostStep,
		notifyContractorJobReady,
		isNotifyingContractor: notification.isPending,
		isRefreshing,
		refreshCurrentStep,
		reset,
	};
}

export function useJobFormV2Context() {
	const context = useContext(JobFormV2Context);
	if (!context) {
		throw new Error(
			"useJobFormV2Context must be used within JobFormV2Provider",
		);
	}

	return context;
}
