export interface LlmConfig {
  provider: 'anthropic' | 'openai';
  apiKey: string;
  model: string;
}

export type LlmClient = (systemPrompt: string, userMessage: string) => Promise<string>;
