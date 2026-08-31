/** @jsxImportSource react */
import { Column, Row, Section, Text } from "@react-email/components";
import {
	StandardEmailHeader,
	StandardEmailHero,
	StandardEmailLayout,
	StandardEmailMetric,
	StandardEmailSignature,
	standardEmailColors,
} from "../components/standard-email";

type DispatchNotificationEmailProps = {
	orderNo?: string;
	dispatchId?: number;
	deliveryMode?: "pickup" | "delivery" | "ship";
	dueDate?: Date | string;
	recipientName?: string;
	event?: "assigned" | "created";
};

function formatDueDate(value?: Date | string) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date);
}

function formatDeliveryMode(
	value: DispatchNotificationEmailProps["deliveryMode"],
) {
	if (value === "pickup") return "Customer pickup";
	if (value === "ship") return "Freight shipping";
	return "Local delivery";
}

export function DispatchNotificationEmail({
	orderNo = "-",
	dispatchId = 0,
	deliveryMode = "delivery",
	dueDate,
	recipientName = "Team member",
	event = "assigned",
}: DispatchNotificationEmailProps) {
	const isAssigned = event === "assigned";
	const title = isAssigned ? "A Dispatch Is Ready for You" : "Dispatch Created";
	const formattedDueDate = formatDueDate(dueDate);
	const dispatchReference = dispatchId ? `#${dispatchId}` : "Pending";
	const orderReference = orderNo || "-";

	return (
		<StandardEmailLayout
			previewText={`${isAssigned ? "Dispatch assigned" : "Dispatch created"}: Order ${orderReference}`}
		>
			<StandardEmailHeader
				documentLabel={isAssigned ? "Driver assignment" : "Dispatch record"}
				documentMeta={`Order ${orderReference}`}
			/>

			<StandardEmailHero
				eyebrow={isAssigned ? "Fulfillment assignment" : "Fulfillment update"}
				recipientName={recipientName}
				title={title}
			>
				<Text
					className="gnd-standard-text m-0 mt-[10px] text-[15px] leading-[24px]"
					style={{ color: standardEmailColors.ink }}
				>
					{isAssigned
						? `Dispatch ${dispatchReference} for order ${orderReference} has been assigned to you.`
						: `Dispatch ${dispatchReference} for order ${orderReference} has been created and is ready for coordination.`}
				</Text>
			</StandardEmailHero>

			<Section
				className="gnd-standard-panel gnd-standard-soft-green gnd-standard-border mx-[36px] mt-[28px] rounded-[6px] border border-solid p-[20px]"
				style={{
					backgroundColor: standardEmailColors.softGreen,
					borderColor: standardEmailColors.border,
				}}
			>
				<Row>
					<StandardEmailMetric
						emphasis
						label="Dispatch"
						value={dispatchReference}
					/>
					<StandardEmailMetric label="Order" value={orderReference} />
					<StandardEmailMetric
						label="Service"
						value={formatDeliveryMode(deliveryMode)}
					/>
				</Row>
			</Section>

			<Section
				className="gnd-standard-panel gnd-standard-brass-border gnd-standard-border mx-[36px] mt-[16px] rounded-[6px] border border-solid border-l-[4px] px-[20px] py-[18px]"
				style={{
					borderColor: standardEmailColors.border,
					borderLeftColor: standardEmailColors.brass,
				}}
			>
				<Row>
					<Column
						className="gnd-standard-mobile-stack"
						style={{ verticalAlign: "top", width: "48%" }}
					>
						<Text
							className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.8px]"
							style={{ color: standardEmailColors.muted }}
						>
							Due date
						</Text>
						<Text
							className="gnd-standard-text m-0 mt-[6px] text-[15px] font-semibold leading-[22px]"
							style={{ color: standardEmailColors.ink }}
						>
							{formattedDueDate || "Not scheduled"}
						</Text>
					</Column>
					<Column
						className="gnd-standard-mobile-stack"
						style={{ verticalAlign: "top", width: "52%" }}
					>
						<Text
							className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.8px]"
							style={{ color: standardEmailColors.muted }}
						>
							Next step
						</Text>
						<Text
							className="gnd-standard-text m-0 mt-[6px] text-[14px] leading-[21px]"
							style={{ color: standardEmailColors.ink }}
						>
							{isAssigned
								? "Review the dispatch in GND Workspace and prepare for fulfillment."
								: "Confirm the driver assignment and fulfillment timing in GND Workspace."}
						</Text>
					</Column>
				</Row>
			</Section>

			<Section className="gnd-standard-content px-[36px] pb-[34px] pt-[22px]">
				<Text
					className="gnd-standard-muted m-0 text-[12px] leading-[19px]"
					style={{ color: standardEmailColors.muted }}
				>
					This operational notice contains the current dispatch details. Reply
					to this email if the assignment or timing needs attention.
				</Text>
			</Section>

			<StandardEmailSignature
				department="Fulfillment operations · GND Millwork"
				senderName="GND Millwork Dispatch Team"
			/>
		</StandardEmailLayout>
	);
}

export function DispatchDriver(props: DispatchNotificationEmailProps) {
	return <DispatchNotificationEmail {...props} event="assigned" />;
}

export function DispatchCreatedEmail(props: DispatchNotificationEmailProps) {
	return <DispatchNotificationEmail {...props} event="created" />;
}

DispatchDriver.PreviewProps = {
	orderNo: "GND-10482",
	dispatchId: 2841,
	deliveryMode: "delivery",
	dueDate: "2026-09-03T09:00:00.000Z",
	recipientName: "Alex Morgan",
} satisfies DispatchNotificationEmailProps;

export default DispatchDriver;
