/** @jsxImportSource react */
import { Heading, Link, Section, Text } from "@react-email/components";

import {
	StandardEmailButton,
	StandardEmailHeader,
	StandardEmailLayout,
	StandardEmailSignature,
	standardEmailColors,
} from "../components/standard-email";

type EmailLineStyle = {
	heading?: boolean;
};

type EmailTextLine = {
	type: "text";
	text: string;
	style?: EmailLineStyle;
};

type EmailLinkLine = {
	type: "link";
	href: string;
	text: string;
	style?: EmailLineStyle;
};

type EmailTableLine = {
	type: "table";
	lines: EmailLine[][];
	style?: EmailLineStyle;
	bodyStyle?: EmailLineStyle;
	trStyle?: EmailLineStyle;
	tdStyle?: EmailLineStyle;
};

type EmailLine = EmailTextLine | EmailLinkLine | EmailTableLine;
type EmailStack = {
	lines: EmailLine[];
};

type ComposedEmailTemplateProps = {
	emailStack: EmailStack;
	preview: string;
};

const lineKey = (line: EmailLine) =>
	line.type === "table"
		? `table:${JSON.stringify(line.lines)}`
		: `${line.type}:${line.type === "link" ? line.href : ""}:${line.text}`;

function RenderLine({ line }: { line: EmailLine }) {
	if (line.type === "text") {
		return line.style?.heading ? (
			<Heading
				className="gnd-standard-heading m-0 mb-[18px] text-[30px] font-normal leading-[38px]"
				style={{
					color: standardEmailColors.ink,
					fontFamily: "Georgia, 'Times New Roman', serif",
				}}
			>
				{line.text}
			</Heading>
		) : (
			<Text
				className="gnd-standard-text m-0 mb-[14px] text-[15px] leading-[24px]"
				style={{ color: standardEmailColors.ink }}
			>
				{line.text}
			</Text>
		);
	}

	if (line.type === "link") {
		return line.style?.heading ? (
			<StandardEmailButton href={line.href}>{line.text}</StandardEmailButton>
		) : (
			<Link
				className="gnd-standard-accent-text text-[14px] font-semibold leading-[22px]"
				href={line.href}
				style={{ color: standardEmailColors.cypress }}
			>
				{line.text}
			</Link>
		);
	}

	return (
		<table
			cellPadding="0"
			cellSpacing="0"
			style={{ marginBottom: 14, width: "100%" }}
		>
			<tbody>
				{line.lines.map((row) => (
					<tr key={JSON.stringify(row)}>
						{row.map((cell) => (
							<td
								key={lineKey(cell)}
								style={{ padding: "4px 10px 4px 0", verticalAlign: "top" }}
							>
								<RenderLine line={cell} />
							</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	);
}

function RenderStack({ stack }: { stack: EmailStack }) {
	return stack.lines.map((line) => (
		<RenderLine key={lineKey(line)} line={line} />
	));
}

export const composeEmailTemplate = (props: ComposedEmailTemplateProps) => (
	<EmailTemplate {...props} />
);

export function EmailTemplate({
	emailStack,
	preview,
}: ComposedEmailTemplateProps) {
	return (
		<StandardEmailLayout previewText={preview}>
			<StandardEmailHeader
				documentLabel="GND message"
				documentMeta="Direct communication"
			/>

			<Section className="gnd-standard-content px-[36px] pb-[34px] pt-[40px]">
				<RenderStack stack={emailStack} />
			</Section>

			<StandardEmailSignature
				department="Customer operations · GND Millwork"
				senderName="GND Millwork Team"
			/>
		</StandardEmailLayout>
	);
}

EmailTemplate.PreviewProps = {
	preview: "A message from GND",
	emailStack: {
		lines: [
			{
				type: "text",
				text: "A Message from GND",
				style: { heading: true },
			},
			{ type: "text", text: "Hi Jordan," },
			{
				type: "text",
				text: "Your requested information is ready to review.",
			},
			{
				type: "link",
				text: "Open GND Pro Desk",
				href: "https://gndprodesk.com",
				style: { heading: true },
			},
		],
	},
} satisfies ComposedEmailTemplateProps;

export default EmailTemplate;
