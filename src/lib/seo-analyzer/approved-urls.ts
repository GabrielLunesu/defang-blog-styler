// Approved Defang URLs - only these should be used in blog content

export const APPROVED_DEFANG_URLS = [
  // General
  "https://portal.defang.io",
  "https://docs.defang.io",
  "https://defang.io/samples",
  "https://s.defang.io/discord",
  "https://github.com/DefangLabs",
  "https://defang.io/pricing",
  "https://defang.io",

  // Getting Started
  "https://docs.defang.io/docs/intro/getting-started",
  "https://docs.defang.io/docs/concepts/authentication",

  // Concepts
  "https://docs.defang.io/docs/concepts/compose",
  "https://docs.defang.io/docs/concepts/services",
  "https://docs.defang.io/docs/concepts/deployments",
  "https://docs.defang.io/docs/concepts/configuration",
  "https://docs.defang.io/docs/concepts/domains",
  "https://docs.defang.io/docs/concepts/networking",
  "https://docs.defang.io/docs/concepts/ai-tracing/overview",
  "https://docs.defang.io/docs/concepts/security",
  "https://docs.defang.io/docs/concepts/debug",
  "https://docs.defang.io/docs/concepts/defang-byoc",
  "https://docs.defang.io/docs/concepts/pulumi",
  "https://docs.defang.io/docs/concepts/generate",
  "https://docs.defang.io/docs/concepts/scaling",
  "https://docs.defang.io/docs/concepts/local-development",

  // Providers
  "https://docs.defang.io/docs/providers/aws",
  "https://docs.defang.io/docs/providers/gcp",

  // Managed Storage
  "https://docs.defang.io/docs/concepts/managed-storage/managed-postgres",
  "https://docs.defang.io/docs/concepts/managed-storage/managed-redis",
  "https://docs.defang.io/docs/concepts/managed-storage/managed-mongodb",
  "https://docs.defang.io/docs/concepts/managed-storage/managed-object-storage",

  // Managed LLMs
  "https://docs.defang.io/docs/concepts/managed-llms/managed-language-models",

  // Tutorials
  "https://docs.defang.io/docs/tutorials/deploy-to-aws",
  "https://docs.defang.io/docs/tutorials/deploy-to-gcp",
  "https://docs.defang.io/docs/tutorials/use-your-own-domain-name",
  "https://docs.defang.io/docs/tutorials/deploying-from-github-actions",
  "https://docs.defang.io/docs/tutorials/deploy-using-pulumi",
  "https://docs.defang.io/docs/tutorials/generate-new-code-using-ai",
  "https://docs.defang.io/docs/tutorials/configure-environment-variables",
  "https://docs.defang.io/docs/tutorials/deploy-container-using-the-cli",
  "https://docs.defang.io/docs/tutorials/monitoring-your-services",
  "https://docs.defang.io/docs/tutorials/scaling-your-services",
  "https://docs.defang.io/docs/tutorials/migrating-from-heroku",
  "https://docs.defang.io/docs/tutorials/deploy-openai-apps",
  "https://docs.defang.io/docs/tutorials/deploy-with-gpu",
  "https://docs.defang.io/docs/tutorials/deploying-with-the-defang-mcp-server",

  // CLI Reference
  "https://docs.defang.io/docs/cli",
  "https://docs.defang.io/docs/cli/defang_compose_up",
  "https://docs.defang.io/docs/cli/defang_compose_down",
  "https://docs.defang.io/docs/cli/defang_config",
  "https://docs.defang.io/docs/cli/defang_generate",
  "https://docs.defang.io/docs/cli/defang_login",
  "https://docs.defang.io/docs/cli/defang_logs",
] as const;

// Domains that are considered "Defang" domains
export const DEFANG_DOMAINS = [
  "defang.io",
  "docs.defang.io",
  "portal.defang.io",
  "s.defang.io",
  "github.com/DefangLabs",
  "github.com/defang-io",
] as const;

// Check if URL is an approved Defang URL
export function isApprovedDefangUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const normalizedUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/$/, "");
    
    // Check exact match
    if (APPROVED_DEFANG_URLS.includes(normalizedUrl as typeof APPROVED_DEFANG_URLS[number])) {
      return true;
    }
    
    // Check if it's a subpath of an approved URL
    for (const approved of APPROVED_DEFANG_URLS) {
      if (normalizedUrl.startsWith(approved)) {
        return true;
      }
    }
    
    return false;
  } catch {
    return false;
  }
}

// Check if URL is a Defang domain (even if not in approved list)
export function isDefangDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.host.toLowerCase();
    
    return DEFANG_DOMAINS.some(domain => 
      host === domain || host.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

// Get suggested replacement for unapproved Defang URLs
export function getSuggestedUrl(url: string): string | null {
  const lowerUrl = url.toLowerCase();
  
  // Common patterns and their replacements
  const suggestions: Record<string, string> = {
    "playground": "https://docs.defang.io/docs/providers/aws",
    "digitalocean": "https://docs.defang.io/docs/providers/gcp",
    "azure": "https://docs.defang.io/docs/providers/aws",
    "postgres": "https://docs.defang.io/docs/concepts/managed-storage/managed-postgres",
    "redis": "https://docs.defang.io/docs/concepts/managed-storage/managed-redis",
    "mongodb": "https://docs.defang.io/docs/concepts/managed-storage/managed-mongodb",
  };
  
  for (const [pattern, suggestion] of Object.entries(suggestions)) {
    if (lowerUrl.includes(pattern)) {
      return suggestion;
    }
  }
  
  // Default to docs home
  if (isDefangDomain(url)) {
    return "https://docs.defang.io";
  }
  
  return null;
}
