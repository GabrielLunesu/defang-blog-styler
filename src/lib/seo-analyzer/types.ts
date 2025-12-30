// SEO Analyzer Types

export interface SEOAnalysisResult {
  overallScore: number;
  scoreLabel: string;
  timestamp: string;
  
  categories: {
    urls: CategoryResult;
    content: CategoryResult;
    technical: CategoryResult;
    defang: CategoryResult;
  };
  
  issues: SEOIssue[];
  urlValidation: URLValidationResult[];
  keywords: KeywordAnalysis;
}

export interface CategoryResult {
  name: string;
  score: number;
  maxScore: number;
  passed: number;
  total: number;
  checks: CheckResult[];
}

export interface CheckResult {
  id: string;
  name: string;
  passed: boolean;
  severity: "error" | "warning" | "info";
  message: string;
  details?: string;
  suggestion?: string;
  autoFixable?: boolean;
  location?: { line: number; column: number };
}

export interface SEOIssue {
  id: string;
  severity: "error" | "warning" | "info";
  category: "urls" | "content" | "technical" | "defang";
  title: string;
  description: string;
  location?: { line: number; column: number };
  currentValue?: string;
  suggestedValue?: string;
  autoFixable: boolean;
  fixAction?: string;
}

export interface URLValidationResult {
  url: string;
  status: "valid" | "invalid" | "redirect" | "checking" | "skipped";
  statusCode?: number;
  redirectTo?: string;
  responseTime?: number;
  error?: string;
  isApprovedDefangUrl: boolean;
  isExternal: boolean;
}

export interface KeywordAnalysis {
  primary: KeywordResult[];
  secondary: KeywordResult[];
  suggestions: string[];
  overallDensity: number;
}

export interface KeywordResult {
  keyword: string;
  count: number;
  density: number;
  status: "good" | "low" | "high";
}

export interface SEOAnalyzeRequest {
  content: string;
  contentType: "html" | "markdown";
  seoMetadata?: SEOMetadata;
  validateUrls?: boolean;
}

export interface SEOMetadata {
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

export interface AnalyzerContext {
  content: string;
  contentType: "html" | "markdown";
  seoMetadata?: SEOMetadata;
  textContent: string;
  wordCount: number;
  links: ExtractedLink[];
  headings: ExtractedHeading[];
  images: ExtractedImage[];
}

export interface ExtractedLink {
  url: string;
  text: string;
  line?: number;
  isExternal: boolean;
  hasNoopener: boolean;
}

export interface ExtractedHeading {
  level: number;
  text: string;
  id?: string;
  line?: number;
}

export interface ExtractedImage {
  src: string;
  alt?: string;
  line?: number;
}
