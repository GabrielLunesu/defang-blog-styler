import { readFile } from "node:fs/promises";
import path from "node:path";

let cachedDocs: string | null = null;

export const getDefangDocs = async () => {
  if (cachedDocs !== null) {
    return cachedDocs;
  }

  const docsPath = path.join(process.cwd(), "public", "defang.md");

  try {
    const raw = await readFile(docsPath, "utf8");
    cachedDocs = raw.trim();
  } catch (error) {
    console.warn("Defang docs not found or unreadable:", error);
    cachedDocs = "";
  }

  return cachedDocs;
};
