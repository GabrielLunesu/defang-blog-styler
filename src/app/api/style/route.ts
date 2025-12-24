import { getDefangDocs } from "@/lib/defang-docs";
import { validateDefangHtml } from "@/lib/html-validation";
import { mastra } from "@/mastra";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const agent = mastra.getAgent("blogStylerAgent");

    const defangDocs = await getDefangDocs();
    const docsContext = defangDocs
      ? `\n\nReference Docs (for factual accuracy only; do not copy verbatim unless asked):\n${defangDocs}`
      : "";

    const response = await agent.generate(
      `Transform this raw blog content into production-ready HTML following Defang guidelines exactly. Output ONLY the HTML, starting with <article class="defang-blog" ...> (additional attributes allowed) and ending with </article>. No explanations, no markdown.
Use the reference docs only for factual accuracy and terminology. Do not add claims or features not supported by the docs or the raw content. Do not change the meaning of the raw content.

Raw Content:
${content}${docsContext}`
    );

    const validation = validateDefangHtml(response.text ?? "");

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 422 });
    }

    return NextResponse.json({
      html: validation.html,
      status: "success",
    });
  } catch (error) {
    console.error("Error styling blog:", error);
    return NextResponse.json(
      { error: "Failed to style blog" },
      { status: 500 }
    );
  }
}
