import { validateUrl } from "@/lib/seo-analyzer";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    const result = await validateUrl(url);

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Error validating URL:", error);
    return NextResponse.json(
      { error: "Failed to validate URL" },
      { status: 500 }
    );
  }
}
