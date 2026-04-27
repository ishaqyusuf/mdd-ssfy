import type {
	AddressBlock,
	CellHeader,
	CompanyAddress,
	FooterData,
	PrintPage,
	PrintSection,
	PrintSigningData,
	RowCell,
} from "@gnd/sales/print/types";
import type { CSSProperties } from "react";
import { resolveDocumentImageSrc, resolveImageSrc } from "./utils";

const COLORS = {
	navy: "#1a2e4a",
	accent: "#2563eb",
	border: "#d1dae8",
	lightBg: "#f0f4fa",
	muted: "#64748b",
	text: "#1e293b",
	danger: "#dc2626",
};

export function SalesHtmlTemplatePage({
	page,
	companyAddress,
	baseUrl,
	logoUrl,
	previewUrl,
	qrCodeDataUrl,
	variant = "template-2",
}: {
	page: PrintPage;
	companyAddress: CompanyAddress;
	baseUrl?: string;
	logoUrl?: string;
	previewUrl?: string;
	qrCodeDataUrl?: string;
	variant?: "template-1" | "template-2";
}) {
	const pageStyle =
		variant === "template-1"
			? {
					padding: 20,
					border: `1px solid ${COLORS.border}`,
					background: "#fff",
				}
			: {
					padding: 24,
					border: `1px solid ${COLORS.border}`,
					borderRadius: 20,
					background: "#fff",
					boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
				};

	return (
		<article style={pageStyle}>
			<HeaderBlock
				meta={page.meta}
				billing={page.billing}
				shipping={page.shipping}
				companyAddress={companyAddress}
				baseUrl={baseUrl}
				logoUrl={logoUrl}
				variant={variant}
				previewUrl={previewUrl}
				qrCodeDataUrl={qrCodeDataUrl}
			/>

			<div style={{ display: "grid", gap: 12 }}>
				{page.sections.map((section) => (
					<SectionBlock
						key={`${section.kind}-${section.index}`}
						section={section}
						baseUrl={baseUrl}
						showImages={page.config.showImages}
						variant={variant}
					/>
				))}
			</div>

			{page.footer ? (
				<div style={{ marginTop: 16 }}>
					<FooterBlock footer={page.footer} variant={variant} />
				</div>
			) : null}

			{page.config.showSignature ? (
				<div style={{ marginTop: 16 }}>
					<SignatureBlock signing={page.signing} baseUrl={baseUrl} />
				</div>
			) : null}
		</article>
	);
}

function HeaderBlock({
	meta,
	billing,
	shipping,
	companyAddress,
	baseUrl,
	logoUrl,
	variant,
	previewUrl,
	qrCodeDataUrl,
}: {
	meta: PrintPage["meta"];
	billing: AddressBlock | null;
	shipping: AddressBlock | null;
	companyAddress: CompanyAddress;
	baseUrl?: string;
	logoUrl?: string;
	variant: "template-1" | "template-2";
	previewUrl?: string;
	qrCodeDataUrl?: string;
}) {
	const logoSrc = logoUrl || (baseUrl ? `${baseUrl}/logo.png` : "/logo.png");
	const isQuote = meta.title === "Quote";

	return (
		<header style={{ marginBottom: 16 }}>
			<div
				style={{
					height: 4,
					background: COLORS.accent,
					borderRadius: 999,
					marginBottom: 16,
				}}
			/>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: previewUrl ? "1fr 220px 120px" : "1fr 220px",
					gap: 16,
					alignItems: "start",
				}}
			>
				<div>
					<img
						src={logoSrc}
						alt="GND"
						style={{
							width: 140,
							height: 70,
							objectFit: "contain",
							marginBottom: 8,
						}}
					/>
					<AddressLines lines={companyAddressToLines(companyAddress)} />
				</div>

				<div>
					<div
						style={{
							background: COLORS.navy,
							color: "#fff",
							padding: "8px 12px",
							borderRadius: variant === "template-2" ? 8 : 0,
							textAlign: "right",
							marginBottom: 10,
							fontSize: 16,
							fontWeight: 700,
							textTransform: "uppercase",
							letterSpacing: 1,
						}}
					>
						{meta.title}
					</div>
					<MetaRow
						label={isQuote ? "Quote #" : "Order #"}
						value={meta.salesNo}
						bold
					/>
					<MetaRow
						label={isQuote ? "Quote Date" : "Order Date"}
						value={meta.date}
					/>
					{meta.rep ? <MetaRow label="Rep" value={meta.rep} /> : null}
					{meta.goodUntil ? (
						<MetaRow label="Good Until" value={meta.goodUntil} />
					) : null}
					{meta.po ? <MetaRow label="P.O No" value={meta.po} /> : null}
					{meta.balanceDue ? (
						<MetaRow label="Balance Due" value={meta.balanceDue} bold accent />
					) : null}
					{meta.dueDate ? (
						<MetaRow label="Due Date" value={meta.dueDate} />
					) : null}
					{meta.paymentDate ? (
						<div
							style={{
								marginTop: 8,
								padding: "8px 10px",
								borderRadius: 8,
								border: "1px solid #16a34a",
								background: "#dcfce7",
								textAlign: "center",
							}}
						>
							<div style={{ color: "#15803d", fontWeight: 700, fontSize: 12 }}>
								PAID
							</div>
							<div style={{ color: "#15803d", fontSize: 11 }}>
								{meta.paymentDate}
							</div>
						</div>
					) : null}
				</div>

				{previewUrl && qrCodeDataUrl ? (
					<img
						src={qrCodeDataUrl}
						alt="Document QR"
						style={{ width: 104, height: 104, display: "block" }}
					/>
				) : null}
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: billing || shipping ? "1fr 1fr" : "1fr",
					gap: 8,
					marginTop: 16,
				}}
			>
				{billing ? (
					<AddressCard title="Bill To" lines={billing.lines} />
				) : (
					<div />
				)}
				{shipping ? (
					<AddressCard title="Ship To" lines={shipping.lines} />
				) : (
					<div />
				)}
			</div>
		</header>
	);
}

