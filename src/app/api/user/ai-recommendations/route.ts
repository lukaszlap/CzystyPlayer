import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, insert } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';

export interface AISearchItem {
  id: number;
  query: string;
  content_type: 'movies' | 'series' | 'all';
  ai_message: string | null;
  searched_at: string;
  recommendations: AIRecommendation[];
}

export interface AIRecommendation {
  id: number;
  content_id: number;
  content_type: 'movie' | 'series';
  title: string;
  poster_path: string | null;
  year: string | null;
  rating: number | null;
  categories: string | null;
  match_score: number | null;
  match_reason: string | null;
}

// GET - Fetch user's AI search history with recommendations
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

    const userId = payload.userId;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get searches
    const searches = await query<any[]>(
      `SELECT id, query, content_type, ai_message, searched_at
       FROM user_ai_searches 
       WHERE user_id = ? 
       ORDER BY searched_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    if (!searches || searches.length === 0) {
      return NextResponse.json({
        success: true,
        searches: [],
      });
    }

    // Get recommendations for each search
    const searchIds = searches.map(s => s.id);
    const recommendations = await query<any[]>(
      `SELECT search_id, id, content_id, content_type, title, poster_path, year, rating, categories, match_score, match_reason
       FROM user_ai_recommendations 
       WHERE search_id IN (${searchIds.join(',')})
       ORDER BY match_score DESC`
    );

    // Group recommendations by search
    const recsBySearch: Record<number, AIRecommendation[]> = {};
    for (const rec of recommendations || []) {
      if (!recsBySearch[rec.search_id]) {
        recsBySearch[rec.search_id] = [];
      }
      recsBySearch[rec.search_id].push({
        id: rec.id,
        content_id: rec.content_id,
        content_type: rec.content_type,
        title: rec.title,
        poster_path: rec.poster_path,
        year: rec.year,
        rating: rec.rating,
        categories: rec.categories,
        match_score: rec.match_score,
        match_reason: rec.match_reason,
      });
    }

    // Combine data
    const result: AISearchItem[] = searches.map(s => ({
      id: s.id,
      query: s.query,
      content_type: s.content_type,
      ai_message: s.ai_message,
      searched_at: s.searched_at,
      recommendations: recsBySearch[s.id] || [],
    }));

    return NextResponse.json({
      success: true,
      searches: result,
    });
  } catch (error) {
    console.error('Error fetching AI searches:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Save new AI search with recommendations
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
    const { query: searchQuery, contentType, aiMessage, recommendations } = body;

    if (!searchQuery) {
      return NextResponse.json(
        { success: false, error: 'Missing query' },
        { status: 400 }
      );
    }

    // Insert search
    const searchResult = await insert(
      `INSERT INTO user_ai_searches (user_id, query, content_type, ai_message)
       VALUES (?, ?, ?, ?)`,
      [userId, searchQuery, contentType || 'all', aiMessage || null]
    );

    const searchId = searchResult.insertId;

    // Insert recommendations
    if (recommendations && recommendations.length > 0) {
      const values: any[] = [];
      const placeholders: string[] = [];

      for (const rec of recommendations) {
        placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        values.push(
          searchId,
          userId,
          rec.id || rec.contentId,
          rec.type || rec.contentType,
          rec.title,
          rec.posterPath || rec.poster_path || null,
          rec.year || null,
          rec.rating || null,
          rec.categories || null,
          rec.matchScore || rec.match_score || null,
          rec.matchReason || rec.match_reason || null
        );
      }

      await query(
        `INSERT INTO user_ai_recommendations 
         (search_id, user_id, content_id, content_type, title, poster_path, year, rating, categories, match_score, match_reason)
         VALUES ${placeholders.join(', ')}`,
        values
      );
    }

    return NextResponse.json({
      success: true,
      searchId,
      message: 'Search saved',
    });
  } catch (error) {
    console.error('Error saving AI search:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove AI search and its recommendations
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const searchId = searchParams.get('searchId');
    const clearAll = searchParams.get('clearAll');

    if (clearAll === 'true') {
      // Delete all searches for user (cascade deletes recommendations)
      await query('DELETE FROM user_ai_searches WHERE user_id = ?', [payload.userId]);
      return NextResponse.json({
        success: true,
        message: 'All searches cleared',
      });
    }

    if (!searchId) {
      return NextResponse.json(
        { success: false, error: 'Missing searchId' },
        { status: 400 }
      );
    }

    // Delete specific search (cascade deletes recommendations)
    await query(
      'DELETE FROM user_ai_searches WHERE id = ? AND user_id = ?',
      [parseInt(searchId), payload.userId]
    );

    return NextResponse.json({
      success: true,
      message: 'Search deleted',
    });
  } catch (error) {
    console.error('Error deleting AI search:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
