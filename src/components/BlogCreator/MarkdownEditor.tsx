"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Editor, { OnMount, OnChange } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSelectionChange?: (selection: { text: string } | null) => void;
  isStreaming?: boolean;
}

type ViewMode = "edit" | "preview" | "split";

// Simple markdown to HTML converter
function markdownToHtml(md: string): string {
  let html = md;

  // Remove YAML frontmatter for preview
  html = html.replace(/^---[\s\S]*?---\n*/m, "");

  // Store code blocks temporarily to protect them from other processing
  const codeBlocks: string[] = [];
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const trimmedCode = code.trim();
    const escapedCode = trimmedCode
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<div class="code-block" data-lang="${lang || "code"}"><div class="code-lang">${lang || "code"}</div><pre><code>${escapedCode}</code></pre></div>`);
    return placeholder;
  });

  // Inline code (after code blocks)
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" data-href="$2">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="numbered">$1</li>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr />');

  // TL;DR box
  html = html.replace(
    /\*\*TL;DR:\*\* (.+)/g,
    '<div class="tldr-box"><p class="tldr-label">TL;DR</p><p class="tldr-content">$1</p></div>'
  );

  // Paragraphs (simple: wrap lines not already wrapped)
  const lines = html.split("\n");
  html = lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("<") ||
        trimmed.startsWith("__CODE_BLOCK_") ||
        trimmed.startsWith("#") ||
        trimmed.startsWith("-") ||
        trimmed.startsWith(">") ||
        /^\d+\./.test(trimmed)
      ) {
        return line;
      }
      return `<p>${trimmed}</p>`;
    })
    .join("\n");

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, "");

  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    html = html.replace(`__CODE_BLOCK_${i}__`, block);
  });

  return html;
}

// Convert HTML back to markdown
function htmlToMarkdown(html: string): string {
  let md = html;

  // Code blocks - handle various possible structures
  md = md.replace(/<div class="code-block"[^>]*data-lang="([^"]*)"[^>]*>[\s\S]*?<code[^>]*>([\s\S]*?)<\/code>[\s\S]*?<\/div>/gi, (_, lang, code) => {
    const unescapedCode = code
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/<br\s*\/?>/gi, "\n");
    return "```" + lang + "\n" + unescapedCode.trim() + "\n```\n";
  });

  // Inline code - handle both class formats
  md = md.replace(/<code class="inline-code"[^>]*>([^<]+)<\/code>/gi, "`$1`");
  md = md.replace(/<code>([^<]+)<\/code>/gi, "`$1`");

  // Headers
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "# $1\n\n");
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "## $1\n\n");
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "### $1\n\n");

  // Bold and italic
  md = md.replace(/<strong><em>([^<]+)<\/em><\/strong>/gi, "***$1***");
  md = md.replace(/<strong>([\s\S]*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<em>([\s\S]*?)<\/em>/gi, "*$1*");
  md = md.replace(/<b>([\s\S]*?)<\/b>/gi, "**$1**");
  md = md.replace(/<i>([\s\S]*?)<\/i>/gi, "*$1*");

  // Links
  md = md.replace(/<a[^>]*data-href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");

  // Images
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "![$2]($1)");
  md = md.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi, "![$1]($2)");

  // TL;DR box
  md = md.replace(/<div class="tldr-box"[^>]*>[\s\S]*?<p class="tldr-content"[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/div>/gi, "**TL;DR:** $1\n\n");

  // Lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => {
    return content.replace(/<li[^>]*>([^<]+)<\/li>/gi, "- $1\n");
  });
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, content) => {
    let num = 1;
    return content.replace(/<li[^>]*>([^<]+)<\/li>/gi, () => `${num++}. $1\n`);
  });

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>([^<]+)<\/blockquote>/gi, "> $1\n");

  // Horizontal rules
  md = md.replace(/<hr[^>]*\/?>/gi, "---\n");

  // Paragraphs
  md = md.replace(/<p[^>]*>([^<]+)<\/p>/gi, "$1\n\n");

  // Clean up divs and other tags
  md = md.replace(/<div[^>]*>/gi, "");
  md = md.replace(/<\/div>/gi, "");
  md = md.replace(/<br\s*\/?>/gi, "\n");

  // Strip remaining HTML tags
  md = md.replace(/<[^>]+>/g, "");

  // Clean up whitespace
  md = md.replace(/\n{3,}/g, "\n\n");
  md = md.trim();

  return md;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MonacoEditor = any;

export default function MarkdownEditor({
  value,
  onChange,
  onSelectionChange,
  isStreaming = false,
}: MarkdownEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const editorRef = useRef<MonacoEditor>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const valueRef = useRef(value);
  const changeSourceRef = useRef<"monaco" | "iframe" | "external">("external");

  // Keep valueRef updated
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Extract frontmatter to preserve it
  const extractFrontmatter = useCallback((md: string): string => {
    const match = md.match(/^(---[\s\S]*?---\n*)/m);
    return match ? match[1] : "";
  }, []);

  // Setup message listener for preview iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === "preview-ready") {
        setIsPreviewReady(true);
        // Set initial content
        const previewHtml = markdownToHtml(valueRef.current);
        iframeRef.current?.contentWindow?.postMessage(
          { type: "set-content", html: previewHtml },
          "*"
        );
      } else if (e.data.type === "content-change") {
        // Mark that this change came from iframe - don't sync back
        changeSourceRef.current = "iframe";
        // Convert HTML back to markdown, preserving frontmatter
        const frontmatter = extractFrontmatter(valueRef.current);
        const newMarkdown = htmlToMarkdown(e.data.html);
        const fullMarkdown = frontmatter + newMarkdown;
        valueRef.current = fullMarkdown;
        onChange(fullMarkdown);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onChange, extractFrontmatter]);

  // Initialize preview iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const timeoutId = setTimeout(() => {
      const doc = iframe.contentDocument;
      if (!doc) return;

      doc.open();
      doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      padding: 24px;
      padding-top: 60px;
      min-height: 100%;
      background: white;
      color: #1e293b;
      line-height: 1.6;
    }
    
    /* Editor styles */
    #editor {
      min-height: 200px;
      outline: none;
    }
    #editor:focus { outline: none; }
    #editor *::selection { background: rgba(59, 130, 246, 0.3); }
    #editor > *:hover {
      outline: 1px dashed rgba(59, 130, 246, 0.3);
      outline-offset: 2px;
    }
    
    /* Typography */
    h1 { font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 1.5rem 0 1rem; }
    h2 { font-size: 1.375rem; font-weight: 700; color: #0f172a; margin: 2rem 0 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e2e8f0; }
    h3 { font-size: 1.125rem; font-weight: 600; color: #1e293b; margin: 1.5rem 0 0.75rem; }
    p { color: #334155; margin-bottom: 1rem; line-height: 1.7; }
    
    /* Links */
    a { color: #2563eb; text-decoration: underline; }
    a:hover { color: #1d4ed8; }
    
    /* Lists */
    ul, ol { margin: 1rem 0; padding-left: 1.5rem; color: #334155; }
    li { margin-bottom: 0.5rem; }
    ul { list-style-type: disc; }
    ol { list-style-type: decimal; }
    
    /* Blockquote */
    blockquote {
      border-left: 4px solid #cbd5e1;
      padding-left: 1rem;
      margin: 1rem 0;
      color: #64748b;
      font-style: italic;
    }
    
    /* Horizontal rule */
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0; }
    
    /* Inline code */
    .inline-code, code:not(.code-block code) {
      background: #f1f5f9;
      color: #0f172a;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 0.875em;
    }
    
    /* Code blocks */
    .code-block {
      background: #0f172a !important;
      border-radius: 0.5rem;
      overflow: hidden;
      margin: 1.5rem 0;
    }
    .code-block .code-lang {
      background: #1e293b;
      padding: 0.5rem 1rem;
      font-size: 0.75rem;
      color: #94a3b8;
      font-family: ui-monospace, SFMono-Regular, monospace;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .code-block pre {
      margin: 0 !important;
      padding: 1rem !important;
      overflow-x: auto;
      background: transparent !important;
    }
    .code-block code {
      color: #e2e8f0 !important;
      background: transparent !important;
      padding: 0 !important;
      font-family: ui-monospace, SFMono-Regular, monospace !important;
      font-size: 0.875rem !important;
      line-height: 1.6 !important;
      white-space: pre !important;
      display: block !important;
    }
    
    /* TL;DR box */
    .tldr-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 0.75rem;
      padding: 1rem;
      margin: 1.5rem 0;
    }
    .tldr-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #2563eb;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.25rem !important;
    }
    .tldr-content {
      color: #1e293b;
      margin-bottom: 0 !important;
    }
    
    /* Images */
    img {
      max-width: 100%;
      border-radius: 0.5rem;
      margin: 1rem 0;
    }
    
    /* Toolbar */
    .editor-toolbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      padding: 8px 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .toolbar-btn {
      padding: 6px 10px;
      border: 1px solid #e2e8f0;
      background: white;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .toolbar-btn:hover { background: #f1f5f9; border-color: #cbd5e1; }
    .toolbar-btn:active { background: #e2e8f0; }
    .toolbar-divider { width: 1px; background: #e2e8f0; margin: 0 4px; }
  </style>
</head>
<body>
  <div class="editor-toolbar">
    <button class="toolbar-btn" data-cmd="bold" title="Bold"><b>B</b></button>
    <button class="toolbar-btn" data-cmd="italic" title="Italic"><i>I</i></button>
    <span class="toolbar-divider"></span>
    <button class="toolbar-btn" data-cmd="insertUnorderedList" title="Bullet List">• List</button>
    <button class="toolbar-btn" data-cmd="insertOrderedList" title="Numbered List">1. List</button>
    <span class="toolbar-divider"></span>
    <button class="toolbar-btn" data-cmd="formatBlock" data-value="h2" title="Heading 2">H2</button>
    <button class="toolbar-btn" data-cmd="formatBlock" data-value="h3" title="Heading 3">H3</button>
    <button class="toolbar-btn" data-cmd="formatBlock" data-value="p" title="Paragraph">¶</button>
    <span class="toolbar-divider"></span>
    <button class="toolbar-btn" data-cmd="createLink" title="Add Link">🔗</button>
    <span class="toolbar-divider"></span>
    <button class="toolbar-btn" data-cmd="undo" title="Undo">↩</button>
    <button class="toolbar-btn" data-cmd="redo" title="Redo">↪</button>
  </div>
  <div id="editor" contenteditable="true"></div>
  <script>
    const editor = document.getElementById('editor');
    let debounceTimer = null;

    document.querySelectorAll('.toolbar-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const cmd = btn.dataset.cmd;
        const value = btn.dataset.value || null;

        if (cmd === 'createLink') {
          const url = prompt('Enter URL:');
          if (url) document.execCommand(cmd, false, url);
        } else if (cmd === 'formatBlock') {
          document.execCommand(cmd, false, '<' + value + '>');
        } else {
          document.execCommand(cmd, false, value);
        }
        editor.focus();
        notifyChange();
      });
    });

    function notifyChange() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        window.parent.postMessage({ type: 'content-change', html: editor.innerHTML }, '*');
      }, 300);
    }

    editor.addEventListener('input', notifyChange);

    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'set-content') {
        editor.innerHTML = e.data.html || '';
      }
    });

    // Signal ready
    setTimeout(() => {
      window.parent.postMessage({ type: 'preview-ready' }, '*');
    }, 100);
  </script>
</body>
</html>`);
      doc.close();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, []);

  // Update preview when value changes from Monaco editor (not from iframe)
  useEffect(() => {
    if (isPreviewReady && (viewMode === "preview" || viewMode === "split")) {
      // Only sync to iframe if change came from Monaco or external source
      if (changeSourceRef.current !== "iframe") {
        const previewHtml = markdownToHtml(value);
        iframeRef.current?.contentWindow?.postMessage(
          { type: "set-content", html: previewHtml },
          "*"
        );
      }
      // Reset source after processing
      changeSourceRef.current = "external";
    }
  }, [value, isPreviewReady, viewMode]);

  // Auto-scroll preview when streaming
  useEffect(() => {
    if (isStreaming && previewRef.current) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight;
    }
  }, [value, isStreaming]);

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;

      // Define custom theme
      monaco.editor.defineTheme("markdown-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "heading", foreground: "60a5fa", fontStyle: "bold" },
          { token: "strong", foreground: "f8fafc", fontStyle: "bold" },
          { token: "emphasis", foreground: "f8fafc", fontStyle: "italic" },
          { token: "string.link", foreground: "34d399" },
          { token: "variable.source", foreground: "fbbf24" },
        ],
        colors: {
          "editor.background": "#0f172a",
          "editor.foreground": "#e2e8f0",
          "editor.lineHighlightBackground": "#1e293b",
          "editor.selectionBackground": "#3b82f640",
          "editorCursor.foreground": "#3b82f6",
          "editorLineNumber.foreground": "#475569",
        },
      });

      monaco.editor.setTheme("markdown-dark");

      // Track selection
      editor.onDidChangeCursorSelection(() => {
        if (!onSelectionChange) return;
        const selection = editor.getSelection();
        if (selection && !selection.isEmpty()) {
          const selectedText = editor.getModel()?.getValueInRange(selection) || "";
          onSelectionChange({ text: selectedText });
        } else {
          onSelectionChange(null);
        }
      });
    },
    [onSelectionChange]
  );

  const handleChange: OnChange = useCallback(
    (newValue) => {
      // Mark that this change came from Monaco editor
      changeSourceRef.current = "monaco";
      onChange(newValue || "");
    },
    [onChange]
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    alert("Markdown copied to clipboard!");
  };

  const handleDownload = () => {
    const blob = new Blob([value], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "blog-post.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col rounded-xl border border-slate-200 overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50">
        {/* View Mode Toggle */}
        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1">
          <button
            onClick={() => setViewMode("edit")}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              viewMode === "edit"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Markdown
          </button>
          <button
            onClick={() => setViewMode("split")}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              viewMode === "split"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Split
          </button>
          <button
            onClick={() => setViewMode("preview")}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              viewMode === "preview"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Rich Edit
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isStreaming && (
            <span className="flex items-center gap-2 text-sm text-blue-600">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" />
              </span>
              Writing...
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleCopy}>
            Copy MD
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            Download
          </Button>
        </div>
      </div>

      {/* Hint for Rich Edit mode */}
      {viewMode === "preview" && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
          <p className="text-xs text-blue-700 flex items-center gap-2">
            <span>✏️</span>
            <span>Click anywhere to edit. Use the toolbar for formatting. Changes sync back to markdown.</span>
          </p>
        </div>
      )}

      {/* Editor/Preview Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Monaco Editor */}
        {(viewMode === "edit" || viewMode === "split") && (
          <div className={`${viewMode === "split" ? "w-1/2 border-r border-slate-200" : "w-full"} h-full`}>
            <Editor
              height="100%"
              language="markdown"
              value={value}
              onChange={handleChange}
              onMount={handleMount}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "var(--font-mono), monospace",
                lineNumbers: "on",
                wordWrap: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                padding: { top: 16, bottom: 16 },
                smoothScrolling: true,
                cursorBlinking: "smooth",
                renderWhitespace: "selection",
                quickSuggestions: false,
                folding: true,
              }}
              loading={
                <div className="flex items-center justify-center h-full bg-slate-900">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
                </div>
              }
            />
          </div>
        )}

        {/* Rich Edit Preview (contenteditable iframe) */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div
            ref={previewRef}
            className={`${viewMode === "split" ? "w-1/2" : "w-full"} h-full overflow-hidden bg-white relative`}
          >
            {!isPreviewReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
              </div>
            )}
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              title="Rich Edit Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        )}
      </div>
    </div>
  );
}
