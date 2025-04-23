// Export the interface so it can be imported elsewhere
export interface UsageDetails {
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  input_tokens_details?: {
    text_tokens?: number;
    image_tokens?: number;
  };
}

// Prices per 1 million tokens
const TEXT_INPUT_COST_PER_MILLION = 5.00;
const IMAGE_INPUT_COST_PER_MILLION = 10.00;
const OUTPUT_COST_PER_MILLION = 40.00;

export function calculateCost(usage: UsageDetails): number {
  let cost = 0;

  const textInputTokens = usage.input_tokens_details?.text_tokens ?? 0;
  const imageInputTokens = usage.input_tokens_details?.image_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;

  // Fallback if input_tokens_details is not available (use total input tokens as text)
  const totalInputTokens = usage.input_tokens ?? 0;
  const usedTextInputTokens = textInputTokens > 0 ? textInputTokens : (imageInputTokens === 0 ? totalInputTokens : 0);

  cost += (usedTextInputTokens / 1_000_000) * TEXT_INPUT_COST_PER_MILLION;
  cost += (imageInputTokens / 1_000_000) * IMAGE_INPUT_COST_PER_MILLION;
  cost += (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;

  // Note: This calculation assumes the usage object is from a model like GPT-4 Vision.
  // It does NOT include separate image generation costs (like DALL-E).

  return cost;
}
