"use client";

import { useState, useEffect, useCallback } from "react";
import type { SEOAnalysisResult, SEOMetadata, URLValidationResult } from "@/lib/seo-analyzer/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SEOAnalyzerProps {
  content: string;
  contentType: "html" | "markdown";
  seoMetadata?: SEOMetadata;
  onFix?: (fixedContent: string) => void;
}

export default function SEOAnalyzer({
  content,
  contentType,
  seoMetadata,
  onFix,
}: SEOAnalyzerProps) {
  const [result, setResult] = useState<SEOAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "urls" | "content" | "technical" | "defang">("overview");
  const [validatingUrls, setValidatingUrls] = useState(false);
  const [urlResults, setUrlResults] = useState<URLValidationResult[]>([]);

  const runAnalysis = useCallback(async () => {
    if (!content) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/seo-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          contentType,
          seoMetadata,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze content");
      }

      const data = await response.json();
      setResult(data.result);
      setUrlResults(data.result.urlValidation || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsLoading(false);
    }
  }, [content, contentType, seoMetadata]);

  // Auto-run analysis when content changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content && content.length > 50) {
        runAnalysis();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [content, runAnalysis]);

  const validateUrls = async () => {
    if (!result?.urlValidation) return;

    setValidatingUrls(true);
    const newResults: URLValidationResult[] = [];

    for (const urlItem of result.urlValidation) {
      try {
        const response = await fetch("/api/seo-analyze/validate-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlItem.url }),
        });

        if (response.ok) {
          const data = await response.json();
          newResults.push(data.result);
        } else {
          newResults.push({ ...urlItem, status: "invalid", error: "Validation failed" });
        }
      } catch {
        newResults.push({ ...urlItem, status: "invalid", error: "Network error" });
      }
    }

    setUrlResults(newResults);
    setValidatingUrls(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-green-500";
    if (score >= 70) return "text-yellow-500";
    if (score >= 60) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 80) return "bg-green-400";
    if (score >= 70) return "bg-yellow-400";
    if (score >= 60) return "bg-orange-400";
    return "bg-red-400";
  };

  const getSeverityColor = (severity: "error" | "warning" | "info") => {
    switch (severity) {
      case "error": return "bg-red-100 text-red-800 border-red-200";
      case "warning": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "info": return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getSeverityIcon = (severity: "error" | "warning" | "info") => {
    switch (severity) {
      case "error": return "✗";
      case "warning": return "⚠";
      case "info": return "ℹ";
    }
  };

  if (!content || content.length < 50) {
    return (
      <Card className="border-slate-200">
        <CardContent className="py-8 text-center text-slate-500">
          <p>Add more content to enable SEO analysis</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading && !result) {
    return (
      <Card className="border-slate-200">
        <CardContent className="py-8 flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          <p className="text-slate-500 text-sm">Analyzing content...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-6">
          <p className="text-red-700">{error}</p>
          <Button variant="outline" size="sm" onClick={runAnalysis} className="mt-3">
            Retry Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  const categories = [
    { id: "urls", name: "URLs", data: result.categories.urls },
    { id: "content", name: "Content", data: result.categories.content },
    { id: "technical", name: "Technical", data: result.categories.technical },
    { id: "defang", name: "Defang", data: result.categories.defang },
  ];

  return (
    <Card className="border-slate-200" data-aos="fade-up">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <CardTitle>SEO Analysis</CardTitle>
              <CardDescription>Content quality and optimization score</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={runAnalysis} disabled={isLoading}>
            {isLoading ? "Analyzing..." : "Re-analyze"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="flex items-center gap-6 p-4 rounded-xl bg-slate-50">
          <div className="relative h-20 w-20">
            <svg className="h-20 w-20 transform -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${result.overallScore}, 100`}
                className={getScoreColor(result.overallScore)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xl font-bold ${getScoreColor(result.overallScore)}`}>
                {result.overallScore}
              </span>
            </div>
          </div>
          <div>
            <p className={`text-2xl font-bold ${getScoreColor(result.overallScore)}`}>
              {result.scoreLabel}
            </p>
            <p className="text-sm text-slate-500">
              {result.issues.filter(i => i.severity === "error").length} errors,{" "}
              {result.issues.filter(i => i.severity === "warning").length} warnings
            </p>
          </div>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id as typeof activeTab)}
              className={`p-3 rounded-xl border transition-all text-left ${
                activeTab === cat.id
                  ? "border-blue-300 bg-blue-50"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <p className="text-sm font-medium text-slate-700">{cat.name}</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getScoreBg(Math.round((cat.data.score / cat.data.maxScore) * 100))}`}
                    style={{ width: `${(cat.data.score / cat.data.maxScore) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500">
                  {cat.data.passed}/{cat.data.total}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Issues List */}
            {result.issues.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Issues ({result.issues.length})</p>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {result.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${getSeverityColor(issue.severity)}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{getSeverityIcon(issue.severity)}</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{issue.title}</p>
                          <p className="text-xs mt-1 opacity-80">{issue.description}</p>
                          {issue.currentValue && (
                            <p className="text-xs mt-2 font-mono bg-white/50 p-1 rounded">
                              {issue.currentValue.slice(0, 100)}
                              {issue.currentValue.length > 100 && "..."}
                            </p>
                          )}
                          {issue.autoFixable && onFix && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 h-7 text-xs"
                              onClick={() => {
                                // Apply auto-fix
                                if (issue.suggestedValue && issue.currentValue) {
                                  const fixed = content.replace(issue.currentValue, issue.suggestedValue);
                                  onFix(fixed);
                                }
                              }}
                            >
                              Auto-fix
                            </Button>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {issue.category}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                <span className="text-2xl">✓</span>
                <p className="text-green-700 font-medium mt-1">No issues found!</p>
              </div>
            )}

            {/* Keywords */}
            {result.keywords && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {result.keywords.primary.map((kw, idx) => (
                    <Badge
                      key={idx}
                      variant={kw.status === "good" ? "default" : "outline"}
                      className={kw.status === "low" ? "border-orange-300 text-orange-700" : ""}
                    >
                      {kw.keyword} ({kw.count})
                    </Badge>
                  ))}
                  {result.keywords.secondary.map((kw, idx) => (
                    <Badge key={`sec-${idx}`} variant="outline">
                      {kw.keyword} ({kw.count})
                    </Badge>
                  ))}
                </div>
                {result.keywords.suggestions.length > 0 && (
                  <p className="text-xs text-slate-500">
                    Consider adding: {result.keywords.suggestions.join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "urls" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">
                URL Validation ({urlResults.length} links)
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={validateUrls}
                disabled={validatingUrls}
              >
                {validatingUrls ? "Validating..." : "Validate All URLs"}
              </Button>
            </div>
            
            {urlResults.length === 0 ? (
              <p className="text-slate-500 text-sm">No external URLs found in content.</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {urlResults.map((urlItem, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      urlItem.status === "valid"
                        ? "border-green-200 bg-green-50"
                        : urlItem.status === "invalid"
                          ? "border-red-200 bg-red-50"
                          : urlItem.status === "redirect"
                            ? "border-yellow-200 bg-yellow-50"
                            : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">
                        {urlItem.status === "valid" && "✓"}
                        {urlItem.status === "invalid" && "✗"}
                        {urlItem.status === "redirect" && "→"}
                        {urlItem.status === "skipped" && "○"}
                        {urlItem.status === "checking" && "..."}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono truncate">{urlItem.url}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {urlItem.statusCode && (
                            <span className="text-xs text-slate-500">
                              HTTP {urlItem.statusCode}
                            </span>
                          )}
                          {urlItem.responseTime && (
                            <span className="text-xs text-slate-500">
                              {urlItem.responseTime}ms
                            </span>
                          )}
                          {urlItem.error && (
                            <span className="text-xs text-red-600">{urlItem.error}</span>
                          )}
                          {!urlItem.isApprovedDefangUrl && urlItem.url.includes("defang") && (
                            <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                              Not in approved list
                            </Badge>
                          )}
                        </div>
                        {urlItem.redirectTo && (
                          <p className="text-xs text-slate-500 mt-1 truncate">
                            → {urlItem.redirectTo}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Checks for this category */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Checks</p>
              <div className="space-y-1">
                {result.categories.urls.checks.map((check, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className={check.passed ? "text-green-600" : "text-red-600"}>
                      {check.passed ? "✓" : "✗"}
                    </span>
                    <span className={check.passed ? "text-slate-600" : "text-slate-900"}>
                      {check.name}
                    </span>
                    <span className="text-slate-400 text-xs">— {check.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {(activeTab === "content" || activeTab === "technical" || activeTab === "defang") && (
          <div className="space-y-4">
            <div className="space-y-1">
              {result.categories[activeTab].checks.map((check, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50">
                  <span className={`mt-0.5 ${check.passed ? "text-green-600" : check.severity === "error" ? "text-red-600" : check.severity === "warning" ? "text-yellow-600" : "text-blue-600"}`}>
                    {check.passed ? "✓" : getSeverityIcon(check.severity)}
                  </span>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${check.passed ? "text-slate-600" : "text-slate-900"}`}>
                      {check.name}
                    </p>
                    <p className="text-xs text-slate-500">{check.message}</p>
                    {check.details && (
                      <p className="text-xs text-slate-400 mt-1 font-mono truncate">
                        {check.details.slice(0, 80)}
                        {check.details.length > 80 && "..."}
                      </p>
                    )}
                    {check.suggestion && (
                      <p className="text-xs text-blue-600 mt-1">{check.suggestion}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Related Issues */}
            {result.issues.filter(i => i.category === activeTab).length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-slate-700 mb-2">Issues to Address</p>
                <div className="space-y-2">
                  {result.issues
                    .filter(i => i.category === activeTab)
                    .map((issue, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${getSeverityColor(issue.severity)}`}
                      >
                        <div className="flex items-start gap-2">
                          <span>{getSeverityIcon(issue.severity)}</span>
                          <div>
                            <p className="text-sm font-medium">{issue.title}</p>
                            <p className="text-xs opacity-80">{issue.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
