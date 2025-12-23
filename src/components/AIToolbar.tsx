"use client";

import { useState, useCallback } from "react";

interface AIToolbarProps {
  selectedContent: string | null;
  onApply: (newContent: string) => void;
  context?: string;
}

const AI_ACTIONS = [
  { id: "improve", label: "Improve", icon: "✨", description: "Make it more engaging" },
  { id: "simplify", label: "Simplify", icon: "📝", description: "Make it concise" },
  { id: "expand", label: "Expand", icon: "📖", description: "Add more detail" },
  { id: "restyle", label: "Restyle", icon: "🎨", description: "Better styling" },
  { id: "fix", label: "Fix", icon: "🔧", description: "Fix issues" },
  { id: "cta", label: "Add CTA", icon: "🚀", description: "Add call-to-action" },
] as const;

export default function AIToolbar({ selectedContent, onApply, context }: AIToolbarProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = useCallback(
    async (action: string, prompt?: string) => {
      if (!selectedContent) return;

      setIsLoading(true);
      setLoadingAction(action);
      setError(null);

      try {
        const response = await fetch("/api/ai-assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedHtml: selectedContent,
            action,
            customPrompt: prompt,
            context,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to process");
        }

        const data = await response.json();
        onApply(data.html);
        setShowCustom(false);
        setCustomPrompt("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
        setLoadingAction(null);
      }
    },
    [selectedContent, context, onApply]
  );

  const handleCustomSubmit = useCallback(() => {
    if (customPrompt.trim()) {
      handleAction("custom", customPrompt);
    }
  }, [customPrompt, handleAction]);

  if (!selectedContent) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
        <p className="text-slate-500 text-sm">Select content in the editor to use AI assist</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <span className="text-blue-600">✨</span> AI Assist
        </h3>
        <span className="text-xs text-slate-500">
          {selectedContent.length} chars
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2">
        {AI_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action.id)}
            disabled={isLoading}
            title={action.description}
            className={`
              flex flex-col items-center gap-1 p-3 rounded-lg border transition-all
              ${
                isLoading && loadingAction === action.id
                  ? "bg-blue-50 border-blue-300"
                  : "bg-white border-slate-200 hover:bg-slate-100 hover:border-slate-300"
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <span className="text-lg">
              {isLoading && loadingAction === action.id ? (
                <span className="animate-spin inline-block">⏳</span>
              ) : (
                action.icon
              )}
            </span>
            <span className="text-xs font-medium text-slate-700">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Custom Prompt */}
      <div>
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
        >
          {showCustom ? "▼" : "▶"} Custom instruction
        </button>

        {showCustom && (
          <div className="mt-3 space-y-2">
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="E.g., 'Add a warning callout about API rate limits' or 'Make this sound more technical'"
              className="w-full h-20 bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 resize-none"
            />
            <button
              onClick={handleCustomSubmit}
              disabled={isLoading || !customPrompt.trim()}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading && loadingAction === "custom" ? (
                <>
                  <span className="animate-spin">⏳</span> Processing...
                </>
              ) : (
                <>
                  <span>✨</span> Apply Custom
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Selected Preview */}
      <div className="border-t border-slate-200 pt-3">
        <p className="text-xs text-slate-500 mb-2">Selected content:</p>
        <div className="bg-white border border-slate-200 rounded-lg p-3 max-h-24 overflow-auto">
          <code className="text-xs text-slate-600 whitespace-pre-wrap break-all font-mono">
            {selectedContent.slice(0, 300)}
            {selectedContent.length > 300 && "..."}
          </code>
        </div>
      </div>
    </div>
  );
}
