/** @jsxImportSource react */
import {
	Body,
	Column,
	Container,
	Heading,
	Img,
	Preview,
	Button as ReactEmailButton,
	Row,
	Section,
	Text,
} from "@react-email/components";
import type React from "react";

import { getEmailUrl } from "@gnd/utils/envs";
import { EmailThemeProvider } from "./theme";

const baseUrl = getEmailUrl();

export const standardEmailColors = {
	canvas: "#f1f3ef",
	card: "#fffefa",
	ink: "#17211d",
	muted: "#68736e",
	border: "#d9dfda",
	cypress: "#1f5b4d",
	brass: "#c58b32",
	danger: "#9a3f36",
	soft: "#f6f7f3",
	softDanger: "#f8efed",
	softGreen: "#eaf2ee",
} as const;

const standardEmailCSS = `
  .gnd-standard-canvas,
  .gnd-standard-card,
  .gnd-standard-soft,
  .gnd-standard-table-head,
  .gnd-standard-row,
  .gnd-standard-row-alt,
  .gnd-standard-signature {
    transition: none !important;
  }

  .gnd-standard-panel {
    width: calc(100% - 72px) !important;
  }

  @media only screen and (max-width: 600px) {
    .gnd-standard-canvas {
      padding: 0 !important;
    }
    .gnd-standard-card {
      width: 100% !important;
      margin: 0 !important;
    }
    .gnd-standard-content {
      box-sizing: border-box !important;
      padding-left: 20px !important;
      padding-right: 20px !important;
      width: 100% !important;
    }
    .gnd-standard-panel {
      margin-left: 20px !important;
      margin-right: 20px !important;
      width: calc(100% - 40px) !important;
    }
    .gnd-standard-summary-column {
      display: block !important;
      width: 100% !important;
      padding: 0 0 14px !important;
    }
    .gnd-standard-summary-column:last-child {
      padding-bottom: 0 !important;
    }
    .gnd-standard-hide-mobile {
      display: none !important;
    }
    .gnd-standard-mobile-stack {
      display: block !important;
      width: 100% !important;
    }
    .gnd-standard-mobile-stack + .gnd-standard-mobile-stack {
      padding-top: 10px !important;
    }
  }

  @media (prefers-color-scheme: dark) {
    .gnd-standard-canvas {
      background-color: #101714 !important;
      color: #f3f6f4 !important;
    }
    .gnd-standard-card,
    .gnd-standard-row,
    .gnd-standard-signature {
      background-color: #18211e !important;
    }
    .gnd-standard-soft,
    .gnd-standard-table-head,
    .gnd-standard-row-alt {
      background-color: #202a26 !important;
    }
    .gnd-standard-soft-green {
      background-color: #1a2a24 !important;
    }
    .gnd-standard-soft-danger {
      background-color: #3a211e !important;
    }
    .gnd-standard-text,
    .gnd-standard-heading {
      color: #f3f6f4 !important;
    }
    .gnd-standard-muted {
      color: #aab5b0 !important;
    }
    .gnd-standard-accent-text {
      color: #8ec4b3 !important;
    }
    .gnd-standard-danger-text {
      color: #f0a29a !important;
    }
    .gnd-standard-border {
      border-color: #34433d !important;
    }
    .gnd-standard-brass-border {
      border-left-color: #c58b32 !important;
    }
    .gnd-standard-primary-button {
      background-color: #8ec4b3 !important;
      border-color: #8ec4b3 !important;
      color: #101714 !important;
    }
    .gnd-standard-secondary-button {
      background-color: #18211e !important;
      border-color: #78978b !important;
      color: #d6e8e1 !important;
    }
    .gnd-standard-danger-button {
      background-color: #3a211e !important;
      border-color: #f0a29a !important;
      color: #f0a29a !important;
    }
  }

	[data-ogsc] .gnd-standard-text,
  [data-ogsc] .gnd-standard-heading {
    color: #f3f6f4 !important;
  }
  [data-ogsc] .gnd-standard-muted {
    color: #aab5b0 !important;
  }
  [data-ogsb] .gnd-standard-canvas {
    background-color: #101714 !important;
  }
  [data-ogsb] .gnd-standard-card,
  [data-ogsb] .gnd-standard-row,
  [data-ogsb] .gnd-standard-signature {
    background-color: #18211e !important;
  }
`;

