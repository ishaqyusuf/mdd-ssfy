type UpstashCommandValue = string | number;

type UpstashRestResponse<T> = {
  result?: T;
  error?: string;
};

function resolveUpstashRestConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  return {
    url: url.replace(/\/$/, ""),
    token,
  };
}

export function hasUpstashRestConfig(): boolean {
  return Boolean(resolveUpstashRestConfig());
}

export async function sendUpstashRestCommand<T>(
  command: UpstashCommandValue[],
): Promise<T | null> {
  const config = resolveUpstashRestConfig();

  if (!config) {
    throw new Error(
      "No Upstash REST Redis config. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    );
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  const data = (await response.json()) as UpstashRestResponse<T>;

  if (!response.ok || data.error) {
    throw new Error(data.error ?? `Upstash REST command failed`);
  }

  return data.result ?? null;
}
