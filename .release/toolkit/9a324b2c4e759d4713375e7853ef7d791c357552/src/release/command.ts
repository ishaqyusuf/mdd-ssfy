export type ReleaseCommand = "plan" | "status" | "check";

export type ReleaseCommandOptions = {
  command: ReleaseCommand;
  environment: "preview" | "production";
  repoDirectory: string | null;
  manifestPath: string | null;
  baselinesPath: string | null;
  json: boolean;
  committed: boolean;
};

const COMMANDS = new Set<ReleaseCommand>(["plan", "status", "check"]);
const ENVIRONMENTS = new Set(["preview", "production"]);

export function parseReleaseCommandArgs(argv: string[]): ReleaseCommandOptions {
  let command: ReleaseCommand | null = null;
  let environment: ReleaseCommandOptions["environment"] | null = null;
  let repoDirectory: string | null = null;
  let manifestPath: string | null = null;
  let baselinesPath: string | null = null;
  let json = false;
  let committed = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!command && COMMANDS.has(arg as ReleaseCommand)) {
      command = arg as ReleaseCommand;
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--committed") {
      committed = true;
      continue;
    }
    if (["--env", "--repo", "--manifest", "--baselines"].includes(arg ?? "")) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}.`);
      }
      if (arg === "--env") {
        if (environment) throw new Error("--env was supplied more than once.");
        if (!ENVIRONMENTS.has(value)) {
          throw new Error("Use --env preview or --env production.");
        }
        environment = value as ReleaseCommandOptions["environment"];
      } else if (arg === "--repo") {
        if (repoDirectory) throw new Error("--repo was supplied more than once.");
        repoDirectory = value;
      } else if (arg === "--manifest") {
        if (manifestPath) throw new Error("--manifest was supplied more than once.");
        manifestPath = value;
      } else {
        if (baselinesPath) throw new Error("--baselines was supplied more than once.");
        baselinesPath = value;
      }
      index += 1;
      continue;
    }
    throw new Error(`Unknown release argument: ${arg ?? ""}.`);
  }

  if (!command) {
    throw new Error("Use release plan, status, or check.");
  }
  if (!environment) {
    throw new Error("Release commands require --env preview or --env production.");
  }
  if (command === "check" && !committed) committed = true;
  return {
    command,
    environment,
    repoDirectory,
    manifestPath,
    baselinesPath,
    json,
    committed,
  };
}
