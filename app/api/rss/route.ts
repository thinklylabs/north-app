import { NextResponse } from "next/server";
import { fetchRssAsText } from "@/lib/rss";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

  try {
    const items = await fetchRssAsText(url);
    return new NextResponse(JSON.stringify({ items }), {
      headers: {
        "content-type": "application/json",
        "cache-control": "s-maxage=600, stale-while-revalidate=300",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed to fetch feed" }, { status: 500 });
  }
}


