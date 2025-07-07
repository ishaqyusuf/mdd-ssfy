/* -----------------------------------------------------------------------------------------------
 * Edge Runtime
 * -----------------------------------------------------------------------------------------------*/

import { handle } from "hono/vercel";

import { app } from ".";

// export const config = {
//   runtime: "edge",
//   regions: ["bom1"], // Mumbai, India (South) - bom1
// };

// export default handle(app);
const handler = handle(app);
export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const OPTIONS = handler;
/* -----------------------------------------------------------------------------------------------
 * Serverless
 * -----------------------------------------------------------------------------------------------*/

// import { handle } from "@hono/node-server/vercel";

// import { app } from "../src";

// export default handle(app);

/* -----------------------------------------------------------------------------------------------
 * Community Based Bun Runtime
 * -----------------------------------------------------------------------------------------------*/

// Check out the src/bun.ts file for the implementation of this runtime.
