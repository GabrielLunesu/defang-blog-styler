import { Mastra } from "@mastra/core";
import { blogStylerAgent } from "./agents/blog-styler";
import { blogCreatorAgent } from "./agents/blog-creator";

export const mastra = new Mastra({
  agents: { blogStylerAgent, blogCreatorAgent },
});
