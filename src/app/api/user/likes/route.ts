import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, insert } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';

export interface LikeItem {
  id: number;
  content_id: number;
  content_type: 'movie' | 'series';
  liked_at: string;
}

// GET - Fetch user's likes
export async function GET(request: NextRequest) {
  try {
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

    const items = await query<LikeItem[]>(
      `SELECT id, content_id, content_type, liked_at
       FROM user_likes 
       WHERE user_id = ? 
       ORDER BY liked_at DESC`,
      [payload.userId]
    );

    return NextResponse.json({
      success: true,
      items: items || [],
    });
  } catch (error) {
    console.error('Error fetching likes:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Toggle like
export async function POST(request: NextRequest) {
  try {
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
    const { contentId, contentType } = body;

    if (!contentId || !contentType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if liked
    const existing = await queryOne<{ id: number }>(
      'SELECT id FROM user_likes WHERE user_id = ? AND content_id = ? AND content_type = ?',
      [userId, contentId, contentType]
    );

    if (existing) {
      // Remove like
      await query('DELETE FROM user_likes WHERE id = ?', [existing.id]);
      return NextResponse.json({
        success: true,
        liked: false,
        message: 'Like removed',
      });
    } else {
      // Add like
      await insert(
        'INSERT INTO user_likes (user_id, content_id, content_type) VALUES (?, ?, ?)',
        [userId, contentId, contentType]
      );
      return NextResponse.json({
        success: true,
        liked: true,
        message: 'Liked',
      });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Check if item is liked
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, liked: false });
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, liked: false });
    }

    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('contentId');
    const contentType = searchParams.get('contentType');

    if (!contentId || !contentType) {
      return NextResponse.json({ success: false, liked: false });
    }

    await query(
      'DELETE FROM user_likes WHERE user_id = ? AND content_id = ? AND content_type = ?',
      [payload.userId, parseInt(contentId), contentType]
    );

    return NextResponse.json({
      success: true,
      message: 'Like removed',
    });
  } catch (error) {
    console.error('Error removing like:', error);
    return NextResponse.json({ success: false, liked: false });
  }
}
