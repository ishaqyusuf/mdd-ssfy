const workflowRows = [
	["Quotes & orders", "Customer-ready", "#F41F2A"],
	["Production", "Schedule visible", "#405BB0"],
	["Inventory", "Demand connected", "#67717D"],
] as const;

function GndMark() {
	return (
		<div
			style={{
				display: "flex",
				height: 74,
				position: "relative",
				width: 82,
			}}
		>
			<div
				style={{
					borderBottom: "13px solid #F41F2A",
					borderLeft: "13px solid #F41F2A",
					display: "flex",
					height: 51,
					left: 5,
					position: "absolute",
					top: 3,
					transform: "rotate(45deg)",
					width: 51,
				}}
			/>
			<div
				style={{
					borderRight: "13px solid #405BB0",
					borderTop: "13px solid #405BB0",
					bottom: 3,
					display: "flex",
					height: 45,
					position: "absolute",
					right: 5,
					transform: "rotate(45deg)",
					width: 45,
				}}
			/>
		</div>
	);
}

export function SocialPreviewImage() {
	return (
		<div
			style={{
				alignItems: "stretch",
				background: "#F4F6F8",
				color: "#202936",
				display: "flex",
				fontFamily: "Arial, Helvetica, sans-serif",
				height: "100%",
				overflow: "hidden",
				padding: 58,
				position: "relative",
				width: "100%",
			}}
		>
			<div
				style={{
					backgroundImage:
						"linear-gradient(rgba(32,41,54,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(32,41,54,0.05) 1px, transparent 1px)",
					backgroundSize: "38px 38px",
					display: "flex",
					inset: 0,
					position: "absolute",
				}}
			/>
			<div
				style={{
					background: "rgba(64,91,176,0.12)",
					borderRadius: 999,
					display: "flex",
					height: 480,
					position: "absolute",
					right: -180,
					top: -230,
					width: 480,
				}}
			/>

			<div
				style={{
					display: "flex",
					gap: 52,
					position: "relative",
					width: "100%",
				}}
			>
				<div
					style={{
						display: "flex",
						flex: "1 1 0",
						flexDirection: "column",
						justifyContent: "space-between",
						minWidth: 0,
					}}
				>
					<div
						style={{
							alignItems: "center",
							display: "flex",
							gap: 16,
						}}
					>
						<GndMark />
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 4,
							}}
						>
							<div
								style={{
									display: "flex",
									fontSize: 36,
									fontWeight: 900,
								}}
							>
								GND Millwork
							</div>
							<div
								style={{
									color: "#697481",
									display: "flex",
									fontSize: 18,
									fontWeight: 700,
								}}
							>
								Millwork operations workspace
							</div>
						</div>
					</div>

					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 22,
							maxWidth: 670,
						}}
					>
						<div
							style={{
								color: "#405BB0",
								display: "flex",
								fontSize: 23,
								fontWeight: 900,
							}}
						>
							From quote to production
						</div>
						<div
							style={{
								display: "flex",
								fontSize: 68,
								fontWeight: 900,
								letterSpacing: -3,
								lineHeight: 0.98,
							}}
						>
							Millwork operations, connected.
						</div>
						<div
							style={{
								color: "#5F6B78",
								display: "flex",
								fontSize: 27,
								fontWeight: 700,
								lineHeight: 1.3,
							}}
						>
							Quotes, sales, production, inventory, and customer workflows in
							one shared workspace.
						</div>
					</div>

					<div
						style={{
							alignItems: "center",
							display: "flex",
							fontSize: 22,
							fontWeight: 900,
							gap: 12,
						}}
					>
						<div
							style={{
								background: "#F41F2A",
								borderRadius: 999,
								display: "flex",
								height: 11,
								width: 11,
							}}
						/>
						gndprodesk.com
					</div>
				</div>

				<div
					style={{
						alignSelf: "center",
						background: "#FFFFFF",
						border: "1px solid rgba(32,41,54,0.1)",
						borderRadius: 28,
						boxShadow: "0 28px 70px rgba(32,41,54,0.17)",
						display: "flex",
						flex: "0 0 390px",
						flexDirection: "column",
						overflow: "hidden",
					}}
				>
					<div
						style={{
							alignItems: "center",
							background: "#202936",
							color: "#FFFFFF",
							display: "flex",
							justifyContent: "space-between",
							padding: "23px 25px",
						}}
					>
						<div
							style={{
								display: "flex",
								fontSize: 18,
								fontWeight: 900,
							}}
						>
							Operations overview
						</div>
						<div
							style={{
								background: "rgba(255,255,255,0.12)",
								borderRadius: 999,
								display: "flex",
								fontSize: 13,
								fontWeight: 900,
								padding: "7px 11px",
							}}
						>
							GND
						</div>
					</div>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 15,
							padding: 24,
						}}
					>
						{workflowRows.map(([label, detail, accent]) => (
							<div
								key={label}
								style={{
									background: "#F7F8FA",
									border: "1px solid rgba(32,41,54,0.08)",
									borderRadius: 17,
									display: "flex",
									flexDirection: "column",
									gap: 9,
									padding: 18,
								}}
							>
								<div
									style={{
										alignItems: "center",
										display: "flex",
										justifyContent: "space-between",
									}}
								>
									<div
										style={{
											display: "flex",
											fontSize: 17,
											fontWeight: 900,
										}}
									>
										{label}
									</div>
									<div
										style={{
											background: accent,
											borderRadius: 999,
											display: "flex",
											height: 10,
											width: 10,
										}}
									/>
								</div>
								<div
									style={{
										color: "#717B86",
										display: "flex",
										fontSize: 15,
										fontWeight: 700,
									}}
								>
									{detail}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
