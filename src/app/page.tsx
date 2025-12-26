"use client";

import { useState, useRef, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import AIToolbar from "@/components/AIToolbar";

// Lazy load heavy editor components
const CodeEditor = lazy(() => import("@/components/CodeEditor"));
const VisualEditor = lazy(() => import("@/components/VisualEditor"));

const SAMPLE_CONTENT = `Title: Deploy FastAPI to AWS in 5 Minutes

tldr: Stop wrestling with Terraform. Defang deploys your FastAPI app to your own AWS account with one command.

FastAPI is amazing for building APIs, but deploying to AWS is a nightmare. You need VPCs, security groups, IAM roles, load balancers...

## The Old Way

Traditionally you'd write hundreds of lines of Terraform:

\`\`\`hcl
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}
// ... 200 more lines
\`\`\`

Then pray it works.

## The Defang Way

Just run:

defang compose up

That's it. Seriously. Your app is now running on your own AWS account.

## Why This Matters

- Your code runs in YOUR AWS account
- No vendor lock-in
- Pay AWS prices directly, no platform markup
- Full control when you need it`;

const ALLOWED_TAGS = new Set([
  "article", "section", "div", "span", "p", "a", "strong", "em", "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "h5", "h6", "pre", "code", "table", "thead", "tbody",
  "tr", "th", "td", "figure", "figcaption", "img", "details", "summary", "blockquote", "hr", "br",
  // SVG elements for icons
  "svg", "path", "circle", "rect", "line", "polyline", "polygon", "g", "defs", "clipPath", "use",
  // Additional semantic elements
  "nav", "header", "footer", "aside", "main", "time", "cite", "mark", "small", "sub", "sup",
]);

const DISALLOWED_TAGS = new Set(["script", "style", "iframe", "object", "embed", "link", "meta"]);
const GLOBAL_ATTRS = new Set(["class", "id", "title", "role", "tabindex"]);
const DATA_ATTRS = new Set(["data-aos", "data-aos-delay", "data-aos-duration", "data-aos-offset", "data-aos-easing"]);

const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
  img: new Set(["src", "alt", "width", "height", "loading"]),
  th: new Set(["scope", "colspan", "rowspan"]),
  td: new Set(["colspan", "rowspan"]),
  // SVG attributes
  svg: new Set(["viewBox", "fill", "stroke", "xmlns", "width", "height", "preserveAspectRatio"]),
  path: new Set(["d", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"]),
  circle: new Set(["cx", "cy", "r", "fill", "stroke", "stroke-width"]),
  rect: new Set(["x", "y", "width", "height", "rx", "ry", "fill", "stroke", "stroke-width"]),
  line: new Set(["x1", "y1", "x2", "y2", "stroke", "stroke-width"]),
  polyline: new Set(["points", "fill", "stroke", "stroke-width"]),
  polygon: new Set(["points", "fill", "stroke"]),
  g: new Set(["fill", "stroke", "transform"]),
  use: new Set(["href", "xlink:href", "x", "y", "width", "height"]),
  // Time element
  time: new Set(["datetime"]),
};

const isSafeUrl = (value: string, allowDataImage = false) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("#") || trimmed.startsWith("/")) return true;
  if (allowDataImage && trimmed.startsWith("data:image/")) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
};

const sanitizeHtml = (html: string) => {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const isEmptyBlock = (el: Element) => {
    const text = (el.textContent || "").replace(/\u00a0/g, " ").trim();
    if (text) return false;
    if (el.querySelector("img,table,pre,code,hr,figure,svg")) return false;
    return true;
  };

  const sanitizeNode = (node: Node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (DISALLOWED_TAGS.has(tag)) {
      el.remove();
      return;
    }

    if (!ALLOWED_TAGS.has(tag)) {
      const parent = el.parentNode;
      if (!parent) {
        el.remove();
        return;
      }
      const children = Array.from(el.childNodes);
      for (const child of children) parent.insertBefore(child, el);
      parent.removeChild(el);
      for (const child of children) sanitizeNode(child);
      return;
    }

    const allowedAttrs = TAG_ATTRS[tag];
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value;
      const isAllowed =
        GLOBAL_ATTRS.has(name) ||
        DATA_ATTRS.has(name) ||
        name.startsWith("aria-") ||
        (allowedAttrs && allowedAttrs.has(name));

      if (!isAllowed) {
        el.removeAttribute(attr.name);
        continue;
      }

      if (name === "href" && !isSafeUrl(value)) {
        el.removeAttribute(attr.name);
      }

      if (name === "src" && !isSafeUrl(value, true)) {
        el.removeAttribute(attr.name);
      }
    }

    if (tag === "a" && el.getAttribute("target") === "_blank") {
      const rel = el.getAttribute("rel") || "";
      const tokens = new Set(rel.split(/\s+/).filter(Boolean));
      tokens.add("noopener");
      tokens.add("noreferrer");
      el.setAttribute("rel", Array.from(tokens).join(" "));
    }

    if ((tag === "p" || tag === "li") && isEmptyBlock(el)) {
      el.remove();
      return;
    }

    const children = Array.from(el.childNodes);
    for (const child of children) sanitizeNode(child);
  };

  const bodyChildren = Array.from(doc.body.childNodes);
  for (const child of bodyChildren) sanitizeNode(child);

  return doc.body.innerHTML;
};

