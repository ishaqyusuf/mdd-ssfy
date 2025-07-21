import { exists, mkdir, unlink, cp, readdir, stat } from "node:fs/promises";
import path from "node:path";

// Ex. ./src/main.ts
const mainModulePath = process.argv[2];
async function logDirContents(dirPath: string) {
  try {
    const entries = await readdir(dirPath);

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const fileStat = await stat(fullPath);
    }
  } catch (err) {
    console.error(`❌ Could not read ${dirPath}:`, err.message);
  }
}
await logDirContents("./node_modules/.prisma/client");
await logDirContents("./node_modules/@prisma/client");
// Ensure file exists
if ((await exists(mainModulePath)) !== true) {
  throw new Error(`module not found: ${mainModulePath}`);
}
// await cp(
//   "./node_modules/.prisma/client/libquery_engine-rhel-openssl-1.0.x.so.node",
//   "./.vercel/output/functions/App.func/libquery_engine-rhel-openssl-1.0.x.so.node",
// );
// Get current architecture for build
const arch = process.arch === "arm64" ? "arm64" : "x86_64";

// Bootstrap source should be in same directory as main
const bootstrapSourcePath = mainModulePath.replace(
  /\.(ts|js|cjs|mjs)$/,
  ".bootstrap.ts",
);

// Read in bootstrap source
const bootstrapSource = await Bun.file("./bootstrap.ts")
  .text()
  .catch(() => Bun.file("./bun-vercel/bootstrap.ts").text());

// Write boostrap source to bootstrap file
await Bun.write(
  bootstrapSourcePath,
  bootstrapSource.replace(
    'import main from "./example/main"',
    `import main from "./${mainModulePath.split("/").pop()}"`,
  ),
);

// Create output directory
await mkdir("./.vercel/output/functions/App.func", {
  recursive: true,
});

// Create function config file
await Bun.write(
  "./.vercel/output/functions/App.func/.vc-config.json",
  JSON.stringify(
    {
      architecture: arch,
      handler: "bootstrap",
      maxDuration: 10,
      memory: 1024,
      runtime: "provided.al2",
      supportsWrapper: false,
    },
    null,
    2,
  ),
);

// Create routing config file
await Bun.write(
  "./.vercel/output/config.json",
  JSON.stringify(
    {
      framework: {
        version: Bun.version,
      },
      overrides: {},
      routes: [
        {
          headers: {
            Location: "/$1",
          },
          src: "^(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))/$",
          status: 308,
        },
        {
          handle: "filesystem",
        },
        {
          check: true,
          dest: "App",
          src: "^.*$",
        },
      ],
      version: 3,
    },
    null,
    2,
  ),
);

// Compile to a single bun executable
if (await exists("/etc/system-release")) {
  await Bun.spawnSync({
    cmd: [
      "bun",
      "build",
      bootstrapSourcePath,
      "--compile",
      "--minify",
      "--outfile",
      ".vercel/output/functions/App.func/bootstrap",
    ],
    stdout: "pipe",
  });
} else {
  await Bun.spawnSync({
    cmd: [
      "docker",
      "run",
      "--platform",
      `linux/${arch}`,
      "--rm",
      "-v",
      `${process.cwd()}:/app`,
      "-w",
      "/app",
      "oven/bun",
      "bash",
      "-cl",
      `bun build ${bootstrapSourcePath} --compile --minify --outfile .vercel/output/functions/App.func/bootstrap`,
    ],
    stdout: "pipe",
  });
}

// Cleanup bootstrap file
await unlink(bootstrapSourcePath);
