import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db/client';
import { eq, desc } from 'drizzle-orm';

// GET - List all jobs
export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '50');
  const status = request.nextUrl.searchParams.get('status');
  const type = request.nextUrl.searchParams.get('type');

  try {
    let query = db.select().from(schema.jobs).orderBy(desc(schema.jobs.createdAt)).limit(limit);

    // Note: Drizzle requires chaining for where clauses
    // For simplicity, we'll filter in memory for now
    const jobs = await query;

    const filteredJobs = jobs.filter((job) => {
      if (status && job.status !== status) return false;
      if (type && job.type !== type) return false;
      return true;
    });

    return NextResponse.json({ jobs: filteredJobs });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch jobs', details: String(error) }, { status: 500 });
  }
}

// DELETE - Delete a job
export async function DELETE(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('id');

  if (!jobId) {
    return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
  }

  try {
    await db.delete(schema.jobs).where(eq(schema.jobs.id, jobId));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete job', details: String(error) }, { status: 500 });
  }
}