type EditorMode = "preview" | "visual" | "code";

interface SEOMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  canonicalSlug?: string;
  category?: string;
  estimatedReadTime?: string;
  targetAudience?: string;
}

// Parse SEO metadata from the response
const parseSEOAndHtml = (text: string): { seo: SEOMetadata | null; html: string } => {
  const startMarker = "<!-- SEO_META_START -->";
  const endMarker = "<!-- SEO_META_END -->";

  const startIdx = text.indexOf(startMarker);
  const endIdx = text.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    return { seo: null, html: text };
  }

  const jsonStr = text.slice(startIdx + startMarker.length, endIdx).trim();
  const htmlContent = text.slice(endIdx + endMarker.length).trim();

  try {
    const seo = JSON.parse(jsonStr) as SEOMetadata;
    return { seo, html: htmlContent };
  } catch {
    return { seo: null, html: htmlContent || text };
  }
};

export default function Home() {
  const [content, setContent] = useState(SAMPLE_CONTENT);
  const [html, setHtml] = useState("");
  const [seoMetadata, setSeoMetadata] = useState<SEOMetadata | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("preview");
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const sanitizedHtml = useMemo(() => sanitizeHtml(html), [html]);

  // Initialize AOS when preview updates
  useEffect(() => {
    if (html && typeof window !== "undefined") {
      // @ts-expect-error - AOS is loaded from CDN
      window.AOS?.refresh();
    }
  }, [html]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setHtml("");
    setSeoMetadata(null);
    setEditorMode("preview");

    try {
      const res = await fetch("/api/style/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        result += chunk;

        // Parse SEO and HTML as we stream
        const { seo, html: parsedHtml } = parseSEOAndHtml(result);
        if (seo) setSeoMetadata(seo);
        setHtml(parsedHtml);
      }

      // Final parse after stream completes
      const { seo, html: parsedHtml } = parseSEOAndHtml(result);
      if (seo) setSeoMetadata(seo);
      setHtml(parsedHtml);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to generate styled blog. Check console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sanitizedHtml);
    alert("HTML copied to clipboard!");
  };

  const handleDownload = () => {
    const blob = new Blob([sanitizedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "styled-blog.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFullScreen = () => {
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      alert("Popup blocked. Please allow popups to open full screen preview.");
      return;
    }

    previewWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog Preview - Defang Studio</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="bg-slate-50 min-h-screen">
  <header class="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-200">
    <div class="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">D</div>
        <span class="text-sm text-slate-500">Defang Blog Preview</span>
      </div>
      <button onclick="window.close()" class="text-sm text-slate-500 hover:text-slate-900 transition">Close Preview</button>
    </div>
  </header>
  <main class="max-w-4xl mx-auto px-6 py-12">
    ${sanitizedHtml}
  </main>
  <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
  <script>AOS.init({ duration: 600, once: true });</script>
</body>
</html>`);
    previewWindow.document.close();
  };

  // Handle code editor changes
  const handleCodeChange = useCallback((value: string) => {
    setHtml(value);
  }, []);

  // Handle visual editor changes
  const handleVisualChange = useCallback((value: string) => {
    setHtml(value);
  }, []);

  // Handle selection changes from code editor
  const handleCodeSelectionChange = useCallback(
    (selection: { text: string } | null) => {
      setSelectedContent(selection?.text || null);
    },
    []
  );

  // Handle selection changes from visual editor
  const handleVisualSelectionChange = useCallback(
    (selection: { text: string; html: string } | null) => {
      setSelectedContent(selection?.html || null);
    },
    []
  );

  // Handle AI toolbar apply
  const handleAIApply = useCallback((newContent: string) => {
    if (editorMode === "code") {
      const codeAPI = (window as unknown as { codeEditorAPI?: { replaceSelection: (text: string) => void } }).codeEditorAPI;
      if (codeAPI) {
        codeAPI.replaceSelection(newContent);
      }
    } else if (editorMode === "visual") {
      const visualAPI = (window as unknown as { visualEditorAPI?: { replaceSelection: (html: string) => void } }).visualEditorAPI;
      if (visualAPI) {
        visualAPI.replaceSelection(newContent);
      }
    }
    setSelectedContent(null);
  }, [editorMode]);

  const EditorLoader = () => (
    <div className="flex items-center justify-center h-[700px] bg-slate-100 rounded-xl">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
    </div>
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-4" data-aos="fade-down">
            <Image src="/logo.png" alt="Defang" width={160} height={48} className="h-9 w-auto" priority />
            <div className="border-l border-border pl-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Blog Styler</p>
              <p className="text-sm text-muted-foreground">Blog to HTML converter</p>
            </div>
          </div>
          <a
            href="https://defang.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            defang.io →
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-16 pt-10">
        <div className="grid gap-8">
          {/* Hero */}
          <Card data-aos="fade-up">
            <CardHeader>
              <CardTitle className="text-3xl sm:text-4xl">Convert blog drafts into clean HTML.</CardTitle>
              <CardDescription className="text-base">
                Paste your content, generate styled HTML, then refine with visual or code editing and AI assistance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge>Visual Editor</Badge>
                <Badge>Code Editor</Badge>
                <Badge>AI Assist</Badge>
                <Badge>AOS Animations</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Main Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Input Panel */}
            <Card data-aos="fade-up" data-aos-delay="100">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>Raw Content</CardTitle>
                  <CardDescription>Paste markdown, docs, or notes</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setContent(SAMPLE_CONTENT)}>
                  Load Sample
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste your raw blog content here..."
                  className="h-[480px] resize-none font-mono"
                />

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !content}
                  className={`w-full py-6 text-base transition-all duration-300 ${
                    isGenerating
                      ? "bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-gradient"
                      : ""
                  }`}
                  size="lg"
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center gap-3">
                      <span className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-white animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-2 w-2 rounded-full bg-white animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-2 w-2 rounded-full bg-white animate-bounce" />
                      </span>
                      <span>Generating...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate
                    </span>
                  )}
                </Button>

                {/* AI Toolbar - shows when in edit mode */}
                {(editorMode === "code" || editorMode === "visual") && (
                  <div className="pt-4 border-t border-border">
                    <AIToolbar
                      selectedContent={selectedContent}
                      onApply={handleAIApply}
                      context={html.slice(0, 1000)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Output Panel - spans 2 columns */}
            <Card className="lg:col-span-2" data-aos="fade-up" data-aos-delay="150">
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                {/* Mode Tabs */}
                <div className="inline-flex items-center rounded-full border border-border bg-muted p-1">
                  <Button
                    variant={editorMode === "preview" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setEditorMode("preview")}
                  >
                    Preview
                  </Button>
                  <Button
                    variant={editorMode === "visual" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setEditorMode("visual")}
                  >
                    Visual Edit
                  </Button>
                  <Button
                    variant={editorMode === "code" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setEditorMode("code")}
                  >
                    Code Edit
                  </Button>
                </div>

                {/* Actions */}
                {html && (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handleFullScreen}>
                      <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      Full Screen
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      Copy HTML
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                      Download
                    </Button>
                  </div>
                )}
              </CardHeader>

              {/* Editor Hint */}
              {editorMode !== "preview" && (
                <div className="px-6 pb-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 text-xs">
                      ✨ AI Assist
                    </span>
                    Select content and use AI toolbar on the left to improve, simplify, or restyle
                  </p>
                </div>
              )}

              <CardContent>
                <div className="overflow-hidden rounded-2xl border border-border">
                  {/* Preview Mode - uses iframe with Tailwind CDN for accurate rendering */}
                  {editorMode === "preview" && (
                    <div ref={previewRef} className="h-[700px] bg-white">
                      {sanitizedHtml ? (
                        <iframe
                          className="w-full h-full border-0"
                          title="Blog Preview"
                          srcDoc={`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 24px; background: white; color: #1e293b; }
    /* Ensure animations play */
    [data-aos] { opacity: 1 !important; transform: none !important; }
  </style>
</head>
<body>
  ${sanitizedHtml}
  ${isGenerating ? '<span style="display:inline-block;width:2px;height:20px;background:#3b82f6;animation:pulse 1s infinite;margin-left:2px;vertical-align:middle"></span>' : ''}
  <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
  <script>AOS.init({ duration: 600, once: true });</script>
</body>
</html>`}
                        />
                      ) : isGenerating ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                          <div className="flex gap-1.5">
                            <span className="h-3 w-3 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                            <span className="h-3 w-3 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]" />
                            <span className="h-3 w-3 rounded-full bg-primary animate-bounce" />
                          </div>
                          <p className="text-muted-foreground text-sm">Generating your styled blog...</p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-muted-foreground">Styled output will appear here...</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Visual Edit Mode */}
                  {editorMode === "visual" && (
                    <Suspense fallback={<EditorLoader />}>
                      <div className="h-[700px]">
                        <VisualEditor
                          value={html}
                          onChange={handleVisualChange}
                          onSelectionChange={handleVisualSelectionChange}
                        />
                      </div>
                    </Suspense>
                  )}

                  {/* Code Edit Mode */}
                  {editorMode === "code" && (
                    <Suspense fallback={<EditorLoader />}>
                      <div className="h-[700px]">
                        <CodeEditor
                          value={html}
                          onChange={handleCodeChange}
                          onSelectionChange={handleCodeSelectionChange}
                        />
                      </div>
                    </Suspense>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SEO Metadata Section */}
          {seoMetadata && (
            <Card data-aos="fade-up" className="border-green-200 bg-gradient-to-br from-green-50/50 to-white">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-green-600 flex items-center justify-center">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle className="text-green-900">SEO Metadata</CardTitle>
                    <CardDescription>Copy these values for your CMS or meta tags</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Title */}
                  {seoMetadata.title && (
                    <SEOField label="Meta Title" value={seoMetadata.title} charCount hint="50-60 chars ideal" />
                  )}

                  {/* Description */}
                  {seoMetadata.description && (
                    <SEOField label="Meta Description" value={seoMetadata.description} charCount hint="150-160 chars ideal" className="md:col-span-2" />
                  )}

                  {/* Keywords */}
                  {seoMetadata.keywords && seoMetadata.keywords.length > 0 && (
                    <SEOField label="Keywords" value={seoMetadata.keywords.join(", ")} className="md:col-span-2" />
                  )}

                  {/* OG Title */}
                  {seoMetadata.ogTitle && (
                    <SEOField label="Open Graph Title" value={seoMetadata.ogTitle} />
                  )}

                  {/* OG Description */}
                  {seoMetadata.ogDescription && (
                    <SEOField label="Open Graph Description" value={seoMetadata.ogDescription} />
                  )}

                  {/* Canonical Slug */}
                  {seoMetadata.canonicalSlug && (
                    <SEOField label="URL Slug" value={seoMetadata.canonicalSlug} />
                  )}

                  {/* Category */}
                  {seoMetadata.category && (
                    <SEOField label="Category" value={seoMetadata.category} />
                  )}

                  {/* Read Time & Audience */}
                  <div className="flex gap-4 md:col-span-2">
                    {seoMetadata.estimatedReadTime && (
                      <div className="flex-1">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Read Time</span>
                        <p className="mt-1 text-sm font-medium text-slate-700">{seoMetadata.estimatedReadTime}</p>
                      </div>
                    )}
                    {seoMetadata.targetAudience && (
                      <div className="flex-1">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Target Audience</span>
                        <p className="mt-1 text-sm font-medium text-slate-700">{seoMetadata.targetAudience}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Copy All Button */}
                <div className="mt-6 pt-4 border-t border-green-100">
                  <Button
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-50"
                    onClick={() => {
                      const allSEO = Object.entries(seoMetadata)
                        .filter(([, v]) => v)
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                        .join("\n");
                      navigator.clipboard.writeText(allSEO);
                      alert("All SEO metadata copied!");
                    }}
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy All SEO Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </main>
  );
}

// SEO Field component with copy button
function SEOField({
  label,
  value,
  charCount,
  hint,
  className = "",
}: {
  label: string;
  value: string;
  charCount?: boolean;
  hint?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`group relative ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        {charCount && (
          <span className={`text-xs ${value.length > 160 ? "text-amber-600" : "text-slate-400"}`}>
            {value.length} chars {hint && `(${hint})`}
          </span>
        )}
      </div>
      <div className="relative">
        <div className="bg-white border border-slate-200 rounded-lg p-3 pr-12 text-sm text-slate-700 break-words">
          {value}
        </div>
        <button
          onClick={handleCopy}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-slate-100 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-slate-400 group-hover:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
