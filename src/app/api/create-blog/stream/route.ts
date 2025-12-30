import { getDefangDocs } from "@/lib/defang-docs";
import { mastra } from "@/mastra";
import { NextRequest } from "next/server";

export interface CreateBlogRequest {
  topic: string;
  audience: "developers" | "devops" | "startups" | "enterprise";
  blogType: "tutorial" | "guide" | "announcement" | "case-study" | "deep-dive";
  tone: "technical" | "conversational" | "marketing";
  wordCount: number;
  keyPoints?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as CreateBlogRequest;

    if (!body.topic) {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const agent = mastra.getAgent("blogCreatorAgent");

    const defangDocs = await getDefangDocs();
    const docsContext = defangDocs
      ? `\n\nReference Documentation (use for factual accuracy):\n${defangDocs}`
      : "";

    const keyPointsText = body.keyPoints?.length
      ? `\n\nKey points to cover:\n${body.keyPoints.map(p => `- ${p}`).join("\n")}`
      : "";

    const audienceDescriptions: Record<string, string> = {
      developers: "software developers who build and deploy applications",
      devops: "DevOps engineers and platform teams managing infrastructure",
      startups: "startup founders and early-stage technical teams",
      enterprise: "enterprise architects and technical decision makers",
    };

    const toneDescriptions: Record<string, string> = {
      technical: "technically detailed with code examples and architecture insights",
      conversational: "friendly and approachable, explaining concepts simply",
      marketing: "benefit-focused, emphasizing value propositions and outcomes",
    };

    const typeDescriptions: Record<string, string> = {
      tutorial: "step-by-step tutorial with clear instructions and code examples",
      guide: "comprehensive guide explaining concepts and best practices",
      announcement: "product announcement highlighting new features and benefits",
      "case-study": "case study showing real-world usage and results",
      "deep-dive": "technical deep-dive exploring implementation details",
    };

    const prompt = `Write a ${typeDescriptions[body.blogType]} about: ${body.topic}

Target audience: ${audienceDescriptions[body.audience]}
Tone: ${toneDescriptions[body.tone]}
Target length: approximately ${body.wordCount} words${keyPointsText}

Requirements:
1. Start with YAML frontmatter (title, description, author, date, tags)
2. Include a TL;DR section right after the frontmatter
3. Use ## for main sections, ### for subsections
4. Include practical code examples where relevant
5. End with a clear call-to-action linking to Defang resources
6. Remember: NO dashes as punctuation, only mention AWS and GCP${docsContext}

Output only the markdown content, no explanations.`;

    const stream = await agent.stream([
      {
        role: "user",
        content: prompt,
      },
    ]);

    return stream.aisdk.v5.toTextStreamResponse();
  } catch (error) {
    console.error("Error creating blog:", error);
    return new Response(JSON.stringify({ error: "Failed to create blog" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
