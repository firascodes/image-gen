import OpenAI from "openai";

export function getOpenAI() {
  const apiKey =
    typeof window !== "undefined"
      ? localStorage.getItem("OPENAI_API_KEY") || ""
      : process.env.OPENAI_API_KEY || "";
  if (!apiKey) {
    throw new Error(
      "OpenAI API key not found. Please set it in Settings."
    );
  }
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}
