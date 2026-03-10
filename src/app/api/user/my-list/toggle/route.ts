import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, insert } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';

// GET - Check if item is in user's list
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, inList: false });
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, inList: false });
    }

    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('contentId');
    const contentType = searchParams.get('contentType');

    if (!contentId || !contentType) {
      return NextResponse.json(
        { success: false, error: 'Missing parameters' },
        { status: 400 }
      );
    }

    const existing = await queryOne<{ id: number }>(
      'SELECT id FROM user_my_list WHERE user_id = ? AND content_id = ? AND content_type = ?',
      [payload.userId, parseInt(contentId), contentType]
    );

    return NextResponse.json({
      success: true,
      inList: !!existing,
    });
  } catch (error) {
    console.error('Error checking my list:', error);
    return NextResponse.json({ success: false, inList: false });
  }
}

// POST - Toggle item in list
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
    const { contentId, contentType, title, posterPath, year, rating } = body;

    if (!contentId || !contentType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if in list
    const existing = await queryOne<{ id: number }>(
      'SELECT id FROM user_my_list WHERE user_id = ? AND content_id = ? AND content_type = ?',
      [userId, contentId, contentType]
    );

    if (existing) {
      // Remove from list
      await query(
        'DELETE FROM user_my_list WHERE id = ?',
        [existing.id]
      );
      return NextResponse.json({
        success: true,
        inList: false,
        message: 'Removed from list',
      });
    } else {
      // Add to list
      await insert(
        `INSERT INTO user_my_list (user_id, content_id, content_type, title, poster_path, year, rating)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, contentId, contentType, title || 'Unknown', posterPath || null, year || null, rating || null]
      );
      return NextResponse.json({
        success: true,
        inList: true,
        message: 'Added to list',
      });
    }
  } catch (error) {
    console.error('Error toggling my list:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
