import { NextRequest, NextResponse } from 'next/server';
import * as comfyui from '@/lib/comfyui';
import { db, schema } from '@/lib/db/client';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  const promptId = request.nextUrl.searchParams.get('promptId');
  const jobId = request.nextUrl.searchParams.get('jobId');

  if (!promptId && !jobId) {
    return NextResponse.json({ error: 'promptId or jobId required' }, { status: 400 });
  }

  try {
    let actualPromptId = promptId;

    // If jobId provided, look up the promptId
    if (jobId && !promptId) {
      const job = await db.query.jobs.findFirst({
        where: eq(schema.jobs.id, jobId),
      });
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      actualPromptId = job.externalId;
    }

    if (!actualPromptId) {
      return NextResponse.json({ error: 'No promptId found' }, { status: 400 });
    }

    const result = await comfyui.checkCompletion(actualPromptId);

    if (result.completed) {
      // Update job status if we have a jobId
      if (jobId) {
        const job = await db.query.jobs.findFirst({
          where: eq(schema.jobs.id, jobId),
        });

        if (job) {
          await db
            .update(schema.jobs)
            .set({
              status: result.error ? 'failed' : 'completed',
              output: result.images ? JSON.stringify(result.images) : null,
              error: result.error,
              completedAt: new Date(),
            })
            .where(eq(schema.jobs.id, jobId));

          // Create output records for images
          if (result.images && !result.error) {
            const input = JSON.parse(job.input);
            for (const filename of result.images) {
              await db.insert(schema.outputs).values({
                id: uuidv4(),
                jobId,
                type: 'image',
                filename,
                filepath: `/api/comfyui/image?filename=${encodeURIComponent(filename)}`,
                prompt: input.prompt,
                negativePrompt: input.negativePrompt,
                model: 'sd_xl_base_1.0',
                settings: JSON.stringify({
                  width: input.width,
                  height: input.height,
                  steps: input.steps,
                  cfg: input.cfg,
                  seed: input.seed,
                  sampler: input.sampler,
                  scheduler: input.scheduler,
                }),
                createdAt: new Date(),
              });
            }
          }
        }
      }

      return NextResponse.json({
        status: result.error ? 'error' : 'complete',
        images: result.images?.map((filename) => ({
          filename,
          url: comfyui.getImageUrl(filename),
        })),
        error: result.error,
      });
    }

    return NextResponse.json({ status: 'processing' });
  } catch (error) {
    return NextResponse.json({ status: 'error', error: String(error) }, { status: 500 });
  }
}
