# Defang Blog Styler

A Next.js app powered by [Mastra](https://mastra.ai) and Claude that transforms raw blog content into production-ready HTML with Defang branding.

![Blog Styler Screenshot](screenshot.png)

## Features

- 🎨 **Brand-Aligned Output** — Generates HTML following Defang's design system
- ⚡ **Streaming** — Watch HTML generate in real-time
- 📋 **Copy & Download** — Export styled HTML instantly
- 🔄 **Live Preview** — See rendered output with AOS animations
- 🚀 **One-Click Deploy** — Deploy to AWS with Defang

## Quick Start

### Local Development

```bash
# Clone the repo
git clone https://github.com/DefangLabs/blog-styler
cd blog-styler

# Install dependencies
npm install

# Set your Anthropic API key
cp .env.example .env.local
# Edit .env.local with your key

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

### Deploy to AWS with Defang

```bash
# Install Defang CLI
npm install -g defang

# Login
defang login

# Set your API key
defang config set ANTHROPIC_API_KEY

# Deploy
defang compose up --provider=aws
```

Your app will be live in ~3 minutes!

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── style/
│   │   │       ├── route.ts        # Standard API endpoint
│   │   │       └── stream/
│   │   │           └── route.ts    # Streaming endpoint
│   │   ├── page.tsx                # Main UI
│   │   ├── layout.tsx              # Root layout with AOS
│   │   └── globals.css             # Tailwind styles
│   └── mastra/
│       ├── agents/
│       │   └── blog-styler.ts      # Mastra agent definition
│       └── index.ts                # Mastra initialization
├── compose.yaml                    # Defang deployment config
├── Dockerfile                      # Container config
└── package.json
```

## API Reference

### POST /api/style

Transform raw blog content into styled HTML.

**Request:**
```json
{
  "content": "Your raw blog content with markdown..."
}
```

**Response:**
```json
{
  "html": "<article class=\"defang-blog\">...</article>",
  "status": "success"
}
```

### POST /api/style/stream

Same as above, but streams the response for real-time display.

## Customization

### Modify the Agent

Edit `src/mastra/agents/blog-styler.ts` to:
- Change the system prompt
- Add new component patterns
- Adjust brand colors

### Add Tools

Extend the agent with Mastra tools:

```typescript
import { createTool } from "@mastra/core";

const seoTool = createTool({
  id: "generate-seo",
  description: "Generate meta description and schema markup",
  inputSchema: z.object({
    title: z.string(),
    content: z.string(),
  }),
  execute: async ({ title, content }) => {
    // Generate SEO data
  },
});
```

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **AI Agent:** Mastra + Claude claude-sonnet-4-20250514
- **Styling:** Tailwind CSS
- **Animations:** AOS (Animate On Scroll)
- **Deployment:** Defang

## Links

- [Defang Portal](https://portal.defang.io)
- [Defang Docs](https://docs.defang.io)
- [Mastra Docs](https://mastra.ai/docs)
- [Discord Community](https://s.defang.io/discord)

## License

MIT
