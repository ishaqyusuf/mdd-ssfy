import { handle } from "hono/vercel";

// eslint-disable-next-line ts/ban-ts-comment
// @ts-expect-error
// eslint-disable-next-line antfu/no-import-dist
import app from "../src/app.ts";

export default handle(app);
