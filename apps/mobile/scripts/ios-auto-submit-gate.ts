if (
	process.env.GND_IOS_BUILD_ACK !== "1" ||
	process.env.GND_IOS_AUTO_UPLOAD_ACK !== "1"
) {
	console.error(
		"Combined iOS build/upload requires separate build and automatic-upload acknowledgments.",
	);
	process.exit(1);
}
