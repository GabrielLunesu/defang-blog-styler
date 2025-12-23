"use client";

import { useRef, useEffect, useCallback, useState } from "react";

interface VisualEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSelectionChange?: (selection: { text: string; html: string } | null) => void;
}

export default function VisualEditor({
  value,
  onChange,
  onSelectionChange,
}: VisualEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onSelectionChangeRef = useRef(onSelectionChange);

  // Keep refs updated
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  // Set up message listener FIRST (only once)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === "editor-ready") {
        setIsReady(true);
        // Set initial content immediately
        iframeRef.current?.contentWindow?.postMessage(
          { type: "set-content", html: valueRef.current },
          "*"
        );
      } else if (e.data.type === "content-change") {
        valueRef.current = e.data.html;
        onChangeRef.current(e.data.html);
      } else if (e.data.type === "selection-change") {
        if (e.data.text) {
          onSelectionChangeRef.current?.({ text: e.data.text, html: e.data.html });
        } else {
          onSelectionChangeRef.current?.(null);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []); // Empty deps - only run once

  // Initialize iframe AFTER message listener is set up
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Use a small delay to ensure message listener is ready
    const timeoutId = setTimeout(() => {
      const doc = iframe.contentDocument;
      if (!doc) return;

      doc.open();
      doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 24px;
      min-height: 100%;
      background: white;
      color: #1e293b;
    }
    /* Override AOS - make all elements visible */
    [data-aos] {
      opacity: 1 !important;
      transform: none !important;
      transition: none !important;
    }
    [contenteditable]:focus {
      outline: none;
    }
    [contenteditable] *::selection {
      background: rgba(59, 130, 246, 0.3);
    }
    [contenteditable] > *:hover {
      outline: 1px dashed rgba(59, 130, 246, 0.3);
      outline-offset: 2px;
    }
    [contenteditable] {
      cursor: text;
      min-height: 200px;
    }
    /* Ensure all content is visible */
    [contenteditable] * {
      opacity: 1 !important;
      visibility: visible !important;
    }
    .editor-toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      padding: 8px 12px;
      margin: -24px -24px 16px -24px;
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
    .toolbar-btn:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }
    .toolbar-btn:active {
      background: #e2e8f0;
    }
    .toolbar-divider {
      width: 1px;
      background: #e2e8f0;
      margin: 0 4px;
    }
  </style>
</head>
<body>
  <div class="editor-toolbar">
    <button class="toolbar-btn" data-cmd="bold" title="Bold"><b>B</b></button>
    <button class="toolbar-btn" data-cmd="italic" title="Italic"><i>I</i></button>
    <button class="toolbar-btn" data-cmd="underline" title="Underline"><u>U</u></button>
    <button class="toolbar-btn" data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
    <span class="toolbar-divider"></span>
    <button class="toolbar-btn" data-cmd="insertUnorderedList" title="Bullet List">• List</button>
    <button class="toolbar-btn" data-cmd="insertOrderedList" title="Numbered List">1. List</button>
    <span class="toolbar-divider"></span>
    <button class="toolbar-btn" data-cmd="formatBlock" data-value="h2" title="Heading 2">H2</button>
    <button class="toolbar-btn" data-cmd="formatBlock" data-value="h3" title="Heading 3">H3</button>
    <button class="toolbar-btn" data-cmd="formatBlock" data-value="p" title="Paragraph">¶</button>
    <span class="toolbar-divider"></span>
    <button class="toolbar-btn" data-cmd="createLink" title="Add Link">🔗</button>
    <button class="toolbar-btn" data-cmd="unlink" title="Remove Link">✂️</button>
    <span class="toolbar-divider"></span>
    <button class="toolbar-btn" data-cmd="undo" title="Undo">↩</button>
    <button class="toolbar-btn" data-cmd="redo" title="Redo">↪</button>
  </div>
  <div id="editor" contenteditable="true"></div>
  <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
  <script>
    const editor = document.getElementById('editor');

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
      window.parent.postMessage({ type: 'content-change', html: editor.innerHTML }, '*');
    }

    function notifySelection() {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        try {
          const range = selection.getRangeAt(0);
          const fragment = range.cloneContents();
          const div = document.createElement('div');
          div.appendChild(fragment);
          window.parent.postMessage({
            type: 'selection-change',
            text: selection.toString(),
            html: div.innerHTML || selection.toString()
          }, '*');
        } catch(e) {
          window.parent.postMessage({ type: 'selection-change', text: null, html: null }, '*');
        }
      } else {
        window.parent.postMessage({ type: 'selection-change', text: null, html: null }, '*');
      }
    }

    editor.addEventListener('input', notifyChange);
    document.addEventListener('selectionchange', notifySelection);

    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'set-content') {
        editor.innerHTML = e.data.html || '';
        if (typeof AOS !== 'undefined') AOS.refresh();
      }
    });

    // Signal ready after a small delay to ensure parent listener is set up
    setTimeout(() => {
      window.parent.postMessage({ type: 'editor-ready' }, '*');
    }, 100);

    if (typeof AOS !== 'undefined') {
      AOS.init({ duration: 600, once: true, disable: true });
    }
  </script>
</body>
</html>`);
      doc.close();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, []);

  // Update iframe content when value changes externally
  useEffect(() => {
    if (isReady && value !== valueRef.current) {
      valueRef.current = value;
      iframeRef.current?.contentWindow?.postMessage(
        { type: "set-content", html: value },
        "*"
      );
    }
  }, [value, isReady]);

  // Replace selection method for AI responses
  const replaceSelection = useCallback((newHtml: string) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    const selection = doc.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const temp = doc.createElement("div");
    temp.innerHTML = newHtml;
    const frag = doc.createDocumentFragment();
    while (temp.firstChild) {
      frag.appendChild(temp.firstChild);
    }
    range.insertNode(frag);

    const editor = doc.getElementById("editor");
    if (editor) {
      valueRef.current = editor.innerHTML;
      onChangeRef.current(editor.innerHTML);
    }
  }, []);

  // Expose via window for external access
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { visualEditorAPI: { replaceSelection: typeof replaceSelection } }).visualEditorAPI = {
        replaceSelection,
      };
    }
  }, [replaceSelection]);

  return (
    <div className="h-full w-full bg-white rounded-xl overflow-hidden border border-slate-200 flex flex-col relative">
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
        </div>
      )}
      <iframe
        ref={iframeRef}
        className="flex-1 w-full border-0"
        title="Visual Editor"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
