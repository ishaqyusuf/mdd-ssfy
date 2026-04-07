import { Image, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import {
	detailCardStyle,
	detailLabelStyle,
	detailValueStyle,
	eyebrowStyle,
	footerCountStyle,
	footerLabelStyle,
	footerStyle,
	footerTrailingStyle,
	footerValueStyle,
	headerCardStyle,
	headerSubtitleStyle,
	headerTitleStyle,
	headerTopStyle,
	metaCardStyle,
	metaCardTitleStyle,
	metaLineStyle,
	metricCardStyle,
	metricLabelStyle,
	metricValueStyle,
	sectionCardStyle,
	sectionTitleStyle,
} from "./styles";

export function ReportHeader({
	baseUrl,
	title,
	subtitle,
	metaLines,
}: {
	baseUrl?: string;
	title: string;
	subtitle?: string;
	metaLines: { label: string; value: string }[];
}) {
	return (
		<View style={headerCardStyle}>
			<View style={headerTopStyle}>
				<View style={{ width: "62%" }}>
					<Image
						src={`${baseUrl}/logo.png`}
						style={{ width: 128, height: 46, objectFit: "contain" }}
					/>
					<Text style={eyebrowStyle}>GND Contractor Jobs</Text>
					<Text style={headerTitleStyle}>{title}</Text>
					{subtitle ? (
						<Text style={headerSubtitleStyle}>{subtitle}</Text>
					) : null}
				</View>

				<View style={metaCardStyle}>
					<Text style={metaCardTitleStyle}>Document Info</Text>
					{metaLines.map((item) => (
						<MetaLine
							key={item.label}
							label={item.label}
							value={item.value}
							light
						/>
					))}
				</View>
			</View>
		</View>
	);
}

export function FooterTotal({
	label,
	value,
	countLabel,
	trailingLabel,
}: {
	label: string;
	value: string;
	countLabel: string;
	trailingLabel: string;
}) {
	return (
		<View style={footerStyle}>
			<View>
				<Text style={footerLabelStyle}>{label}</Text>
				<Text style={footerValueStyle}>{value}</Text>
			</View>
			<View>
				<Text style={footerCountStyle}>{countLabel}</Text>
				<Text style={footerTrailingStyle}>{trailingLabel}</Text>
			</View>
		</View>
	);
}

export function SectionCard({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<View style={sectionCardStyle}>
			<Text style={sectionTitleStyle}>{title}</Text>
			<View style={{ marginTop: 8 }}>{children}</View>
		</View>
	);
}

export function MetaLine({
	label,
	value,
	light = false,
}: {
	label: string;
	value: string;
	light?: boolean;
}) {
	return (
		<View style={metaLineStyle}>
			<Text
				style={{
					fontSize: 8.5,
					fontWeight: 700,
					color: light ? "rgba(255,255,255,0.72)" : "#334155",
				}}
			>
				{label}
			</Text>
			<Text
				style={{
					fontSize: 8.5,
					color: light ? "#ffffff" : "#0f172a",
					textAlign: "right",
					maxWidth: "62%",
				}}
			>
				{value}
			</Text>
		</View>
	);
}

export function MetricCard({ label, value }: { label: string; value: string }) {
	return (
		<View style={metricCardStyle}>
			<Text style={metricLabelStyle}>{label}</Text>
			<Text style={metricValueStyle}>{value}</Text>
		</View>
	);
}

export function Pill({
	value,
	dark = false,
	subtle = false,
}: {
	value: string;
	dark?: boolean;
	subtle?: boolean;
}) {
	return (
		<View
			style={{
				borderWidth: 1,
				borderColor: dark ? "#17332c" : "#d9d2c7",
				backgroundColor: dark ? "#17332c" : subtle ? "#f8f5ef" : "#ffffff",
				paddingHorizontal: 6,
				paddingVertical: 2,
			}}
		>
			<Text
				style={{
					fontSize: 7.5,
					fontWeight: 700,
					letterSpacing: 0.8,
					textTransform: "uppercase",
					color: dark ? "#ffffff" : "#475569",
				}}
			>
				{value}
			</Text>
		</View>
	);
}

export function DetailCard({
	label,
	value,
}: {
	label: string;
	value: string;
}) {
	return (
		<View style={detailCardStyle}>
			<Text style={detailLabelStyle}>{label}</Text>
			<Text style={detailValueStyle}>{value}</Text>
		</View>
	);
}
