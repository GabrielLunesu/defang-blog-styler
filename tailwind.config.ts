import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/mastra/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // Safelist classes used by AI-generated blog content
  safelist: [
    // Layout & Spacing
    { pattern: /^(m|p)(t|r|b|l|x|y)?-(0|1|2|3|4|5|6|8|10|12|14|16|20|24)$/ },
    { pattern: /^(space|gap)-(x|y)?-(0|1|2|3|4|5|6|8)$/ },
    { pattern: /^(w|h|max-w)-(full|auto|screen|prose|4xl|6|8|px)$/ },
    // Flexbox & Grid
    { pattern: /^(flex|grid|inline-flex|inline-block|block|hidden)$/ },
    { pattern: /^(flex-col|flex-row|flex-wrap|flex-1)$/ },
    { pattern: /^(items|justify|self)-(start|end|center|between|stretch)$/ },
    { pattern: /^grid-cols-(1|2|3|4|5|6)$/ },
    { pattern: /^col-span-(1|2|3|4|5|6)$/ },
    // Typography
    { pattern: /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)$/ },
    { pattern: /^text-(left|center|right)$/ },
    { pattern: /^font-(normal|medium|semibold|bold|mono)$/ },
    { pattern: /^(leading|tracking)-(tight|normal|relaxed|wide|widest|\[[\d.]+em\])$/ },
    { pattern: /^(uppercase|lowercase|capitalize|italic|underline|line-through|no-underline)$/ },
    { pattern: /^underline-offset-(1|2|4|8|auto)$/ },
    // Colors - Slate
    { pattern: /^(text|bg|border|from|to|via)-slate-(50|100|200|300|400|500|600|700|800|900)$/ },
    // Colors - Blue
    { pattern: /^(text|bg|border|from|to|via)-blue-(50|100|200|300|400|500|600|700|800|900)$/ },
    // Colors - Emerald/Green
    { pattern: /^(text|bg|border|from|to|via)-emerald-(50|100|200|300|400|500|600|700|800|900)$/ },
    { pattern: /^(text|bg|border|from|to|via)-green-(50|100|200|300|400|500|600|700|800|900)$/ },
    // Colors - Amber/Yellow
    { pattern: /^(text|bg|border|from|to|via)-amber-(50|100|200|300|400|500|600|700|800|900)$/ },
    { pattern: /^(text|bg|border|from|to|via)-yellow-(50|100|200|300|400|500|600|700|800|900)$/ },
    // Colors - Red
    { pattern: /^(text|bg|border|from|to|via)-red-(50|100|200|300|400|500|600|700|800|900)$/ },
    // Colors - Purple/Indigo
    { pattern: /^(text|bg|border|from|to|via)-purple-(50|100|200|300|400|500|600|700|800|900)$/ },
    { pattern: /^(text|bg|border|from|to|via)-indigo-(50|100|200|300|400|500|600|700|800|900)$/ },
    // Colors - White/Black
    { pattern: /^(text|bg|border)-(white|black|transparent)$/ },
    // Borders & Radius
    { pattern: /^border-(0|2|4|8)?$/ },
    { pattern: /^border-(t|r|b|l)-(0|2|4|8)?$/ },
    { pattern: /^rounded-(none|sm|md|lg|xl|2xl|3xl|full)$/ },
    { pattern: /^rounded-(t|r|b|l|tl|tr|bl|br)-(none|sm|md|lg|xl|2xl|3xl|full)$/ },
    // Shadows
    { pattern: /^shadow-(none|sm|md|lg|xl|2xl)$/ },
    // Effects & Transforms
    { pattern: /^(opacity|blur|brightness)-(0|25|50|75|100)$/ },
    { pattern: /^-?translate-(x|y)-(0|0\.5|1|2|4|full)$/ },
    { pattern: /^(scale|rotate)-(0|45|90|180)$/ },
    { pattern: /^transition-(all|colors|transform|opacity|shadow)$/ },
    // Overflow & Position
    { pattern: /^overflow-(auto|hidden|scroll|visible|x-auto|y-auto)$/ },
    { pattern: /^(relative|absolute|fixed|sticky)$/ },
    { pattern: /^(top|right|bottom|left|inset)-(0|1|2|4|auto)$/ },
    { pattern: /^z-(0|10|20|30|40|50|auto)$/ },
    // Hover states
    { pattern: /^hover:(text|bg|border|shadow|scale|translate|opacity)-/, variants: ["hover"] },
    { pattern: /^hover:-translate-y-/, variants: ["hover"] },
    // Group utilities
    { pattern: /^group-open:(rotate|opacity|scale)-/, variants: ["group-open"] },
    // Responsive
    { pattern: /^(sm|md|lg|xl|2xl):/, variants: ["sm", "md", "lg", "xl", "2xl"] },
    // Gradients
    "bg-gradient-to-r",
    "bg-gradient-to-l",
    "bg-gradient-to-t",
    "bg-gradient-to-b",
    "bg-gradient-to-br",
    "bg-gradient-to-bl",
    "bg-gradient-to-tr",
    "bg-gradient-to-tl",
    // Specific utilities
    "cursor-pointer",
    "select-none",
    "list-none",
    "list-disc",
    "list-decimal",
    "divide-y",
    "divide-x",
    "divide-slate-100",
    "divide-slate-200",
    "backdrop-blur",
    "backdrop-blur-sm",
    "min-h-screen",
    "aspect-video",
    "aspect-square",
    "object-cover",
    "object-contain",
    "group",
    "peer",
    // Opacity-based colors for glass effects
    "bg-white/5",
    "bg-white/10",
    "bg-white/20",
    "bg-white/30",
    "bg-black/5",
    "bg-black/10",
    "bg-black/20",
    "bg-black/50",
    "border-white/10",
    "border-white/20",
    "border-white/30",
    "border-slate-200/60",
    "from-blue-50/30",
    "from-blue-50/50",
    "to-blue-50/30",
    "via-slate-800",
    "shadow-blue-500/25",
    "shadow-blue-500/50",
    // Duration utilities
    "duration-200",
    "duration-300",
    "duration-500",
    // Additional hover states
    "hover:from-blue-700",
    "hover:to-blue-800",
    "hover:bg-white/20",
    "hover:bg-blue-500",
    "hover:-translate-y-1",
    "hover:translate-x-1",
    "hover:border-blue-500",
    // Group hover states
    "group-hover:translate-x-1",
    "group-hover:scale-105",
    // SVG sizing
    "w-4",
    "w-5",
    "h-4",
    "h-5",
    // Negative margins
    "-ml-px",
    "-translate-y-1",
    // Icon container sizing
    "w-6",
    "w-7",
    "w-8",
    "w-10",
    "h-6",
    "h-7",
    "h-8",
    "h-10",
    // Border left widths
    "border-l",
    "border-l-2",
    "border-l-4",
    // Padding left
    "pl-2",
    "pl-4",
    "pl-6",
    // Rounded variants
    "rounded-lg",
    "rounded-r-xl",
    // Flex utilities
    "flex-1",
    "items-center",
    "justify-center",
    // Text colors for TOC
    "text-white",
    "text-slate-600",
    "text-slate-800",
    // Hover text colors
    "hover:text-blue-600",
    "hover:text-blue-800",
    // Block display
    "block",
    // Padding y
    "py-1",
    "py-2",
    // Border transparent
    "border-transparent",
    // Nav spacing
    "mb-3",
    "mb-5",
    "gap-3",
    "space-y-3",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
