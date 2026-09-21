import { createEventsRoute } from "@gnd/events/route";

export const POST = createEventsRoute(
	"web",
	"https://www.gndprodesk.com",
	"gnd-dashboard",
);
