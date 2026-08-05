import type { Database } from "@gnd/db";

export type Context = {
	Variables: {
		db: Database;
		requestId: string;
		// session: Session;
		// teamId: string;
	};
};
