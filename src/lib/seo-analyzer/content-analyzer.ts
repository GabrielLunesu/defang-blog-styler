// Content Quality Analyzer

import type { AnalyzerContext, CategoryResult, CheckResult, SEOIssue } from "./types";

export function analyzeContent(ctx: AnalyzerContext): {
  category: CategoryResult;
  issues: SEOIssue[];
} {
  const checks: CheckResult[] = [];
  const issues: SEOIssue[] = [];

  // 1. Title length check (50-60 chars optimal)
  const title = ctx.seoMetadata?.title || "";
  const titleLength = title.length;
  const titleCheck: CheckResult = {
    id: "title-length",
    name: "Title Length",
    passed: titleLength >= 50 && titleLength <= 60,
    severity: titleLength === 0 ? "error" : "warning",
    message: titleLength === 0
      ? "Missing meta title"
      : titleLength < 50
        ? `Title too short (${titleLength} chars, recommended: 50-60)`
        : titleLength > 60
          ? `Title too long (${titleLength} chars, recommended: 50-60)`
          : `Title length is optimal (${titleLength} chars)`,
    details: title || undefined,
  };
  checks.push(titleCheck);
  if (!titleCheck.passed) {
    issues.push({
      id: "title-length",
      severity: titleCheck.severity,
      category: "content",
      title: "Title Length Issue",
      description: titleCheck.message,
      currentValue: title,
      suggestedValue: titleLength > 60 ? title.slice(0, 57) + "..." : undefined,
      autoFixable: titleLength > 60,
      fixAction: "truncate",
    });
  }

  // 2. Meta description length (150-160 chars optimal)
  const description = ctx.seoMetadata?.description || "";
  const descLength = description.length;
  const descCheck: CheckResult = {
    id: "description-length",
    name: "Meta Description Length",
    passed: descLength >= 150 && descLength <= 160,
    severity: descLength === 0 ? "error" : "warning",
    message: descLength === 0
      ? "Missing meta description"
      : descLength < 150
        ? `Description too short (${descLength} chars, recommended: 150-160)`
        : descLength > 160
          ? `Description too long (${descLength} chars, recommended: 150-160)`
          : `Description length is optimal (${descLength} chars)`,
    details: description || undefined,
  };
  checks.push(descCheck);
  if (!descCheck.passed) {
    issues.push({
      id: "description-length",
      severity: descCheck.severity,
      category: "content",
      title: "Meta Description Issue",
      description: descCheck.message,
      currentValue: description,
      suggestedValue: descLength > 160 ? description.slice(0, 157) + "..." : undefined,
      autoFixable: descLength > 160,
      fixAction: "truncate",
    });
  }

  // 3. Has TL;DR/summary
  const hasTldr = /tl;?dr|summary|key takeaway/i.test(ctx.content);
  const tldrCheck: CheckResult = {
    id: "has-tldr",
    name: "Has TL;DR/Summary",
    passed: hasTldr,
    severity: "info",
    message: hasTldr
      ? "Content includes a TL;DR or summary section"
      : "Consider adding a TL;DR for quick scanning",
  };
  checks.push(tldrCheck);
  if (!tldrCheck.passed) {
    issues.push({
      id: "has-tldr",
      severity: "info",
      category: "content",
      title: "Missing TL;DR",
      description: "Adding a TL;DR helps readers quickly understand the main points",
      autoFixable: false,
    });
  }

  // 4. Word count check (minimum 500 words)
  const wordCount = ctx.wordCount;
  const wordCountCheck: CheckResult = {
    id: "word-count",
    name: "Word Count",
    passed: wordCount >= 500,
    severity: wordCount < 300 ? "error" : "warning",
    message: wordCount < 500
      ? `Content is thin (${wordCount} words, recommended: 500+)`
      : `Good content length (${wordCount} words)`,
  };
  checks.push(wordCountCheck);
  if (!wordCountCheck.passed) {
    issues.push({
      id: "word-count",
      severity: wordCountCheck.severity,
      category: "content",
      title: "Content Too Short",
      description: `Only ${wordCount} words. Consider adding more detail for better SEO.`,
      autoFixable: false,
    });
  }

  // 5. Heading hierarchy validation
  const headingLevels = ctx.headings.map(h => h.level);
  let hierarchyValid = true;
  let hierarchyMessage = "Heading hierarchy is valid";
  
  // Check for skipped levels
  for (let i = 1; i < headingLevels.length; i++) {
    if (headingLevels[i] > headingLevels[i - 1] + 1) {
      hierarchyValid = false;
      hierarchyMessage = `Heading level skipped: H${headingLevels[i - 1]} to H${headingLevels[i]}`;
      break;
    }
  }
  
  // Check for multiple H1s
  const h1Count = headingLevels.filter(l => l === 1).length;
  if (h1Count > 1) {
    hierarchyValid = false;
    hierarchyMessage = `Multiple H1 tags found (${h1Count}). Use only one H1 per page.`;
  }

  const headingCheck: CheckResult = {
    id: "heading-hierarchy",
    name: "Heading Hierarchy",
    passed: hierarchyValid,
    severity: "error",
    message: hierarchyMessage,
  };
  checks.push(headingCheck);
  if (!headingCheck.passed) {
    issues.push({
      id: "heading-hierarchy",
      severity: "error",
      category: "content",
      title: "Invalid Heading Hierarchy",
      description: hierarchyMessage,
      autoFixable: false,
    });
  }

  // 6. No duplicate headings
  const headingTexts = ctx.headings.map(h => h.text.toLowerCase().trim());
  const duplicates = headingTexts.filter((h, i) => headingTexts.indexOf(h) !== i);
  const noDuplicateHeadings = duplicates.length === 0;
  const duplicateCheck: CheckResult = {
    id: "duplicate-headings",
    name: "Unique Headings",
    passed: noDuplicateHeadings,
    severity: "warning",
    message: noDuplicateHeadings
      ? "All headings are unique"
      : `Duplicate headings found: "${duplicates[0]}"`,
  };
  checks.push(duplicateCheck);
  if (!duplicateCheck.passed) {
    issues.push({
      id: "duplicate-headings",
      severity: "warning",
      category: "content",
      title: "Duplicate Headings",
      description: `Found duplicate heading: "${duplicates[0]}"`,
      autoFixable: false,
    });
  }

  // 7. Images have alt text
  const imagesWithoutAlt = ctx.images.filter(img => !img.alt || img.alt.trim() === "");
  const allImagesHaveAlt = imagesWithoutAlt.length === 0;
  const altCheck: CheckResult = {
    id: "image-alt",
    name: "Image Alt Text",
    passed: allImagesHaveAlt || ctx.images.length === 0,
    severity: "warning",
    message: ctx.images.length === 0
      ? "No images found (consider adding visuals)"
      : allImagesHaveAlt
        ? `All ${ctx.images.length} images have alt text`
        : `${imagesWithoutAlt.length} image(s) missing alt text`,
  };
  checks.push(altCheck);
  if (!altCheck.passed) {
    imagesWithoutAlt.forEach((img, idx) => {
      issues.push({
        id: `image-alt-${idx}`,
        severity: "warning",
        category: "content",
        title: "Missing Image Alt Text",
        description: `Image missing alt text: ${img.src}`,
        currentValue: `<img src="${img.src}" />`,
        suggestedValue: `<img src="${img.src}" alt="Image description" />`,
        autoFixable: true,
        fixAction: "add-alt",
        location: img.line ? { line: img.line, column: 0 } : undefined,
      });
    });
  }

  // 8. Has code examples (for technical content)
  const hasCodeBlocks = /<pre|<code|```/.test(ctx.content);
  const codeCheck: CheckResult = {
    id: "has-code",
    name: "Code Examples",
    passed: hasCodeBlocks,
    severity: "info",
    message: hasCodeBlocks
      ? "Content includes code examples"
      : "Consider adding code examples for technical topics",
  };
  checks.push(codeCheck);

  // 9. Readability (simple check based on sentence length)
  const sentences = ctx.textContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.length > 0
    ? sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length
    : 0;
  const readabilityGood = avgSentenceLength <= 20;
  const readabilityCheck: CheckResult = {
    id: "readability",
    name: "Readability",
    passed: readabilityGood,
    severity: "warning",
    message: readabilityGood
      ? `Good readability (avg ${Math.round(avgSentenceLength)} words/sentence)`
      : `Sentences may be too long (avg ${Math.round(avgSentenceLength)} words, aim for <20)`,
  };
  checks.push(readabilityCheck);
  if (!readabilityCheck.passed) {
    issues.push({
      id: "readability",
      severity: "warning",
      category: "content",
      title: "Readability Could Be Improved",
      description: `Average sentence length is ${Math.round(avgSentenceLength)} words. Consider breaking up long sentences.`,
      autoFixable: false,
    });
  }

  // Calculate score
  const weights: Record<string, number> = {
    "title-length": 5,
    "description-length": 5,
    "has-tldr": 3,
    "word-count": 3,
    "heading-hierarchy": 5,
    "duplicate-headings": 2,
    "image-alt": 4,
    "has-code": 3,
    "readability": 3,
  };

  const maxScore = Object.values(weights).reduce((a, b) => a + b, 0);
  const score = checks.reduce((sum, check) => {
    return sum + (check.passed ? weights[check.id] || 0 : 0);
  }, 0);

  return {
    category: {
      name: "Content Quality",
      score,
      maxScore,
      passed: checks.filter(c => c.passed).length,
      total: checks.length,
      checks,
    },
    issues,
  };
}