function AddressCard({ title, lines }: { title: string; lines: string[] }) {
	return (
		<div
			style={{
				border: `1px solid ${COLORS.border}`,
				borderRadius: 8,
				overflow: "hidden",
				background: COLORS.lightBg,
			}}
		>
			<div
				style={{
					background: COLORS.navy,
					color: "#fff",
					padding: "4px 8px",
					fontSize: 11,
					fontWeight: 700,
					textTransform: "uppercase",
				}}
			>
				{title}
			</div>
			<AddressLines lines={lines} padded />
		</div>
	);
}

function AddressLines({
	lines,
	padded = false,
}: {
	lines: string[];
	padded?: boolean;
}) {
	return (
		<div style={padded ? { padding: 8 } : undefined}>
			{lines.map((line, index) => (
				<div key={line} style={{ fontSize: 12, color: COLORS.muted }}>
					{line}
				</div>
			))}
		</div>
	);
}

function MetaRow({
	label,
	value,
	bold,
	accent,
}: {
	label: string;
	value?: string;
	bold?: boolean;
	accent?: boolean;
}) {
	return (
		<div
			style={{
				display: "flex",
				justifyContent: "space-between",
				gap: 12,
				borderBottom: `1px solid ${COLORS.border}`,
				padding: "4px 0",
				fontSize: 12,
			}}
		>
			<span style={{ color: COLORS.muted }}>{label}</span>
			<span
				style={{
					color: accent ? COLORS.accent : COLORS.text,
					fontWeight: bold ? 700 : 500,
				}}
			>
				{value}
			</span>
		</div>
	);
}

