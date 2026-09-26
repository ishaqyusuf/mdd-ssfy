export type DatabaseTarget =
  | { kind: "none"; url: "" }
  | { databaseName: string; kind: "docker"; url: string }
  | { kind: "external"; url: string };

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

export function classifyManagedDatabaseUrl(
  databaseUrl: string | undefined,
  defaultDatabaseName: string,
  options: { dockerHosts: Set<string>; dockerLocalPorts?: Set<string> },
): DatabaseTarget {
  if (!databaseUrl) {
    return { kind: "none", url: "" };
  }

  try {
    const url = new URL(databaseUrl);
    const hostname = url.hostname;
    const databaseName = url.pathname.replace(/^\//, "") || defaultDatabaseName;

    if (options.dockerHosts.has(hostname)) {
      return { databaseName, kind: "docker", url: databaseUrl };
    }

    if (
      LOCAL_HOSTS.has(hostname) &&
      (!options.dockerLocalPorts || options.dockerLocalPorts.has(url.port))
    ) {
      return { databaseName, kind: "docker", url: databaseUrl };
    }

    return { kind: "external", url: databaseUrl };
  } catch {
    return { kind: "external", url: databaseUrl };
  }
}
