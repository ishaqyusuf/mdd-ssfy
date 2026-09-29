if (process.env.GND_ANDROID_PLAY_BUILD_ACK !== "1") {
  console.error("Public Android Play build requires GND_ANDROID_PLAY_BUILD_ACK=1 for this invocation.");
  process.exit(1);
}
