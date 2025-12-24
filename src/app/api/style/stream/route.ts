import { getDefangDocs } from "@/lib/defang-docs";
import { mastra } from "@/mastra";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();

    if (!content) {
      return new Response(JSON.stringify({ error: "Content is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const agent = mastra.getAgent("blogStylerAgent");

    const defangDocs = await getDefangDocs();
    const docsContext = defangDocs
      ? `\n\nReference Docs (for factual accuracy only; do not copy verbatim unless asked):\n${defangDocs}`
      : "";

    const stream = await agent.stream(
      [
        {
          role: "user",
          content: `Transform this raw blog content into production-ready HTML following Defang guidelines exactly. Output ONLY the HTML, starting with <article class="defang-blog" ...> (additional attributes allowed) and ending with </article>. No explanations, no markdown.
Use the reference docs only for factual accuracy and terminology. Do not add claims or features not supported by the docs or the raw content. Do not change the meaning of the raw content.

Raw Content:
${content}${docsContext}`,
        },
      ],
      { format: "aisdk" }
    );

    return stream.toTextStreamResponse();
  } catch (error) {
    console.error("Error streaming blog:", error);
    return new Response(JSON.stringify({ error: "Failed to style blog" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
