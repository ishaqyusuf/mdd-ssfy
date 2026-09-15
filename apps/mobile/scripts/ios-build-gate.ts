if (process.env.GND_IOS_BUILD_ACK !== "1") {
	console.error(
		"Public iOS store build requires GND_IOS_BUILD_ACK=1 for this invocation.",
	);
	process.exit(1);
}
