import { NextRequest } from 'next/server';
import * as ollama from '@/lib/ollama';
import { db, schema } from '@/lib/db/client';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const { messages, model, conversationId } = await request.json();

  if (!messages || !model) {
    return new Response(JSON.stringify({ error: 'Missing messages or model' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get streaming response from Ollama
    const ollamaResponse = await ollama.streamChat(model, messages);

    if (!ollamaResponse.body) {
      throw new Error('No response body');
    }

    // Transform Ollama's NDJSON stream to SSE
    const reader = ollamaResponse.body.getReader();
    const decoder = new TextDecoder();

    let fullContent = '';
    let tokenCount = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter((line) => line.trim());

            for (const line of lines) {
              try {
                const data = JSON.parse(line);

                if (data.message?.content) {
                  fullContent += data.message.content;
                  tokenCount++;
                }

                // Send as SSE
                controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);

                if (data.done) {
                  // Save message to database if conversationId provided
                  if (conversationId && fullContent) {
                    await db.insert(schema.messages).values({
                      id: uuidv4(),
                      conversationId,
                      role: 'assistant',
                      content: fullContent,
                      tokenCount,
                      createdAt: new Date(),
                    });
                  }
                }
              } catch {
                // Skip invalid JSON lines
              }
            }
          }

          controller.enqueue('data: [DONE]\n\n');
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to start chat', details: String(error) }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
