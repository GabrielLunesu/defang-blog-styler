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

    const stream = await agent.stream(
      [
        {
          role: "user",
          content: `Transform this raw blog content into production-ready HTML following Defang guidelines exactly. Output ONLY the HTML, starting with <article class="defang-blog"> and ending with </article>. No explanations, no markdown.

Raw Content:
${content}`,
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