type StandardEmailLayoutProps = {
	children: React.ReactNode;
	previewText: string;
};

export function StandardEmailLayout({
	children,
	previewText,
}: StandardEmailLayoutProps) {
	return (
		<EmailThemeProvider
			additionalHeadContent={<style>{standardEmailCSS}</style>}
			preview={<Preview>{previewText}</Preview>}
		>
			<Body
				className="gnd-standard-canvas m-0 font-sans"
				style={{
					backgroundColor: standardEmailColors.canvas,
					color: standardEmailColors.ink,
					fontFamily: "Geist, Helvetica, Arial, sans-serif",
					margin: 0,
					padding: "32px 0",
				}}
			>
				<Container
					className="gnd-standard-card mx-auto w-full max-w-[640px]"
					style={{
						backgroundColor: standardEmailColors.card,
						border: `1px solid ${standardEmailColors.border}`,
						borderRadius: 8,
						overflow: "hidden",
					}}
				>
					<Section aria-hidden="true">
						<Row>
							<Column
								style={{
									backgroundColor: standardEmailColors.cypress,
									height: 6,
									width: "84%",
								}}
							/>
							<Column
								style={{
									backgroundColor: standardEmailColors.brass,
									height: 6,
									width: "16%",
								}}
							/>
						</Row>
					</Section>
					{children}
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}

type StandardEmailHeaderProps = {
	documentLabel: string;
	documentMeta: string;
};

export function StandardEmailHeader({
	documentLabel,
	documentMeta,
}: StandardEmailHeaderProps) {
	return (
		<Section className="gnd-standard-content px-[36px] pt-[28px]">
			<Row>
				<Column style={{ verticalAlign: "middle", width: "64%" }}>
					<Row>
						<Column style={{ verticalAlign: "middle", width: 44 }}>
							<Img
								alt="GND Millwork"
								height="34"
								src={`${baseUrl}/email/logo.png`}
								style={{ display: "block" }}
								width="34"
							/>
						</Column>
						<Column style={{ verticalAlign: "middle" }}>
							<Text
								className="gnd-standard-text m-0 text-[13px] font-semibold tracking-[1.4px]"
								style={{ color: standardEmailColors.ink }}
							>
								GND MILLWORK
							</Text>
							<Text
								className="gnd-standard-muted m-0 mt-[3px] text-[12px] tracking-[0.4px]"
								style={{ color: standardEmailColors.muted }}
							>
								DESIGN · BUILD · INSTALL
							</Text>
						</Column>
					</Row>
				</Column>
				<Column align="right" style={{ verticalAlign: "middle", width: "36%" }}>
					<Text
						className="gnd-standard-accent-text m-0 text-[12px] font-semibold uppercase tracking-[1.1px]"
						style={{ color: standardEmailColors.cypress }}
					>
						{documentLabel}
					</Text>
					<Text
						className="gnd-standard-muted m-0 mt-[4px] text-[12px]"
						style={{ color: standardEmailColors.muted }}
					>
						{documentMeta}
					</Text>
				</Column>
			</Row>
		</Section>
	);
}

type StandardEmailButtonProps = {
	children: React.ReactNode;
	href: string;
	variant?: "danger" | "primary" | "secondary";
};

export function StandardEmailButton({
	children,
	href,
	variant = "primary",
}: StandardEmailButtonProps) {
	const primary = variant === "primary";
	const danger = variant === "danger";

	return (
		<ReactEmailButton
			className={
				primary
					? "gnd-standard-primary-button"
					: danger
						? "gnd-standard-danger-button"
						: "gnd-standard-secondary-button"
			}
			href={href}
			style={{
				backgroundColor: primary
					? standardEmailColors.cypress
					: danger
						? standardEmailColors.softDanger
						: standardEmailColors.card,
				border: `1px solid ${primary ? standardEmailColors.cypress : danger ? standardEmailColors.danger : "#9eb5ad"}`,
				borderRadius: 5,
				color: primary
					? "#fffefa"
					: danger
						? standardEmailColors.danger
						: standardEmailColors.cypress,
				display: "inline-block",
				fontSize: 14,
				fontWeight: 600,
				letterSpacing: "0.1px",
				padding: "13px 20px",
				textDecoration: "none",
			}}
		>
			{children}
		</ReactEmailButton>
	);
}

type StandardEmailHeroProps = {
	children?: React.ReactNode;
	eyebrow: string;
	recipientName?: string;
	title: string;
};

export function StandardEmailHero({
	children,
	eyebrow,
	recipientName,
	title,
}: StandardEmailHeroProps) {
	return (
		<Section className="gnd-standard-content px-[36px] pt-[40px]">
			<Text
				className="gnd-standard-accent-text m-0 text-[12px] font-semibold uppercase tracking-[1.5px]"
				style={{ color: standardEmailColors.cypress }}
			>
				{eyebrow}
			</Text>
			<Heading
				className="gnd-standard-heading m-0 mt-[12px] text-[32px] font-normal leading-[39px]"
				style={{
					color: standardEmailColors.ink,
					fontFamily: "Georgia, 'Times New Roman', serif",
				}}
			>
				{title}
			</Heading>
			{recipientName ? (
				<Text
					className="gnd-standard-text m-0 mt-[18px] text-[16px] leading-[25px]"
					style={{ color: standardEmailColors.ink }}
				>
					Hi {recipientName},
				</Text>
			) : null}
			{children}
		</Section>
	);
}

type StandardEmailMetricProps = {
	emphasis?: boolean;
	label: string;
	value: string;
};

export function StandardEmailMetric({
	emphasis = false,
	label,
	value,
}: StandardEmailMetricProps) {
	return (
		<Column
			className="gnd-standard-summary-column"
			style={{ paddingRight: 18, verticalAlign: "top", width: "33.33%" }}
		>
			<Text
				className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.8px]"
				style={{ color: standardEmailColors.muted }}
			>
				{label}
			</Text>
			<Text
				className={
					emphasis
						? "gnd-standard-heading m-0 mt-[7px] text-[25px] font-semibold leading-[29px]"
						: "gnd-standard-text m-0 mt-[7px] text-[16px] font-semibold leading-[22px]"
				}
				style={{
					color: emphasis
						? standardEmailColors.cypress
						: standardEmailColors.ink,
					fontFamily: emphasis
						? "Georgia, 'Times New Roman', serif"
						: "Geist, Helvetica, Arial, sans-serif",
				}}
			>
				{value}
			</Text>
		</Column>
	);
}

