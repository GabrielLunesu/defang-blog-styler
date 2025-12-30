// SEO Analyzer - Main orchestrator

import type {
  SEOAnalysisResult,
  SEOAnalyzeRequest,
  AnalyzerContext,
  ExtractedLink,
  ExtractedHeading,
  ExtractedImage,
  CategoryResult,
  SEOIssue,
  URLValidationResult,
  KeywordAnalysis,
  CheckResult,
} from "./types";
import { analyzeContent } from "./content-analyzer";
import { isApprovedDefangUrl, isDefangDomain } from "./approved-urls";

// Extract text content from HTML/Markdown
function extractTextContent(content: string, contentType: "html" | "markdown"): string {
  if (contentType === "markdown") {
    // Remove code blocks
    let text = content.replace(/```[\s\S]*?```/g, "");
    // Remove inline code
    text = text.replace(/`[^`]+`/g, "");
    // Remove links but keep text
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    // Remove images
    text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, "");
    // Remove headers markers
    text = text.replace(/^#+\s*/gm, "");
    // Remove bold/italic
    text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
    text = text.replace(/\*([^*]+)\*/g, "$1");
    text = text.replace(/__([^_]+)__/g, "$1");
    text = text.replace(/_([^_]+)_/g, "$1");
    return text;
  } else {
    // HTML
    let text = content.replace(/<script[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
    text = text.replace(/<pre[\s\S]*?<\/pre>/gi, "");
    text = text.replace(/<code[\s\S]*?<\/code>/gi, "");
    text = text.replace(/<[^>]+>/g, " ");
    text = text.replace(/&nbsp;/g, " ");
    text = text.replace(/&amp;/g, "&");
    text = text.replace(/&lt;/g, "<");
    text = text.replace(/&gt;/g, ">");
    return text;
  }
}

// Extract links from content
function extractLinks(content: string, contentType: "html" | "markdown"): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  
  if (contentType === "markdown") {
    // Markdown links: [text](url)
    const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = mdLinkRegex.exec(content)) !== null) {
      const url = match[2];
      if (url.startsWith("http")) {
        links.push({
          url,
          text: match[1],
          isExternal: !isDefangDomain(url),
          hasNoopener: false,
        });
      }
    }
  } else {
    // HTML links
    const htmlLinkRegex = /<a\s+([^>]*href=["']([^"']+)["'][^>]*)>([^<]*)<\/a>/gi;
    let match;
    while ((match = htmlLinkRegex.exec(content)) !== null) {
      const attrs = match[1];
      const url = match[2];
      const text = match[3];
      if (url.startsWith("http")) {
        links.push({
          url,
          text,
          isExternal: !isDefangDomain(url),
          hasNoopener: /rel=["'][^"']*noopener/.test(attrs),
        });
      }
    }
  }
  
  return links;
}

// Extract headings from content
function extractHeadings(content: string, contentType: "html" | "markdown"): ExtractedHeading[] {
  const headings: ExtractedHeading[] = [];
  
  if (contentType === "markdown") {
    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        headings.push({
          level: match[1].length,
          text: match[2].trim(),
          line: idx + 1,
        });
      }
    });
  } else {
    const headingRegex = /<h([1-6])([^>]*)>([^<]+)<\/h[1-6]>/gi;
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      const idMatch = match[2].match(/id=["']([^"']+)["']/);
      headings.push({
        level: parseInt(match[1]),
        text: match[3].trim(),
        id: idMatch ? idMatch[1] : undefined,
      });
    }
  }
  
  return headings;
}

// Extract images from content
function extractImages(content: string, contentType: "html" | "markdown"): ExtractedImage[] {
  const images: ExtractedImage[] = [];
  
  if (contentType === "markdown") {
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    while ((match = imgRegex.exec(content)) !== null) {
      images.push({
        src: match[2],
        alt: match[1] || undefined,
      });
    }
  } else {
    const imgRegex = /<img\s+([^>]+)>/gi;
    let match;
    while ((match = imgRegex.exec(content)) !== null) {
      const attrs = match[1];
      const srcMatch = attrs.match(/src=["']([^"']+)["']/);
      const altMatch = attrs.match(/alt=["']([^"']+)["']/);
      if (srcMatch) {
        images.push({
          src: srcMatch[1],
          alt: altMatch ? altMatch[1] : undefined,
        });
      }
    }
  }
  
  return images;
}

// Analyze URLs
function analyzeUrls(ctx: AnalyzerContext): {
  category: CategoryResult;
  issues: SEOIssue[];
  urlResults: URLValidationResult[];
} {
  const checks: CheckResult[] = [];
  const issues: SEOIssue[] = [];
  const urlResults: URLValidationResult[] = [];

  // Process each link
  for (const link of ctx.links) {
    const isApproved = isApprovedDefangUrl(link.url);
    const isDefang = isDefangDomain(link.url);
    
    urlResults.push({
      url: link.url,
      status: "skipped", // Will be validated via API
      isApprovedDefangUrl: isApproved,
      isExternal: link.isExternal,
    });

    // Check if Defang URL is approved
    if (isDefang && !isApproved) {
      issues.push({
        id: `unapproved-url-${urlResults.length}`,
        severity: "error",
        category: "urls",
        title: "Unapproved Defang URL",
        description: `URL "${link.url}" is not in the approved list`,
        currentValue: link.url,
        autoFixable: false,
      });
    }
  }

  // Check: Uses HTTPS
  const httpUrls = ctx.links.filter(l => l.url.startsWith("http://"));
  const httpsCheck: CheckResult = {
    id: "uses-https",
    name: "Uses HTTPS",
    passed: httpUrls.length === 0,
    severity: "error",
    message: httpUrls.length === 0
      ? "All URLs use HTTPS"
      : `${httpUrls.length} URL(s) use insecure HTTP`,
  };
  checks.push(httpsCheck);
  httpUrls.forEach((link, idx) => {
    issues.push({
      id: `http-url-${idx}`,
      severity: "error",
      category: "urls",
      title: "Insecure HTTP URL",
      description: `URL uses HTTP instead of HTTPS: ${link.url}`,
      currentValue: link.url,
      suggestedValue: link.url.replace("http://", "https://"),
      autoFixable: true,
      fixAction: "replace",
    });
  });

  // Check: External links have noopener
  const externalWithoutNoopener = ctx.links.filter(l => l.isExternal && !l.hasNoopener);
  const noopenerCheck: CheckResult = {
    id: "external-noopener",
    name: "External Links Security",
    passed: externalWithoutNoopener.length === 0,
    severity: "warning",
    message: externalWithoutNoopener.length === 0
      ? "All external links have rel='noopener'"
      : `${externalWithoutNoopener.length} external link(s) missing rel='noopener'`,
  };
  checks.push(noopenerCheck);

  // Check: Has internal links
  const internalLinks = ctx.links.filter(l => !l.isExternal);
  const internalLinksCheck: CheckResult = {
    id: "internal-links",
    name: "Internal Links",
    passed: internalLinks.length >= 3,
    severity: "info",
    message: internalLinks.length >= 3
      ? `Good internal linking (${internalLinks.length} links)`
      : `Consider adding more internal links (currently: ${internalLinks.length})`,
  };
  checks.push(internalLinksCheck);
  if (!internalLinksCheck.passed) {
    issues.push({
      id: "low-internal-links",
      severity: "info",
      category: "urls",
      title: "Low Internal Links",
      description: "Consider adding more links to other Defang documentation pages",
      autoFixable: false,
    });
  }

  // Check: Only approved Defang URLs
  const defangLinks = ctx.links.filter(l => isDefangDomain(l.url));
  const unapprovedDefang = defangLinks.filter(l => !isApprovedDefangUrl(l.url));
  const approvedCheck: CheckResult = {
    id: "approved-defang-urls",
    name: "Approved Defang URLs",
    passed: unapprovedDefang.length === 0,
    severity: "error",
    message: unapprovedDefang.length === 0
      ? "All Defang URLs are from the approved list"
      : `${unapprovedDefang.length} unapproved Defang URL(s) found`,
  };
  checks.push(approvedCheck);

  // Calculate score
  const weights: Record<string, number> = {
    "uses-https": 3,
    "external-noopener": 2,
    "internal-links": 3,
    "approved-defang-urls": 5,
  };

  const maxScore = Object.values(weights).reduce((a, b) => a + b, 0);
  const score = checks.reduce((sum, check) => {
    return sum + (check.passed ? weights[check.id] || 0 : 0);
  }, 0);

  return {
    category: {
      name: "URL Validation",
      score,
      maxScore,
      passed: checks.filter(c => c.passed).length,
      total: checks.length,
      checks,
    },
    issues,
    urlResults,
  };
}

// Analyze technical SEO
function analyzeTechnical(ctx: AnalyzerContext): {
  category: CategoryResult;
  issues: SEOIssue[];
} {
  const checks: CheckResult[] = [];
  const issues: SEOIssue[] = [];

  // Check: Has Schema.org BlogPosting (HTML only)
  const hasSchema = ctx.contentType === "html" && /itemtype=["'][^"']*BlogPosting/.test(ctx.content);
  const schemaCheck: CheckResult = {
    id: "schema-blogposting",
    name: "Schema.org Markup",
    passed: hasSchema || ctx.contentType === "markdown",
    severity: "warning",
    message: ctx.contentType === "markdown"
      ? "Schema.org markup will be added when converting to HTML"
      : hasSchema
        ? "Has Schema.org BlogPosting markup"
        : "Missing Schema.org BlogPosting markup",
  };
  checks.push(schemaCheck);

  // Check: Open Graph title
  const hasOgTitle = !!ctx.seoMetadata?.ogTitle;
  const ogTitleCheck: CheckResult = {
    id: "og-title",
    name: "Open Graph Title",
    passed: hasOgTitle,
    severity: "warning",
    message: hasOgTitle ? "Has Open Graph title" : "Missing Open Graph title",
  };
  checks.push(ogTitleCheck);
  if (!ogTitleCheck.passed) {
    issues.push({
      id: "og-title",
      severity: "warning",
      category: "technical",
      title: "Missing Open Graph Title",
      description: "Add an ogTitle for better social sharing",
      autoFixable: false,
    });
  }

  // Check: Open Graph description
  const hasOgDesc = !!ctx.seoMetadata?.ogDescription;
  const ogDescCheck: CheckResult = {
    id: "og-description",
    name: "Open Graph Description",
    passed: hasOgDesc,
    severity: "warning",
    message: hasOgDesc ? "Has Open Graph description" : "Missing Open Graph description",
  };
  checks.push(ogDescCheck);

  // Check: Uses semantic HTML (HTML only)
  const usesSemanticHtml = ctx.contentType === "markdown" || 
    /<article|<section|<header|<nav|<aside/.test(ctx.content);
  const semanticCheck: CheckResult = {
    id: "semantic-html",
    name: "Semantic HTML",
    passed: usesSemanticHtml,
    severity: "info",
    message: ctx.contentType === "markdown"
      ? "Semantic HTML will be added when converting to HTML"
      : usesSemanticHtml
        ? "Uses semantic HTML elements"
        : "Consider using semantic HTML (article, section, etc.)",
  };
  checks.push(semanticCheck);

  // Check: No disallowed tags
  const disallowedTags = ["script", "iframe", "object", "embed"];
  const foundDisallowed = disallowedTags.filter(tag => 
    new RegExp(`<${tag}[\\s>]`, "i").test(ctx.content)
  );
  const noDisallowedCheck: CheckResult = {
    id: "no-disallowed-tags",
    name: "No Disallowed Tags",
    passed: foundDisallowed.length === 0,
    severity: "error",
    message: foundDisallowed.length === 0
      ? "No disallowed tags found"
      : `Found disallowed tags: ${foundDisallowed.join(", ")}`,
  };
  checks.push(noDisallowedCheck);
  if (!noDisallowedCheck.passed) {
    issues.push({
      id: "disallowed-tags",
      severity: "error",
      category: "technical",
      title: "Disallowed Tags Found",
      description: `Remove these tags: ${foundDisallowed.join(", ")}`,
      autoFixable: false,
    });
  }

  // Calculate score
  const weights: Record<string, number> = {
    "schema-blogposting": 4,
    "og-title": 3,
    "og-description": 3,
    "semantic-html": 3,
    "no-disallowed-tags": 5,
  };

  const maxScore = Object.values(weights).reduce((a, b) => a + b, 0);
  const score = checks.reduce((sum, check) => {
    return sum + (check.passed ? weights[check.id] || 0 : 0);
  }, 0);

  return {
    category: {
      name: "Technical SEO",
      score,
      maxScore,
      passed: checks.filter(c => c.passed).length,
      total: checks.length,
      checks,
    },
    issues,
  };
}

// Analyze Defang-specific requirements
function analyzeDefang(ctx: AnalyzerContext): {
  category: CategoryResult;
  issues: SEOIssue[];
} {
  const checks: CheckResult[] = [];
  const issues: SEOIssue[] = [];

  // Check: Only mentions AWS/GCP (not DigitalOcean, Azure, Playground)
  const forbiddenProviders = [
    { name: "DigitalOcean", regex: /digitalocean/i },
    { name: "Azure", regex: /\bazure\b/i },
    { name: "Playground", regex: /\bplayground\b/i },
    { name: "Heroku", regex: /\bheroku\b/i },
  ];
  
  const foundForbidden = forbiddenProviders.filter(p => p.regex.test(ctx.textContent));
  const providersCheck: CheckResult = {
    id: "only-aws-gcp",
    name: "Only AWS/GCP Providers",
    passed: foundForbidden.length === 0,
    severity: "error",
    message: foundForbidden.length === 0
      ? "Only mentions AWS and GCP"
      : `Found forbidden providers: ${foundForbidden.map(p => p.name).join(", ")}`,
  };
  checks.push(providersCheck);
  foundForbidden.forEach(provider => {
    issues.push({
      id: `forbidden-provider-${provider.name}`,
      severity: "error",
      category: "defang",
      title: `Forbidden Provider: ${provider.name}`,
      description: `Remove mentions of ${provider.name}. Only AWS and GCP should be mentioned.`,
      autoFixable: false,
    });
  });

  // Check: No dashes in prose (em-dashes, en-dashes used as punctuation)
  // Look for dashes surrounded by spaces or at sentence boundaries
  const dashInProse = /\s[-\u2013\u2014]\s|^[-\u2013\u2014]\s|\s[-\u2013\u2014]$/m.test(ctx.textContent);
  const noDashesCheck: CheckResult = {
    id: "no-dashes",
    name: "No Dashes in Prose",
    passed: !dashInProse,
    severity: "warning",
    message: dashInProse
      ? "Found dashes used as punctuation. Use colons, commas, or periods instead."
      : "No dashes used as punctuation",
  };
  checks.push(noDashesCheck);
  if (!noDashesCheck.passed) {
    issues.push({
      id: "dashes-in-prose",
      severity: "warning",
      category: "defang",
      title: "Dashes in Prose",
      description: "Replace em-dashes and en-dashes with colons, commas, or separate sentences",
      autoFixable: false,
    });
  }

  // Check: Has CTA to Defang
  const hasDefangCta = /defang\.io|portal\.defang|docs\.defang/i.test(ctx.content) &&
    /get started|try|deploy|sign up|learn more/i.test(ctx.textContent);
  const ctaCheck: CheckResult = {
    id: "has-cta",
    name: "Has Defang CTA",
    passed: hasDefangCta,
    severity: "info",
    message: hasDefangCta
      ? "Content includes a call-to-action"
      : "Consider adding a call-to-action to Defang",
  };
  checks.push(ctaCheck);
  if (!ctaCheck.passed) {
    issues.push({
      id: "missing-cta",
      severity: "info",
      category: "defang",
      title: "Missing Call-to-Action",
      description: "Add a CTA linking to Defang portal, docs, or Discord",
      autoFixable: false,
    });
  }

  // Check: CLI commands are valid (basic check)
  const cliCommands = ctx.content.match(/defang\s+\w+/g) || [];
  const validCommands = ["compose", "config", "generate", "login", "logout", "logs", "debug", "whoami", "upgrade"];
  const invalidCommands = cliCommands.filter(cmd => {
    const parts = cmd.split(/\s+/);
    return parts.length >= 2 && !validCommands.includes(parts[1]);
  });
  const cliCheck: CheckResult = {
    id: "valid-cli",
    name: "Valid CLI Commands",
    passed: invalidCommands.length === 0,
    severity: "error",
    message: invalidCommands.length === 0
      ? "All CLI commands appear valid"
      : `Potentially invalid CLI commands: ${invalidCommands.join(", ")}`,
  };
  checks.push(cliCheck);
  if (!cliCheck.passed) {
    issues.push({
      id: "invalid-cli",
      severity: "error",
      category: "defang",
      title: "Invalid CLI Commands",
      description: `Check these commands: ${invalidCommands.join(", ")}`,
      autoFixable: false,
    });
  }

  // Calculate score
  const weights: Record<string, number> = {
    "only-aws-gcp": 5,
    "no-dashes": 3,
    "has-cta": 3,
    "valid-cli": 4,
  };

  const maxScore = Object.values(weights).reduce((a, b) => a + b, 0);
  const score = checks.reduce((sum, check) => {
    return sum + (check.passed ? weights[check.id] || 0 : 0);
  }, 0);

  return {
    category: {
      name: "Defang Guidelines",
      score,
      maxScore,
      passed: checks.filter(c => c.passed).length,
      total: checks.length,
      checks,
    },
    issues,
  };
}

// Analyze keywords
function analyzeKeywords(ctx: AnalyzerContext): KeywordAnalysis {
  const text = ctx.textContent.toLowerCase();
  const words = text.split(/\s+/).filter(w => w.length > 3);
  const totalWords = words.length;

  // Primary keywords (Defang-related)
  const primaryKeywords = ["defang", "deploy", "aws", "gcp", "docker", "compose"];
  const primary = primaryKeywords.map(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    const matches = ctx.textContent.match(regex) || [];
    const count = matches.length;
    const density = totalWords > 0 ? (count / totalWords) * 100 : 0;
    return {
      keyword,
      count,
      density,
      status: count === 0 ? "low" : count > 10 ? "high" : "good" as "low" | "high" | "good",
    };
  }).filter(k => k.count > 0 || primaryKeywords.slice(0, 3).includes(k.keyword));

  // Secondary keywords (extracted from content)
  const wordFreq: Record<string, number> = {};
  words.forEach(word => {
    const clean = word.replace(/[^a-z]/g, "");
    if (clean.length > 4 && !primaryKeywords.includes(clean)) {
      wordFreq[clean] = (wordFreq[clean] || 0) + 1;
    }
  });
  
  const secondary = Object.entries(wordFreq)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([keyword, count]) => ({
      keyword,
      count,
      density: (count / totalWords) * 100,
      status: "good" as const,
    }));

  // Suggestions
  const suggestions: string[] = [];
  if (!primary.find(k => k.keyword === "deploy" && k.count > 0)) {
    suggestions.push("deployment");
  }
  if (!text.includes("cloud")) {
    suggestions.push("cloud");
  }
  if (!text.includes("container")) {
    suggestions.push("container");
  }

  const overallDensity = primary.reduce((sum, k) => sum + k.density, 0);

  return {
    primary,
    secondary,
    suggestions,
    overallDensity,
  };
}

// Get score label
function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 70) return "Fair";
  if (score >= 60) return "Needs Work";
  return "Poor";
}

// Main analyze function
export async function analyzeSEO(request: SEOAnalyzeRequest): Promise<SEOAnalysisResult> {
  const { content, contentType, seoMetadata } = request;

  // Build context
  const textContent = extractTextContent(content, contentType);
  const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;
  const links = extractLinks(content, contentType);
  const headings = extractHeadings(content, contentType);
  const images = extractImages(content, contentType);

  const ctx: AnalyzerContext = {
    content,
    contentType,
    seoMetadata,
    textContent,
    wordCount,
    links,
    headings,
    images,
  };

  // Run analyzers
  const contentResult = analyzeContent(ctx);
  const urlResult = analyzeUrls(ctx);
  const technicalResult = analyzeTechnical(ctx);
  const defangResult = analyzeDefang(ctx);
  const keywords = analyzeKeywords(ctx);

  // Combine issues
  const issues = [
    ...urlResult.issues,
    ...contentResult.issues,
    ...technicalResult.issues,
    ...defangResult.issues,
  ];

  // Calculate overall score with weights
  const weights = {
    urls: 0.25,
    content: 0.35,
    technical: 0.20,
    defang: 0.20,
  };

  const overallScore = Math.round(
    (urlResult.category.score / urlResult.category.maxScore) * 100 * weights.urls +
    (contentResult.category.score / contentResult.category.maxScore) * 100 * weights.content +
    (technicalResult.category.score / technicalResult.category.maxScore) * 100 * weights.technical +
    (defangResult.category.score / defangResult.category.maxScore) * 100 * weights.defang
  );

  return {
    overallScore,
    scoreLabel: getScoreLabel(overallScore),
    timestamp: new Date().toISOString(),
    categories: {
      urls: urlResult.category,
      content: contentResult.category,
      technical: technicalResult.category,
      defang: defangResult.category,
    },
    issues,
    urlValidation: urlResult.urlResults,
    keywords,
  };
}

// Validate a single URL
export async function validateUrl(url: string): Promise<URLValidationResult> {
  const isApproved = isApprovedDefangUrl(url);
  const isExternal = !isDefangDomain(url);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const startTime = Date.now();
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        url,
        status: "valid",
        statusCode: response.status,
        responseTime,
        isApprovedDefangUrl: isApproved,
        isExternal,
      };
    } else if (response.status >= 300 && response.status < 400) {
      return {
        url,
        status: "redirect",
        statusCode: response.status,
        redirectTo: response.headers.get("location") || undefined,
        responseTime,
        isApprovedDefangUrl: isApproved,
        isExternal,
      };
    } else {
      return {
        url,
        status: "invalid",
        statusCode: response.status,
        responseTime,
        error: `HTTP ${response.status}`,
        isApprovedDefangUrl: isApproved,
        isExternal,
      };
    }
  } catch (error) {
    return {
      url,
      status: "invalid",
      error: error instanceof Error ? error.message : "Unknown error",
      isApprovedDefangUrl: isApproved,
      isExternal,
    };
  }
}

export * from "./types";
export { isApprovedDefangUrl, isDefangDomain } from "./approved-urls";
