"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("prisma/config");
require("dotenv/config");
exports.default = (0, config_1.defineConfig)({
    schema: "src/schema",
    migrations: {
        path: "src/migrations",
        seed: "tsx prisma/seed.ts",
    },
    // engine: "classic",
    datasource: {
        url: (0, config_1.env)("DATABASE_URL"),
    },
});
