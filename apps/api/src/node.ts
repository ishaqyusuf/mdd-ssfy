import { serve } from "@hono/node-server";

import server from ".";

serve(server, (info) => {});