function SectionBlock({
	section,
	baseUrl,
	showImages,
	variant,
}: {
	section: PrintSection;
	baseUrl?: string;
	showImages: boolean;
	variant: "template-1" | "template-2";
}) {
	const hasDetails = "details" in section && Array.isArray(section.details);

	return (
		<section
			style={{
				border:
					variant === "template-2" ? `1px solid ${COLORS.border}` : undefined,
				borderRadius: variant === "template-2" ? 10 : 0,
				overflow: "hidden",
			}}
		>
			<div
				style={{
					background: COLORS.navy,
					color: "#fff",
					padding: "8px 12px",
					fontSize: 13,
					fontWeight: 700,
					textTransform: "uppercase",
				}}
			>
				{section.title}
			</div>
			{hasDetails ? (
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: 12,
						padding: "10px 12px 0",
						fontSize: 12,
					}}
				>
					{section.details.map((detail, index) => (
						<div key={`${detail.label}-${index}`}>
							<span style={{ color: COLORS.muted }}>{detail.label}: </span>
							<span style={{ color: COLORS.text, fontWeight: 600 }}>
								{detail.value}
							</span>
						</div>
					))}
				</div>
			) : null}
			<div style={{ overflowX: "auto", padding: "10px 12px 12px" }}>
				<table
					style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
				>
					<thead>
						<tr>
							{section.headers.map((header, index) => (
								<th
									key={`${header.title}-${index}`}
									style={headerCellStyle(header)}
									colSpan={header.colSpan || 1}
								>
									{header.title}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{section.rows.map((row, rowIndex) => (
							<tr key={`${section.kind}-${section.index}-${rowIndex}`}>
								{row.cells.map((cell, cellIndex) => (
									<td
										key={`${section.kind}-${rowIndex}-${cellIndex}`}
										colSpan={cell.colSpan || 1}
										style={bodyCellStyle(cell, rowIndex)}
									>
										<div
											style={{ display: "flex", alignItems: "center", gap: 8 }}
										>
											{showImages && cell.image ? (
												<img
													src={
														resolveImageSrc(cell.image, baseUrl) || undefined
													}
													alt=""
													style={{
														width: 36,
														height: 36,
														objectFit: "cover",
														borderRadius: 6,
														border: `1px solid ${COLORS.border}`,
														flexShrink: 0,
													}}
												/>
											) : null}
											<span>
												{cell.value == null ? "" : String(cell.value)}
											</span>
										</div>
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}

function FooterBlock({
	footer,
	variant,
}: {
	footer: FooterData;
	variant: "template-1" | "template-2";
}) {
	const notes = footer.notes.length ? footer.notes : [];
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "1fr 240px",
				gap: 12,
				borderTop: `1px solid ${COLORS.border}`,
				paddingTop: 12,
			}}
		>
			<div>
				{notes.map((note, index) => (
					<div
						key={note}
						style={{
							color: COLORS.danger,
							fontSize: 11,
							marginBottom: 4,
							fontStyle: index === 0 ? "italic" : "normal",
						}}
					>
						{note}
					</div>
				))}
			</div>
			<div
				style={{
					border: `1px solid ${COLORS.border}`,
					borderRadius: variant === "template-2" ? 8 : 0,
					overflow: "hidden",
				}}
			>
				{footer.lines.map((line, index) => {
					const isLast = index === footer.lines.length - 1;
					return (
						<div
							key={`${line.label}-${index}`}
							style={{
								display: "flex",
								justifyContent: "space-between",
								gap: 12,
								padding: isLast ? "10px 12px" : "8px 12px",
								background: isLast
									? COLORS.navy
									: index % 2 === 0
										? COLORS.lightBg
										: "#fff",
								color: isLast ? "#fff" : COLORS.text,
								borderBottom: isLast ? "none" : `1px solid ${COLORS.border}`,
								fontSize: isLast ? 14 : 12,
								fontWeight: line.bold || isLast ? 700 : 500,
							}}
						>
							<span>{line.label}</span>
							<span>{line.value}</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function SignatureBlock({
	signing,
	baseUrl,
}: {
	signing?: PrintSigningData | null;
	baseUrl?: string;
}) {
	const signatureUrl = resolveDocumentImageSrc(signing?.signatureUrl, baseUrl);
	return (
		<div style={{ padding: "4px 8px" }}>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr 1fr",
					gap: 16,
					alignItems: "end",
				}}
			>
				<SignatureField label="Customer Signature" imageUrl={signatureUrl} />
				<div />
				<SignatureField
					label="Date"
					text={
						signing?.signedAt
							? new Date(signing.signedAt).toLocaleDateString("en-US")
							: null
					}
				/>
			</div>
			{signing?.receivedBy ? (
				<div style={{ fontSize: 12, color: COLORS.text, marginTop: 8 }}>
					Received by: {signing.receivedBy}
				</div>
			) : null}
			{signing?.packedBy ? (
				<div style={{ fontSize: 12, color: COLORS.text, marginTop: 4 }}>
					Packed by: {signing.packedBy}
				</div>
			) : null}
		</div>
	);
}

function SignatureField({
	label,
	imageUrl,
	text,
}: {
	label: string;
	imageUrl?: string | null;
	text?: string | null;
}) {
	return (
		<div>
			<div
				style={{
					minHeight: 52,
					borderBottom: `1px dashed ${COLORS.border}`,
					display: "flex",
					alignItems: "end",
				}}
			>
				{imageUrl ? (
					<img
						src={imageUrl}
						alt={label}
						style={{ maxWidth: "100%", maxHeight: 44, objectFit: "contain" }}
					/>
				) : text ? (
					<span
						style={{
							fontSize: 24,
							fontFamily: '"GreatVibes", cursive',
						}}
					>
						{text}
					</span>
				) : null}
			</div>
			<div
				style={{
					fontSize: 11,
					color: COLORS.muted,
					fontStyle: "italic",
					marginTop: 4,
				}}
			>
				{label}
			</div>
		</div>
	);
}

function headerCellStyle(header: CellHeader): CSSProperties {
	return {
		textAlign: header.align || "left",
		fontSize: 11,
		color: COLORS.muted,
		fontWeight: 700,
		padding: "8px 6px",
		borderBottom: `1px solid ${COLORS.border}`,
		textTransform: "uppercase",
		background: COLORS.lightBg,
	};
}

function bodyCellStyle(cell: RowCell, rowIndex: number): CSSProperties {
	return {
		textAlign: cell.align || "left",
		fontWeight: cell.bold ? 700 : 400,
		padding: "8px 6px",
		borderBottom: `1px solid ${COLORS.border}`,
		background: rowIndex % 2 === 0 ? "#fff" : "#f8fafc",
		color: COLORS.text,
		verticalAlign: "top",
	};
}

function companyAddressToLines(companyAddress: CompanyAddress) {
	return [
		companyAddress.address1,
		companyAddress.address2,
		companyAddress.phone,
		companyAddress.fax ? `Fax: ${companyAddress.fax}` : null,
		"support@gndmillwork.com",
	].filter(Boolean) as string[];
}
