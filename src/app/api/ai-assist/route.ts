import { mastra } from "@/mastra";
import { NextRequest } from "next/server";

const ACTION_PROMPTS: Record<string, string> = {
  improve: `Improve this HTML content while maintaining Defang blog styling. Make it more engaging, clearer, and professional. Keep the same structure and Tailwind classes. Output ONLY the improved HTML, nothing else.`,

  simplify: `Simplify this HTML content while maintaining Defang blog styling. Make it more concise and easier to scan. Remove unnecessary words but keep key information. Keep Tailwind classes. Output ONLY the simplified HTML, nothing else.`,

  expand: `Expand this HTML content while maintaining Defang blog styling. Add more detail, examples, or explanation. Keep the same Tailwind classes and structure. Output ONLY the expanded HTML, nothing else.`,

  restyle: `Restyle this HTML content using premium Defang blog patterns. Apply better Tailwind classes, add appropriate animations (data-aos), improve visual hierarchy. Make it more visually striking. Output ONLY the restyled HTML, nothing else.`,

  fix: `Fix any issues in this HTML content. Correct grammar, improve formatting, fix broken structure. Maintain Defang blog styling and Tailwind classes. Output ONLY the fixed HTML, nothing else.`,

  cta: `Add a compelling call-to-action to this HTML content that encourages users to try Defang. Use Defang brand colors (blue-600) and styling. Output ONLY the HTML with the CTA added, nothing else.`,

  custom: ``, // Will be filled with user's custom prompt
};

export async function POST(req: NextRequest) {
  try {
    const { selectedHtml, action, customPrompt, context } = await req.json();

    if (!selectedHtml) {
      return new Response(JSON.stringify({ error: "Selected HTML is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!action || !ACTION_PROMPTS[action]) {
      return new Response(
        JSON.stringify({
          error: "Invalid action. Valid actions: improve, simplify, expand, restyle, fix, cta, custom",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const agent = mastra.getAgent("blogStylerAgent");

    let prompt = ACTION_PROMPTS[action];
    if (action === "custom" && customPrompt) {
      prompt = `${customPrompt} Maintain Defang blog styling and Tailwind classes. Output ONLY the modified HTML, nothing else.`;
    }

    const fullPrompt = `${prompt}

${context ? `Context (surrounding content for reference):\n${context}\n\n` : ""}Selected HTML to modify:
${selectedHtml}`;

    const result = await agent.generate([
      {
        role: "user",
        content: fullPrompt,
      },
    ]);

    // Extract just the HTML from the response
    let html = result.text || "";

    // Clean up response - remove markdown code blocks if present
    html = html.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "");
    html = html.trim();

    return new Response(JSON.stringify({ html, status: "success" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI assist error:", error);
    return new Response(JSON.stringify({ error: "Failed to process AI request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Streaming version for longer content
export async function PUT(req: NextRequest) {
  try {
    const { selectedHtml, action, customPrompt, context } = await req.json();

    if (!selectedHtml || !action) {
      return new Response(JSON.stringify({ error: "selectedHtml and action are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const agent = mastra.getAgent("blogStylerAgent");

    let prompt = ACTION_PROMPTS[action] || "";
    if (action === "custom" && customPrompt) {
      prompt = `${customPrompt} Maintain Defang blog styling and Tailwind classes. Output ONLY the modified HTML, nothing else.`;
    }

    const fullPrompt = `${prompt}

${context ? `Context (surrounding content for reference):\n${context}\n\n` : ""}Selected HTML to modify:
${selectedHtml}`;

    const stream = await agent.stream([
      {
        role: "user",
        content: fullPrompt,
      },
    ]);

    return stream.aisdk.v5.toUIMessageStreamResponse();
  } catch (error) {
    console.error("AI assist stream error:", error);
    return new Response(JSON.stringify({ error: "Failed to stream AI response" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
