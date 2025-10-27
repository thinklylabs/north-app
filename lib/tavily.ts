export type TavilyExtractFormat = "text" | "markdown";

type TavilyExtractResponse = {
  results?: Array<{
    url?: string;
    content?: string;
    raw_content?: string;
  }>;
};

async function fetchWithTimeout(resource: string, options: RequestInit & { timeoutMs?: number }) {
  const { timeoutMs, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs ?? 20000);
  try {
    const res = await fetch(resource, { ...rest, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function tavilyExtractOnce(url: string, format: TavilyExtractFormat) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not set");
  }

  const res = await fetchWithTimeout("https://api.tavily.com/extract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ urls: [url], format, extract_depth: "advanced" }),
    timeoutMs: 20000,
  });

  if (!res.ok) {
    throw new Error(`Tavily extract failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as TavilyExtractResponse;
  const first = data.results?.[0];
  const content = first?.content || first?.raw_content || "";
  return content.trim();
}

export async function extractWebsiteContentWithFallback(url: string): Promise<{ content: string; formatUsed: TavilyExtractFormat }>
{
  // Try text first, then markdown if short/empty
  try {
    const text = await tavilyExtractOnce(url, "text");
    if (text && text.length >= 400) {
      return { content: text, formatUsed: "text" };
    }
    const md = await tavilyExtractOnce(url, "markdown");
    const better = md && md.length > text.length ? md : text;
    return { content: better, formatUsed: md.length > text.length ? "markdown" : "text" } as const;
  } catch (err) {
    // Final fallback: best-effort markdown
    const md = await tavilyExtractOnce(url, "markdown").catch(() => "");
    return { content: md, formatUsed: "markdown" };
  }
}


