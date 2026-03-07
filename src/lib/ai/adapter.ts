export interface AIResponse {
  text: string;
  // add metadata if needed
}

export interface AIProvider {
  generate(prompt: string, context?: any): Promise<AIResponse>;
}
