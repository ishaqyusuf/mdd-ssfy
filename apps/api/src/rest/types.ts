import { Database } from "@school-clerk/db";

export type Context = {
  Variables: {
    db: Database;
    // session: Session;
    // teamId: string;
  };
};
