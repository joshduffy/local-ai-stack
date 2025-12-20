import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db/client';
import { eq, desc, like } from 'drizzle-orm';

// GET - List gallery items
export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '50');
  const offset = parseInt(request.nextUrl.searchParams.get('offset') ?? '0');
  const search = request.nextUrl.searchParams.get('search');
  const favoritesOnly = request.nextUrl.searchParams.get('favorites') === 'true';

  try {
    let outputs = await db
      .select()
      .from(schema.outputs)
      .orderBy(desc(schema.outputs.createdAt))
      .limit(limit)
      .offset(offset);

    // Filter in memory (Drizzle SQLite has limited dynamic where support)
    if (search) {
      const searchLower = search.toLowerCase();
      outputs = outputs.filter(
        (o) =>
          o.prompt?.toLowerCase().includes(searchLower) || o.tags?.toLowerCase().includes(searchLower)
      );
    }

    if (favoritesOnly) {
      outputs = outputs.filter((o) => o.favorite);
    }

    return NextResponse.json({
      outputs,
      hasMore: outputs.length === limit,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch gallery', details: String(error) },
      { status: 500 }
    );
  }
}

// PATCH - Update a gallery item (favorite, tags)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, favorite, tags } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const updates: Partial<{ favorite: boolean; tags: string }> = {};
    if (typeof favorite === 'boolean') updates.favorite = favorite;
    if (tags !== undefined) updates.tags = JSON.stringify(tags);

    await db.update(schema.outputs).set(updates).where(eq(schema.outputs.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update item', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE - Delete a gallery item
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  try {
    await db.delete(schema.outputs).where(eq(schema.outputs.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete item', details: String(error) },
      { status: 500 }
    );
  }
}
