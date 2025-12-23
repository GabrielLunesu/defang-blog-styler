"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect } from "react";

interface VisualEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSelectionChange?: (selection: { text: string; html: string } | null) => void;
  onAIAssist?: (selectedHtml: string, action: string) => void;
}

export default function VisualEditor({
  value,
  onChange,
  onSelectionChange,
}: VisualEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3, 4],
        },
        codeBlock: {
          HTMLAttributes: {
            class: "bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-sm",
          },
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 hover:text-blue-800 underline underline-offset-2",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-xl shadow-lg max-w-full",
        },
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: "bg-yellow-200 px-1 rounded",
        },
      }),
      Placeholder.configure({
        placeholder: "Start typing or paste your styled HTML...",
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "prose prose-slate max-w-none focus:outline-none min-h-[400px] p-6",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      if (!onSelectionChange) return;

      const { from, to } = editor.state.selection;
      if (from !== to) {
        const text = editor.state.doc.textBetween(from, to, " ");
        // Get selected HTML
        const slice = editor.state.doc.slice(from, to);
        let html = "";
        slice.content.forEach((node) => {
          if (node.isText) {
            html += node.text || "";
          } else {
            // For non-text nodes, get text content
            html += node.textContent;
          }
        });
        onSelectionChange({ text, html: html || text });
      } else {
        onSelectionChange(null);
      }
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  // Replace selection method for AI responses
  const replaceSelection = useCallback((newHtml: string) => {
    if (!editor) return;
    editor.chain().focus().deleteSelection().insertContent(newHtml).run();
  }, [editor]);

  // Expose via window for external access
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { visualEditorAPI: { replaceSelection: typeof replaceSelection } }).visualEditorAPI = {
        replaceSelection,
      };
    }
  }, [replaceSelection]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-full bg-white rounded-xl">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-white rounded-xl overflow-hidden border border-slate-200 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-200 bg-slate-50 flex-wrap shrink-0">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold"
        >
          <span className="font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic"
        >
          <span className="italic">I</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="Strikethrough"
        >
          <span className="line-through">S</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
          title="Inline Code"
        >
          <span className="font-mono text-xs">&lt;/&gt;</span>
        </ToolbarButton>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          H3
        </ToolbarButton>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <span className="text-lg leading-none">•</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Numbered List"
        >
          <span className="text-sm">1.</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
          title="Code Block"
        >
          <span className="font-mono text-xs">{"{ }"}</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="Quote"
        >
          <span className="text-lg leading-none">&quot;</span>
        </ToolbarButton>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        <ToolbarButton
          onClick={() => {
            const url = window.prompt("Enter URL:");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          isActive={editor.isActive("link")}
          title="Add Link"
        >
          <span className="text-sm">🔗</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetLink().run()}
          isActive={false}
          title="Remove Link"
          disabled={!editor.isActive("link")}
        >
          <span className="text-sm line-through">🔗</span>
        </ToolbarButton>

        <div className="flex-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          isActive={false}
          title="Undo"
          disabled={!editor.can().undo()}
        >
          ↩
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          isActive={false}
          title="Redo"
          disabled={!editor.can().redo()}
        >
          ↪
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <div className="overflow-auto flex-1">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  isActive,
  title,
  disabled,
  children,
}: {
  onClick: () => void;
  isActive: boolean;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        w-8 h-8 flex items-center justify-center rounded text-sm transition-colors
        ${isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200 text-slate-700"}
        ${disabled ? "opacity-40 cursor-not-allowed" : ""}
      `}
    >
      {children}
    </button>
  );
}