type StandardEmailSignatureProps = {
	department?: string;
	senderName?: string | null;
};

export function StandardEmailSignature({
	department = "Sales · GND Millwork",
	senderName,
}: StandardEmailSignatureProps) {
	return (
		<Section
			className="gnd-standard-signature gnd-standard-border"
			style={{
				backgroundColor: standardEmailColors.soft,
				borderTop: `1px solid ${standardEmailColors.border}`,
				padding: "26px 36px 28px",
			}}
		>
			<Row>
				<Column style={{ verticalAlign: "top", width: 58 }}>
					<table aria-hidden="true" cellPadding="0" cellSpacing="0">
						<tbody>
							<tr>
								<td
									style={{
										backgroundColor: standardEmailColors.cypress,
										height: 3,
										width: 34,
									}}
								/>
								<td style={{ width: 4 }} />
								<td
									style={{
										backgroundColor: standardEmailColors.brass,
										height: 8,
										width: 8,
									}}
								/>
							</tr>
						</tbody>
					</table>
				</Column>
				<Column>
					<Text
						className="gnd-standard-text m-0 text-[14px] leading-[21px]"
						style={{ color: standardEmailColors.ink }}
					>
						Regards,
					</Text>
					<Text
						className="gnd-standard-text m-0 mt-[8px] text-[15px] font-semibold"
						style={{ color: standardEmailColors.ink }}
					>
						{senderName?.trim() || "GND Millwork Sales Team"}
					</Text>
					<Text
						className="gnd-standard-muted m-0 mt-[3px] text-[12px]"
						style={{ color: standardEmailColors.muted }}
					>
						{department}
					</Text>
				</Column>
			</Row>

			<Text
				className="gnd-standard-muted m-0 mt-[22px] text-[12px] leading-[18px]"
				style={{ color: standardEmailColors.muted }}
			>
				13285 SW 131st St, Miami, FL 33186 · Questions? Reply directly to this
				email.
			</Text>
		</Section>
	);
}
