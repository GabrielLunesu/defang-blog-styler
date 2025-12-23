import { Mastra } from "@mastra/core";
import { blogStylerAgent } from "./agents/blog-styler";

export const mastra = new Mastra({
  agents: { blogStylerAgent },
});
