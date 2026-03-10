import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, insert } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';

export interface MyListItem {
  id: number;
  content_id: number;
  content_type: 'movie' | 'series';
  title: string;
  poster_path: string | null;
  year: string | null;
  rating: number | null;
  added_at: string;
}

// GET - Fetch user's my list
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = payload.userId;

    // Get user's list
    const items = await query<MyListItem[]>(
      `SELECT id, content_id, content_type, title, poster_path, year, rating, added_at
       FROM user_my_list 
       WHERE user_id = ? 
       ORDER BY added_at DESC`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      items: items || [],
    });
  } catch (error) {
    console.error('Error fetching my list:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add item to my list
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = payload.userId;
    const body = await request.json();

    const { contentId, contentType, title, posterPath, year, rating } = body;

    if (!contentId || !contentType || !title) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if already in list
    const existing = await queryOne<{ id: number }>(
      'SELECT id FROM user_my_list WHERE user_id = ? AND content_id = ? AND content_type = ?',
      [userId, contentId, contentType]
    );

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Already in list' },
        { status: 409 }
      );
    }

    // Insert new item
    const result = await insert(
      `INSERT INTO user_my_list (user_id, content_id, content_type, title, poster_path, year, rating)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, contentId, contentType, title, posterPath || null, year || null, rating || null]
    );

    return NextResponse.json({
      success: true,
      id: result.insertId,
      message: 'Added to list',
    });
  } catch (error) {
    console.error('Error adding to my list:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove item from my list
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = payload.userId;
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('contentId');
    const contentType = searchParams.get('contentType');

    if (!contentId || !contentType) {
      return NextResponse.json(
        { success: false, error: 'Missing contentId or contentType' },
        { status: 400 }
      );
    }

    await query(
      'DELETE FROM user_my_list WHERE user_id = ? AND content_id = ? AND content_type = ?',
      [userId, parseInt(contentId), contentType]
    );

    return NextResponse.json({
      success: true,
      message: 'Removed from list',
    });
  } catch (error) {
    console.error('Error removing from my list:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
