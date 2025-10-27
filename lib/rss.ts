import Parser from "rss-parser";
import { htmlToText } from "html-to-text";

export type FeedItem = {
  title: string;
  link: string;
  pubDate?: string;
  guid?: string;
  text: string;
  html?: string;
};

const parser = new Parser<unknown, { "content:encoded"?: string }>({
  customFields: {
    item: ["content:encoded"],
  },
});

export async function fetchRssAsText(feedUrl: string): Promise<FeedItem[]> {
  const feed = await parser.parseURL(feedUrl);

  return (feed.items || []).map((item: any) => {
    const html =
      item["content:encoded"] ||
      item.content ||
      item.summary ||
      "";

    let text = "";
    try {
      text = htmlToText(html, {
        wordwrap: false,
        selectors: [
          { selector: "a", options: { ignoreHref: true } },
          { selector: "img", format: "skip" },
        ],
        preserveNewlines: true,
      }).trim();
    } catch {
      // Fallback: strip basic tags if html-to-text throws for any reason
      text = (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }

    return {
      title: item.title ?? "",
      link: item.link ?? "",
      pubDate: item.pubDate,
      guid: item.guid,
      text,
      html,
    };
  });
}

export async function parseRssXmlToText(xml: string): Promise<FeedItem[]> {
  const feed = await (parser as any).parseString(xml);

  return (feed.items || []).map((item: any) => {
    const html =
      item["content:encoded"] ||
      item.content ||
      item.summary ||
      "";

    let text = "";
    try {
      text = htmlToText(html, {
        wordwrap: false,
        selectors: [
          { selector: "a", options: { ignoreHref: true } },
          { selector: "img", format: "skip" },
        ],
        preserveNewlines: true,
      }).trim();
    } catch {
      text = (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }

    return {
      title: item.title ?? "",
      link: item.link ?? "",
      pubDate: item.pubDate,
      guid: item.guid,
      text,
      html,
    };
  });
}


