import { analyzeSEO } from "@/lib/seo-analyzer";
import type { SEOAnalyzeRequest } from "@/lib/seo-analyzer/types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as SEOAnalyzeRequest;

    if (!body.content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    if (!body.contentType || !["html", "markdown"].includes(body.contentType)) {
      return NextResponse.json(
        { error: "contentType must be 'html' or 'markdown'" },
        { status: 400 }
      );
    }

    const result = await analyzeSEO(body);

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Error analyzing SEO:", error);
    return NextResponse.json(
      { error: "Failed to analyze content" },
      { status: 500 }
    );
  }
}
