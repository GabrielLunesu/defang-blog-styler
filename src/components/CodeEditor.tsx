"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import Editor, { OnMount, OnChange } from "@monaco-editor/react";

interface SelectionRange {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSelectionChange?: (selection: { text: string; range: SelectionRange } | null) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MonacoEditor = any;

export default function CodeEditor({ value, onChange, onSelectionChange }: CodeEditorProps) {
  const editorRef = useRef<MonacoEditor>(null);
  const [internalValue, setInternalValue] = useState(() => formatHtml(value));
  const lastExternalValue = useRef(value);

  // Format when external value changes (from generation, not from typing)
  useEffect(() => {
    if (value !== lastExternalValue.current) {
      lastExternalValue.current = value;
      const formatted = formatHtml(value);
      setInternalValue(formatted);
    }
  }, [value]);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Custom Defang HTML theme
    monaco.editor.defineTheme("defang-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "tag", foreground: "60a5fa" },
        { token: "attribute.name", foreground: "a78bfa" },
        { token: "attribute.value", foreground: "34d399" },
        { token: "comment", foreground: "6b7280" },
        { token: "string", foreground: "fbbf24" },
      ],
      colors: {
        "editor.background": "#0f172a",
        "editor.foreground": "#e2e8f0",
        "editor.lineHighlightBackground": "#1e293b",
        "editor.selectionBackground": "#3b82f640",
        "editorCursor.foreground": "#3b82f6",
        "editorLineNumber.foreground": "#475569",
        "editorLineNumber.activeForeground": "#94a3b8",
      },
    });

    monaco.editor.setTheme("defang-dark");

    // Track selection changes for AI assist
    editor.onDidChangeCursorSelection((e) => {
      if (!onSelectionChange) return;

      const selection = editor.getSelection();
      if (selection && !selection.isEmpty()) {
        const selectedText = editor.getModel()?.getValueInRange(selection) || "";
        onSelectionChange({
          text: selectedText,
          range: {
            startLineNumber: selection.startLineNumber,
            startColumn: selection.startColumn,
            endLineNumber: selection.endLineNumber,
            endColumn: selection.endColumn,
          },
        });
      } else {
        onSelectionChange(null);
      }
    });

    // Register HTML formatting
    monaco.languages.registerDocumentFormattingEditProvider("html", {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      provideDocumentFormattingEdits(model: any) {
        const text = model.getValue();
        // Basic HTML formatting
        const formatted = formatHtml(text);
        return [
          {
            range: model.getFullModelRange(),
            text: formatted,
          },
        ];
      },
    });
  }, [onSelectionChange]);

  const handleChange: OnChange = useCallback((newValue) => {
    const val = newValue || "";
    setInternalValue(val);
    lastExternalValue.current = val;
    onChange(val);
  }, [onChange]);

  // Get current selection for external use
  const getSelection = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return null;

    const selection = editor.getSelection();
    if (!selection || selection.isEmpty()) return null;

    return {
      text: editor.getModel()?.getValueInRange(selection) || "",
      range: selection,
    };
  }, []);

  // Replace selected text
  const replaceSelection = useCallback((newText: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = editor.getSelection();
    if (!selection) return;

    editor.executeEdits("ai-assist", [
      {
        range: selection,
        text: newText,
        forceMoveMarkers: true,
      },
    ]);
  }, []);

  // Expose methods via window for external access
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { codeEditorAPI: { getSelection: typeof getSelection; replaceSelection: typeof replaceSelection } }).codeEditorAPI = {
        getSelection,
        replaceSelection,
      };
    }
  }, [getSelection, replaceSelection]);

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-white/10">
      <Editor
        height="100%"
        language="html"
        value={internalValue}
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
          insertSpaces: true,
          formatOnPaste: true,
          bracketPairColorization: { enabled: true },
          padding: { top: 16, bottom: 16 },
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          renderWhitespace: "selection",
          quickSuggestions: false,
          folding: true,
          foldingStrategy: "indentation",
        }}
        loading={
          <div className="flex items-center justify-center h-full bg-slate-900">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          </div>
        }
      />
    </div>
  );
}

// HTML formatter
function formatHtml(html: string): string {
  if (!html || !html.trim()) return html;

  const tab = "  ";
  let result = "";
  let indent = 0;

  // Inline tags that shouldn't force new lines
  const inlineTags = new Set(["a", "span", "strong", "em", "b", "i", "code", "small", "mark"]);

  // Self-closing tags
  const selfClosingTags = new Set(["br", "hr", "img", "input", "meta", "link", "area", "base", "col", "embed", "source", "track", "wbr"]);

  // Split by tags while preserving them
  const tokens = html.split(/(<[^>]+>)/g).filter(Boolean);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const trimmed = token.trim();
    if (!trimmed) continue;

    // Get tag name
    const tagMatch = trimmed.match(/<\/?(\w+)/);
    const tagName = tagMatch ? tagMatch[1].toLowerCase() : "";

    if (trimmed.startsWith("</")) {
      // Closing tag
      indent = Math.max(0, indent - 1);
      if (!inlineTags.has(tagName)) {
        result += "\n" + tab.repeat(indent);
      }
      result += trimmed;
    } else if (trimmed.startsWith("<") && !trimmed.startsWith("<!") && !trimmed.startsWith("<?")) {
      // Opening tag
      if (!inlineTags.has(tagName) && result && !result.endsWith("\n")) {
        result += "\n" + tab.repeat(indent);
      } else if (!inlineTags.has(tagName) && result) {
        result += tab.repeat(indent);
      }
      result += trimmed;

      // Increase indent if not self-closing and not inline
      if (!trimmed.endsWith("/>") && !selfClosingTags.has(tagName) && !inlineTags.has(tagName)) {
        indent++;
        result += "\n";
      }
    } else {
      // Text content
      const text = trimmed.replace(/\s+/g, " ");
      if (text) {
        result += text;
      }
    }
  }

  // Clean up multiple newlines
  result = result.replace(/\n{3,}/g, "\n\n");
  result = result.replace(/^\n+/, "");

  return result.trim();
}
