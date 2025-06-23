import type { Database } from "@gnd/db";

export type Context = {
  Variables: {
    db: Database;
    // session: Session;
    // teamId: string;
  };
};
