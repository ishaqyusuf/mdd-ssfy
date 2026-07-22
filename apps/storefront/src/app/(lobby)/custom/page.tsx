"use client";

import { Footer } from "@/components/footer";
import { images } from "@/lib/images";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent } from "@gnd/ui/card";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { upload } from "@vercel/blob/client";
import {
	ArrowLeft,
	ArrowRight,
	Check,
	FileText,
	LockKeyhole,
	Paperclip,
	Sparkles,
	Upload,
} from "lucide-react";
import { useMemo, useState } from "react";

const projectOptions = [
	["CUSTOM_DOOR", "Custom doors"],
	["TRIM_MOULDING", "Trim & moulding"],
	["BUILT_INS_CABINETRY", "Built-ins & cabinetry"],
	["WALL_PANELING", "Wall paneling"],
	["STAIR_PARTS", "Stair parts"],
	["OTHER", "Other millwork"],
] as const;

const steps = ["Project", "Details", "Contact", "Review"] as const;
const allowedTypes = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/heic",
	"image/heif",
	"application/pdf",
]);

type ProjectType = (typeof projectOptions)[number][0];
type FormState = {
	projectTypes: ProjectType[];
	propertyType: "RESIDENTIAL" | "COMMERCIAL" | "OTHER";
	city: string;
	state: string;
	postalCode: string;
	dimensions: string;
	styleAndMaterials: string;
	targetDate: string;
	timingFlexible: boolean;
	budget: string;
	fulfillmentNotes: string;
	description: string;
	contactPreference: "EMAIL" | "PHONE" | "EITHER";
	name: string;
	email: string;
	phone: string;
};

const emptyForm: FormState = {
	projectTypes: [],
	propertyType: "RESIDENTIAL",
	city: "",
	state: "",
	postalCode: "",
	dimensions: "",
	styleAndMaterials: "",
	targetDate: "",
	timingFlexible: true,
	budget: "",
	fulfillmentNotes: "",
	description: "",
	contactPreference: "EMAIL",
	name: "",
	email: "",
	phone: "",
};

