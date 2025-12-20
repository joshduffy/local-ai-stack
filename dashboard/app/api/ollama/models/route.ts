import { NextResponse } from 'next/server';
import * as ollama from '@/lib/ollama';

export async function GET() {
  try {
    const models = await ollama.listModels();
    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch models', details: String(error) },
      { status: 503 }
    );
  }
}
