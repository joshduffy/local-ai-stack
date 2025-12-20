import { NextRequest, NextResponse } from 'next/server';
import * as comfyui from '@/lib/comfyui';
import { db, schema } from '@/lib/db/client';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, negativePrompt, width, height, steps, cfg, seed, sampler, scheduler } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const settings: comfyui.WorkflowSettings = {
      prompt,
      negativePrompt,
      width: width ?? 1024,
      height: height ?? 1024,
      steps: steps ?? 20,
      cfg: cfg ?? 7.5,
      seed,
      sampler,
      scheduler,
    };

    // Queue the generation in ComfyUI
    const result = await comfyui.generateImage(settings);

    // Create a job record
    const jobId = uuidv4();
    await db.insert(schema.jobs).values({
      id: jobId,
      type: 'image',
      status: 'pending',
      input: JSON.stringify(settings),
      externalId: result.prompt_id,
      createdAt: new Date(),
    });

    return NextResponse.json({
      jobId,
      promptId: result.prompt_id,
      status: 'queued',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to queue generation', details: String(error) },
      { status: 503 }
    );
  }
}