function safeFilename(filename: string) {
	const cleaned = filename
		.normalize("NFKD")
		.replace(/[^a-zA-Z0-9._-]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
	return cleaned || "project-file";
}

function fieldError(step: number, form: FormState, files: File[]) {
	if (step === 0) {
		if (!form.projectTypes.length) return "Choose at least one project type.";
		if (!form.city.trim() || !form.state.trim() || !form.postalCode.trim()) {
			return "Add the project city, state, and postal code.";
		}
	}
	if (step === 1 && form.description.trim().length < 20) {
		return "Tell us a little more about the project (at least 20 characters).";
	}
	if (step === 2) {
		if (form.name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(form.email)) {
			return "Add your name and a valid email address.";
		}
		if (form.contactPreference === "PHONE" && !form.phone.trim()) {
			return "Add a phone number for phone follow-up.";
		}
		if (files.length > 5) return "You can attach up to five files.";
	}
	return null;
}

function updateProjectType(
	current: ProjectType[],
	projectType: ProjectType,
	checked: boolean,
) {
	return checked
		? [...new Set([...current, projectType])]
		: current.filter((value) => value !== projectType);
}

export default function CustomWorkPage() {
	const trpc = useTRPC();
	const [step, setStep] = useState(0);
	const [form, setForm] = useState<FormState>(emptyForm);
	const [files, setFiles] = useState<File[]>([]);
	const [reference, setReference] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const attachments = useQuery(
		trpc.storefrontCommerce.inquiry.attachmentsEnabled.queryOptions(),
	);
	const start = useMutation(
		trpc.storefrontCommerce.inquiry.startCustom.mutationOptions(),
	);
	const finalize = useMutation(
		trpc.storefrontCommerce.inquiry.finalizeCustom.mutationOptions(),
	);
	const submitting = start.isPending || finalize.isPending || uploading;

	const selectedLabels = useMemo(
		() =>
			projectOptions
				.filter(([value]) => form.projectTypes.includes(value))
				.map(([, label]) => label),
		[form.projectTypes],
	);

	function update<K extends keyof FormState>(key: K, value: FormState[K]) {
		setForm((current) => ({ ...current, [key]: value }));
	}

	function next() {
		const error = fieldError(step, form, files);
		if (error) {
			toast({ title: "A few details are missing", description: error });
			return;
		}
		setStep((current) => Math.min(current + 1, steps.length - 1));
	}

	function selectFiles(list: FileList | null) {
		if (!list) return;
		const nextFiles = Array.from(list);
		const invalid = nextFiles.find(
			(file) => !allowedTypes.has(file.type) || file.size > 10 * 1024 * 1024,
		);
		if (invalid) {
			toast({
				title: "File not supported",
				description:
					"Use JPEG, PNG, WebP, HEIC, or PDF files up to 10 MB each.",
				variant: "destructive",
			});
			return;
		}
		if (nextFiles.length > 5) {
			toast({
				title: "Too many files",
				description: "Choose up to five files.",
			});
			return;
		}
		setFiles(nextFiles);
	}

	async function submit() {
		const error = fieldError(2, form, files);
		if (error) {
			setStep(2);
			toast({ title: "A few details are missing", description: error });
			return;
		}
		try {
			const draft = await start.mutateAsync({
				name: form.name,
				email: form.email,
				phone: form.phone || null,
				website: "",
				brief: {
					projectTypes: form.projectTypes,
					propertyType: form.propertyType,
					city: form.city,
					state: form.state,
					postalCode: form.postalCode,
					dimensions: form.dimensions || null,
					styleAndMaterials: form.styleAndMaterials || null,
					targetDate: form.targetDate || null,
					timingFlexible: form.timingFlexible,
					budget: form.budget || null,
					fulfillmentNotes: form.fulfillmentNotes || null,
					description: form.description,
					contactPreference: form.contactPreference,
				},
			});
			setUploading(Boolean(files.length));
			const uploaded = await Promise.all(
				files.map(async (file) => {
					const pathname = `storefront-inquiries/${draft.id}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
					const blob = await upload(pathname, file, {
						access: "private",
						handleUploadUrl: "/api/storefront/inquiries/upload",
						clientPayload: JSON.stringify({
							inquiryId: draft.id,
							uploadToken: draft.uploadToken,
						}),
					});
					return {
						pathname: blob.pathname,
						url: blob.url,
						filename: file.name,
						contentType: file.type as
							| "image/jpeg"
							| "image/png"
							| "image/webp"
							| "image/heic"
							| "image/heif"
							| "application/pdf",
						size: file.size,
					};
				}),
			);
			setUploading(false);
			const result = await finalize.mutateAsync({
				inquiryId: draft.id,
				uploadToken: draft.uploadToken,
				attachments: uploaded,
			});
			setReference(result.reference || draft.reference);
			toast({
				title: "Project request received",
				description: "Keep your reference number for follow-up.",
				variant: "success",
			});
		} catch (error) {
			setUploading(false);
			toast({
				title: "We could not submit your request",
				description:
					error instanceof Error ? error.message : "Please try again.",
				variant: "destructive",
			});
		}
	}

	return (
		<div className="min-h-screen bg-[#f7f4ee] text-slate-950">
			<main>
				<section className="relative overflow-hidden border-b border-black/10 bg-[#17221d] text-white">
					<div className="absolute inset-0 opacity-35">
						<img
							src={images.categories.customMillwork.images[0]}
							alt=""
							className="h-full w-full object-cover"
						/>
						<div className="absolute inset-0 bg-gradient-to-r from-[#17221d] via-[#17221d]/90 to-[#17221d]/30" />
					</div>
					<div className="container relative mx-auto grid gap-10 px-4 py-16 lg:grid-cols-[1.1fr_.9fr] lg:py-24">
						<div className="max-w-2xl">
							<Badge className="mb-6 bg-white/10 text-white hover:bg-white/10">
								<Sparkles className="mr-2 size-3.5" /> Made for your space
							</Badge>
							<h1 className="font-serif text-5xl leading-[1.02] tracking-tight sm:text-6xl">
								Custom millwork starts with a clear brief.
							</h1>
							<p className="mt-6 max-w-xl text-lg leading-8 text-white/75">
								Tell us what you are building, share measurements or
								inspiration, and our office team will review the request before
								preparing a quote.
							</p>
						</div>
						<div className="self-end rounded-2xl border border-white/15 bg-black/20 p-6 backdrop-blur">
							<p className="text-sm font-medium uppercase tracking-[0.18em] text-amber-300">
								What happens next
							</p>
							<ol className="mt-5 grid gap-4 text-sm text-white/80">
								{[
									"We review the scope and reference files.",
									"A sales rep follows up if details are missing.",
									"Your approved scope becomes a standard GND sales quote.",
								].map((item, index) => (
									<li key={item} className="flex gap-3">
										<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-950">
											{index + 1}
										</span>
										{item}
									</li>
								))}
							</ol>
						</div>
					</div>
				</section>

				<section className="container mx-auto grid gap-10 px-4 py-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-16">
					<Card className="overflow-hidden border-black/10 bg-white shadow-sm">
						<div className="border-b bg-slate-50 px-5 py-5 sm:px-8">
							<div className="grid grid-cols-4 gap-2">
								{steps.map((label, index) => (
									<div key={label} className="min-w-0">
										<div
											className={`h-1.5 rounded-full ${index <= step ? "bg-amber-600" : "bg-slate-200"}`}
										/>
										<p
											className={`mt-2 truncate text-xs ${index === step ? "font-semibold" : "text-muted-foreground"}`}
										>
											{label}
										</p>
									</div>
								))}
							</div>
						</div>
						<CardContent className="p-5 sm:p-8">
							{reference ? (
								<div className="mx-auto max-w-lg py-12 text-center">
									<div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
										<Check className="size-7" />
									</div>
									<h2 className="mt-6 font-serif text-3xl">
										Your request is with our team.
									</h2>
									<p className="mt-3 text-muted-foreground">
										We received the request for {form.email}. Use this reference
										if you contact us.
									</p>
									<p className="mx-auto mt-6 w-fit rounded-lg border bg-slate-50 px-5 py-3 font-mono text-lg font-semibold tracking-wider">
										{reference}
									</p>
									<Button
										className="mt-8"
										variant="outline"
										onClick={() => {
											setForm(emptyForm);
											setFiles([]);
											setReference(null);
											setStep(0);
										}}
									>
										Start another request
									</Button>
								</div>
							) : (
								<>
									{step === 0 ? (
										<div className="space-y-7">
											<div>
												<h2 className="font-serif text-3xl">
													What are you planning?
												</h2>
												<p className="mt-2 text-sm text-muted-foreground">
													Select everything that applies.
												</p>
											</div>
											<div className="grid gap-3 sm:grid-cols-2">
												{projectOptions.map(([value, label]) => (
													<div
														key={value}
														className="flex items-center gap-3 rounded-xl border p-4 hover:bg-slate-50"
													>
														<input
															type="checkbox"
															id={value}
															className="size-4 rounded border-border accent-amber-700"
															checked={form.projectTypes.includes(value)}
															onChange={(event) =>
																update(
																	"projectTypes",
																	updateProjectType(
																		form.projectTypes,
																		value,
																		event.target.checked,
																	),
																)
															}
														/>
														<Label
															htmlFor={value}
															className="flex-1 cursor-pointer"
														>
															{label}
														</Label>
													</div>
												))}
											</div>
											<div className="grid gap-4 sm:grid-cols-2">
												<label className="grid gap-2 text-sm font-medium">
													Property type
													<select
														className="h-10 rounded-md border bg-background px-3"
														value={form.propertyType}
														onChange={(event) =>
															update(
																"propertyType",
																event.target.value as FormState["propertyType"],
															)
														}
													>
														<option value="RESIDENTIAL">Residential</option>
														<option value="COMMERCIAL">Commercial</option>
														<option value="OTHER">Other</option>
													</select>
												</label>
												<div className="grid gap-2">
													<Label htmlFor="city">Project city</Label>
													<Input
														id="city"
														value={form.city}
														onChange={(event) =>
															update("city", event.target.value)
														}
													/>
												</div>
												<div className="grid gap-2">
													<Label htmlFor="state">State</Label>
													<Input
														id="state"
														value={form.state}
														onChange={(event) =>
															update("state", event.target.value)
														}
													/>
												</div>
												<div className="grid gap-2">
													<Label htmlFor="postal">Postal code</Label>
													<Input
														id="postal"
														value={form.postalCode}
														onChange={(event) =>
															update("postalCode", event.target.value)
														}
													/>
												</div>
											</div>
										</div>
									) : null}

									{step === 1 ? (
										<div className="space-y-6">
											<div>
												<h2 className="font-serif text-3xl">
													Shape the scope.
												</h2>
												<p className="mt-2 text-sm text-muted-foreground">
													Rough information is fine—we can clarify details
													together.
												</p>
											</div>
											<div className="grid gap-2">
												<Label htmlFor="description">Project description</Label>
												<Textarea
													id="description"
													rows={6}
													placeholder="What should we make, where will it go, and what matters most?"
													value={form.description}
													onChange={(event) =>
														update("description", event.target.value)
													}
												/>
												<p className="text-xs text-muted-foreground">
													{form.description.trim().length}/20 minimum
												</p>
											</div>
											<div className="grid gap-4 sm:grid-cols-2">
												<div className="grid gap-2">
													<Label htmlFor="dimensions">Dimensions</Label>
													<Textarea
														id="dimensions"
														rows={3}
														placeholder="Opening or overall dimensions"
														value={form.dimensions}
														onChange={(event) =>
															update("dimensions", event.target.value)
														}
													/>
												</div>
												<div className="grid gap-2">
													<Label htmlFor="style">Style and materials</Label>
													<Textarea
														id="style"
														rows={3}
														placeholder="Wood species, finish, inspiration"
														value={form.styleAndMaterials}
														onChange={(event) =>
															update("styleAndMaterials", event.target.value)
														}
													/>
												</div>
												<div className="grid gap-2">
													<Label htmlFor="budget">Working budget</Label>
													<Input
														id="budget"
														placeholder="Optional"
														value={form.budget}
														onChange={(event) =>
															update("budget", event.target.value)
														}
													/>
												</div>
												<div className="grid gap-2">
													<Label htmlFor="targetDate">Target date</Label>
													<Input
														id="targetDate"
														type="date"
														value={form.targetDate}
														onChange={(event) =>
															update("targetDate", event.target.value)
														}
													/>
												</div>
											</div>
											<Label className="flex items-center gap-3">
												<input
													type="checkbox"
													className="size-4 rounded border-border accent-amber-700"
													checked={form.timingFlexible}
													onChange={(event) =>
														update("timingFlexible", event.target.checked)
													}
												/>
												My timing is flexible
											</Label>
											<div className="grid gap-2">
												<Label htmlFor="fulfillment">
													Delivery or pickup notes
												</Label>
												<Textarea
													id="fulfillment"
													rows={3}
													placeholder="Site access, delivery address, or pickup preferences"
													value={form.fulfillmentNotes}
													onChange={(event) =>
														update("fulfillmentNotes", event.target.value)
													}
												/>
											</div>
										</div>
									) : null}

									{step === 2 ? (
										<div className="space-y-6">
											<div>
												<h2 className="font-serif text-3xl">
													How should we reach you?
												</h2>
												<p className="mt-2 text-sm text-muted-foreground">
													Your files are stored privately and are only available
													to authorized staff.
												</p>
											</div>
											<div className="grid gap-4 sm:grid-cols-2">
												<div className="grid gap-2">
													<Label htmlFor="name">Name</Label>
													<Input
														id="name"
														autoComplete="name"
														value={form.name}
														onChange={(event) =>
															update("name", event.target.value)
														}
													/>
												</div>
												<div className="grid gap-2">
													<Label htmlFor="email">Email</Label>
													<Input
														id="email"
														type="email"
														autoComplete="email"
														value={form.email}
														onChange={(event) =>
															update("email", event.target.value)
														}
													/>
												</div>
												<div className="grid gap-2">
													<Label htmlFor="phone">Phone</Label>
													<Input
														id="phone"
														type="tel"
														autoComplete="tel"
														value={form.phone}
														onChange={(event) =>
															update("phone", event.target.value)
														}
													/>
												</div>
												<label className="grid gap-2 text-sm font-medium">
													Preferred follow-up
													<select
														className="h-10 rounded-md border bg-background px-3"
														value={form.contactPreference}
														onChange={(event) =>
															update(
																"contactPreference",
																event.target
																	.value as FormState["contactPreference"],
															)
														}
													>
														<option value="EMAIL">Email</option>
														<option value="PHONE">Phone</option>
														<option value="EITHER">Either</option>
													</select>
												</label>
											</div>
											{attachments.data?.enabled ? (
												<div className="rounded-xl border border-dashed p-5">
													<div className="flex items-start gap-3">
														<Upload className="mt-0.5 size-5 text-amber-700" />
														<div>
															<Label
																htmlFor="files"
																className="cursor-pointer font-semibold"
															>
																Add drawings or inspiration
															</Label>
															<p className="mt-1 text-xs text-muted-foreground">
																Up to 5 private JPEG, PNG, WebP, HEIC, or PDF
																files. 10 MB each.
															</p>
														</div>
													</div>
													<Input
														id="files"
														className="mt-4"
														type="file"
														multiple
														accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
														onChange={(event) =>
															selectFiles(event.target.files)
														}
													/>
													{files.length ? (
														<div className="mt-4 grid gap-2">
															{files.map((file) => (
																<div
																	key={`${file.name}-${file.size}`}
																	className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm"
																>
																	<Paperclip className="size-4" />
																	<span className="truncate">{file.name}</span>
																	<span className="ml-auto text-xs text-muted-foreground">
																		{(file.size / 1024 / 1024).toFixed(1)} MB
																	</span>
																</div>
															))}
														</div>
													) : null}
												</div>
											) : (
												<div className="rounded-lg border bg-slate-50 p-4 text-sm text-muted-foreground">
													Attachments are temporarily unavailable. You can
													submit the brief now and share files when our team
													follows up.
												</div>
											)}
										</div>
									) : null}

									{step === 3 ? (
										<div className="space-y-6">
											<div>
												<h2 className="font-serif text-3xl">
													Review your brief.
												</h2>
												<p className="mt-2 text-sm text-muted-foreground">
													Nothing is quoted or ordered until an office team
													member reviews the request with you.
												</p>
											</div>
											<div className="grid gap-4 rounded-xl border bg-slate-50 p-5 text-sm sm:grid-cols-2">
												<div>
													<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
														Project
													</p>
													<p className="mt-1 font-medium">
														{selectedLabels.join(", ")}
													</p>
												</div>
												<div>
													<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
														Location
													</p>
													<p className="mt-1 font-medium">
														{form.city}, {form.state} {form.postalCode}
													</p>
												</div>
												<div className="sm:col-span-2">
													<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
														Description
													</p>
													<p className="mt-1 whitespace-pre-wrap">
														{form.description}
													</p>
												</div>
												<div>
													<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
														Contact
													</p>
													<p className="mt-1">
														{form.name}
														<br />
														{form.email}
														{form.phone ? (
															<>
																<br />
																{form.phone}
															</>
														) : null}
													</p>
												</div>
												<div>
													<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
														Files
													</p>
													<p className="mt-1">
														{files.length
															? `${files.length} private attachment${files.length === 1 ? "" : "s"}`
															: "No attachments"}
													</p>
												</div>
											</div>
											<div className="flex items-center gap-2 text-xs text-muted-foreground">
												<LockKeyhole className="size-4" />
												Attachments are never exposed as public storefront
												files.
											</div>
										</div>
									) : null}

									<div className="mt-8 flex items-center justify-between border-t pt-6">
										<Button
											variant="ghost"
											disabled={step === 0 || submitting}
											onClick={() => setStep((current) => current - 1)}
										>
											<ArrowLeft className="mr-2 size-4" />
											Back
										</Button>
										{step < 3 ? (
											<Button onClick={next}>
												Continue
												<ArrowRight className="ml-2 size-4" />
											</Button>
										) : (
											<Button
												disabled={submitting}
												onClick={() => void submit()}
											>
												{submitting
													? uploading
														? "Uploading files…"
														: "Submitting…"
													: "Submit project request"}
											</Button>
										)}
									</div>
								</>
							)}
						</CardContent>
					</Card>

					<aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
						<div className="rounded-2xl bg-[#c96f35] p-6 text-white">
							<FileText className="size-6" />
							<h2 className="mt-5 font-serif text-2xl">
								A better first conversation
							</h2>
							<p className="mt-3 text-sm leading-6 text-white/80">
								Measurements, photos, and constraints help the office team route
								your request and prepare useful questions.
							</p>
						</div>
						<div className="rounded-2xl border border-black/10 bg-white p-6">
							<p className="text-sm font-semibold">Helpful to include</p>
							<ul className="mt-4 grid gap-3 text-sm text-muted-foreground">
								{[
									"Opening or overall dimensions",
									"Wood species or finish preferences",
									"Reference photos or sketches",
									"Target date and site constraints",
								].map((item) => (
									<li key={item} className="flex gap-2">
										<Check className="mt-0.5 size-4 text-emerald-700" />
										{item}
									</li>
								))}
							</ul>
						</div>
					</aside>
				</section>
			</main>
			<Footer />
		</div>
	);
}
