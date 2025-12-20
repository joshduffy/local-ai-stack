const OLLAMA_URL = 'http://127.0.0.1:11434';

export interface OllamaModel {
  name: string;
  model: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  model: string;
  created_at: string;
  message: ChatMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface GenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

// Check if Ollama is running
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

// List installed models
export async function listModels(): Promise<OllamaModel[]> {
  const response = await fetch(`${OLLAMA_URL}/api/tags`);
  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }
  const data = await response.json();
  return data.models || [];
}

// Generate completion (non-streaming)
export async function generate(
  model: string,
  prompt: string,
  options?: { system?: string; context?: number[] }
): Promise<GenerateResponse> {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      system: options?.system,
      context: options?.context,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate response');
  }

  return response.json();
}

// Chat completion (non-streaming)
export async function chat(
  model: string,
  messages: ChatMessage[],
  options?: { system?: string }
): Promise<ChatResponse> {
  const allMessages = options?.system
    ? [{ role: 'system' as const, content: options.system }, ...messages]
    : messages;

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: allMessages,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get chat response');
  }

  return response.json();
}

// Streaming chat - returns a ReadableStream for SSE conversion
export async function streamChat(
  model: string,
  messages: ChatMessage[],
  options?: { system?: string }
): Promise<Response> {
  const allMessages = options?.system
    ? [{ role: 'system' as const, content: options.system }, ...messages]
    : messages;

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: allMessages,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to start chat stream');
  }

  return response;
}

// Get model info
export async function getModelInfo(model: string): Promise<OllamaModel | null> {
  const models = await listModels();
  return models.find((m) => m.name === model || m.model === model) || null;
}

// Calculate tokens per second from response
export function calculateTokensPerSecond(response: ChatResponse | GenerateResponse): number | null {
  if (!response.eval_count || !response.eval_duration) {
    return null;
  }
  // eval_duration is in nanoseconds
  const seconds = response.eval_duration / 1e9;
  return response.eval_count / seconds;
}
