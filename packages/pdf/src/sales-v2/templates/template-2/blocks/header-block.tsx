import type {
	AddressBlock,
	CompanyAddress,
	PageMeta,
} from "@gnd/sales/print/types";
import { Image, Text, View } from "@react-pdf/renderer";

// ─── Design tokens ─────────────────────────────────────────
const NAVY = "#1a2e4a";
const ACCENT = "#2563eb";
const LIGHT_BG = "#f0f4fa";
const BORDER = "#d1dae8";
const TEXT_MUTED = "#64748b";

interface HeaderBlockProps {
	meta: PageMeta;
	billing: AddressBlock | null;
	shipping: AddressBlock | null;
	companyAddress: CompanyAddress;
	baseUrl?: string;
	logoUrl?: string;
	qrCodeDataUrl?: string;
}

export function HeaderBlock({
	meta,
	billing,
	shipping,
	companyAddress,
	baseUrl,
	logoUrl,
	qrCodeDataUrl,
}: HeaderBlockProps) {
	const logoSrc = logoUrl || `${baseUrl}/logo.png`;
	const isQuote = meta.title === "Quote";

	return (
		<View>
			{/* Top accent bar */}
			<View
				style={{
					height: 4,
					backgroundColor: ACCENT,
					marginBottom: 16,
					borderRadius: 2,
				}}
			/>

			{/* Company info + invoice meta row */}
			<View
				style={{
					flexDirection: "row",
					alignItems: "flex-start",
					marginBottom: 16,
				}}
			>
				{/* Left: Logo + address */}
				<View style={{ flex: 1 }}>
					<Image
						src={logoSrc}
						style={{
							width: 140,
							height: 70,
							objectFit: "contain",
							marginBottom: 8,
						}}
					/>
					<Text style={{ fontSize: 8, color: TEXT_MUTED, marginBottom: 1 }}>
						{companyAddress.address1}
					</Text>
					{companyAddress.address2 ? (
						<Text style={{ fontSize: 8, color: TEXT_MUTED, marginBottom: 1 }}>
							{companyAddress.address2}
						</Text>
					) : null}
					<Text style={{ fontSize: 8, color: TEXT_MUTED, marginBottom: 1 }}>
						{companyAddress.phone}
					</Text>
					{companyAddress.fax ? (
						<Text style={{ fontSize: 8, color: TEXT_MUTED, marginBottom: 1 }}>
							Fax: {companyAddress.fax}
						</Text>
					) : null}
					<Text style={{ fontSize: 8, color: TEXT_MUTED }}>
						support@gndmillwork.com
					</Text>
				</View>

				{/* Right: Invoice badge + details */}
				<View style={{ width: qrCodeDataUrl ? 160 : 200 }}>
					{/* Invoice title badge */}
					<View
						style={{
							backgroundColor: NAVY,
							paddingVertical: 6,
							paddingHorizontal: 12,
							borderRadius: 4,
							marginBottom: 10,
							alignItems: "flex-end",
						}}
					>
						<Text
							style={{
								color: "#ffffff",
								fontSize: 16,
								fontWeight: 700,
								textTransform: "uppercase",
								letterSpacing: 1,
							}}
						>
							{meta.title}
						</Text>
					</View>

					{/* Detail rows */}
					<MetaRow
						label={isQuote ? "Quote #" : "Order #"}
						value={meta.salesNo}
						bold
					/>
					<MetaRow
						label={isQuote ? "Quote Date" : "Order Date"}
						value={meta.date}
					/>
					{meta.rep && <MetaRow label="Rep" value={meta.rep} />}
					{meta.goodUntil && (
						<MetaRow label="Good Until" value={meta.goodUntil} />
					)}
					{meta.po && <MetaRow label="P.O No" value={meta.po} />}
					{meta.balanceDue && (
						<MetaRow label="Balance Due" value={meta.balanceDue} bold accent />
					)}
					{meta.dueDate && <MetaRow label="Due Date" value={meta.dueDate} />}
					{meta.paymentDate && <PaidBadge date={meta.paymentDate} />}
				</View>

				{qrCodeDataUrl ? (
					<View
						style={{
							width: 112,
							marginLeft: 12,
							borderWidth: 1,
							borderColor: BORDER,
							borderRadius: 6,
							padding: 8,
							backgroundColor: LIGHT_BG,
						}}
					>
						<Text
							style={{
								fontSize: 6.5,
								color: TEXT_MUTED,
								textAlign: "center",
								marginBottom: 4,
							}}
						>
							Scan to preview, print, or open order
						</Text>
						<Image
							src={qrCodeDataUrl}
							style={{ width: 84, height: 84, alignSelf: "center" }}
						/>
						<Text
							style={{
								fontSize: 6.5,
								color: TEXT_MUTED,
								textAlign: "center",
								marginTop: 4,
							}}
						>
							{meta.salesNo}
						</Text>
					</View>
				) : null}
			</View>

			{/* Billing / Shipping address cards */}
			<View style={{ flexDirection: "row", gap: 8 }}>
				{[
					{ addr: billing, title: "Bill To" },
					{ addr: shipping, title: "Ship To" },
				].map(({ addr, title }, i) =>
					addr ? (
						<View
							key={title}
							style={{
								flex: 1,
								backgroundColor: LIGHT_BG,
								borderRadius: 4,
								borderWidth: 1,
								borderColor: BORDER,
								overflow: "hidden",
							}}
						>
							<View
								style={{
									backgroundColor: NAVY,
									paddingVertical: 3,
									paddingHorizontal: 8,
								}}
							>
								<Text
									style={{
										fontSize: 8,
										fontWeight: 700,
										color: "#ffffff",
										textTransform: "uppercase",
										letterSpacing: 0.5,
									}}
								>
									{title}
								</Text>
							</View>
							<View style={{ padding: 8 }}>
								{addr.lines.map((line) => (
									<Text
										key={line}
										style={{ fontSize: 8, color: "#1e293b", marginBottom: 1 }}
									>
										{line}
									</Text>
								))}
							</View>
						</View>
					) : (
						<View key={`empty-${title}`} style={{ flex: 1 }} />
					),
				)}
			</View>
		</View>
	);
}

// ─── Helpers ───────────────────────────────────────────────

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
		<View
			style={{
				flexDirection: "row",
				justifyContent: "space-between",
				borderBottomWidth: 1,
				borderBottomColor: BORDER,
				paddingVertical: 2,
				paddingHorizontal: 4,
			}}
		>
			<Text style={{ fontSize: 8, color: TEXT_MUTED }}>{label}</Text>
			<Text
				style={{
					fontSize: bold ? 9 : 8,
					fontWeight: bold ? 700 : 400,
					color: accent ? ACCENT : "#1e293b",
				}}
			>
				{value}
			</Text>
		</View>
	);
}

function PaidBadge({ date }: { date: string }) {
	return (
		<View
			style={{
				marginTop: 6,
				paddingVertical: 4,
				paddingHorizontal: 8,
				backgroundColor: "#dcfce7",
				borderRadius: 4,
				borderWidth: 1,
				borderColor: "#16a34a",
				alignItems: "center",
			}}
		>
			<Text style={{ fontSize: 10, fontWeight: 700, color: "#15803d" }}>
				PAID
			</Text>
			<Text style={{ fontSize: 7, color: "#15803d" }}>{date}</Text>
		</View>
	);
}
