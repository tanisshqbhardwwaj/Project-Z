import { readFile } from "node:fs/promises";
import { resolveMarketingMarkdownPath, slugToPathname } from "@/lib/agent/markdown-routes";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const { slug } = await params;
  const pathname = slugToPathname(slug);
  const absolutePath = resolveMarketingMarkdownPath(pathname);

  if (!absolutePath) {
    return new Response("# Not Found\n\nNo markdown representation for this path.\n", {
      status: 404,
      headers: markdownHeaders(),
    });
  }

  let body: string;
  try {
    body = await readFile(absolutePath, "utf8");
  } catch {
    return new Response("# Not Found\n\nMarkdown file missing.\n", {
      status: 404,
      headers: markdownHeaders(),
    });
  }

  return new Response(body, {
    headers: markdownHeaders(),
  });
}

function markdownHeaders(): HeadersInit {
  return {
    "Content-Type": "text/markdown; charset=utf-8",
    Vary: "Accept, Accept-Encoding",
    Link: '</llms.txt>; rel="describedby"',
    "Cache-Control": "s-maxage=60, stale-while-revalidate=86400",
  };
}
