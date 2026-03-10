import { NextRequest, NextResponse } from 'next/server';
import { 
  updateWatchProgress, 
  getContinueWatching, 
  getWatchHistory,
  getWatchProgress, 
  getLastWatchedEpisode,
  markAsCompleted,
  removeFromHistory,
  getUserStats
} from '@/lib/watchProgress';

// GET /api/watch - Get continue watching or watch history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action') || 'continue';
    const limit = parseInt(searchParams.get('limit') || '10');
    const contentId = searchParams.get('contentId');
    const contentType = searchParams.get('contentType') as 'movie' | 'series' | null;
    const seasonNumber = searchParams.get('seasonNumber');
    const episodeNumber = searchParams.get('episodeNumber');

    console.log('[API/watch GET] Request params:', { userId, action, contentId, contentType, seasonNumber, episodeNumber });

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return NextResponse.json(
        { success: false, error: 'Invalid userId' },
        { status: 400 }
      );
    }

    let data;
    switch (action) {
      case 'continue':
        data = await getContinueWatching(userIdNum, limit);
        break;
      case 'history':
        data = await getWatchHistory(userIdNum, limit);
        break;
      case 'stats':
        data = await getUserStats(userIdNum);
        break;
      case 'progress':
        // Get progress for specific content
        if (!contentId || !contentType) {
          return NextResponse.json(
            { success: false, error: 'Missing contentId or contentType for progress action' },
            { status: 400 }
          );
        }
        data = await getWatchProgress(
          userIdNum, 
          contentId, 
          contentType,
          seasonNumber ? parseInt(seasonNumber) : undefined,
          episodeNumber ? parseInt(episodeNumber) : undefined
        );
        break;
      case 'lastEpisode':
        // Get last watched episode for a series (to resume)
        if (!contentId) {
          return NextResponse.json(
            { success: false, error: 'Missing contentId for lastEpisode action' },
            { status: 400 }
          );
        }
        data = await getLastWatchedEpisode(userIdNum, contentId);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    console.log('[API/watch GET] Result:', { success: true, dataExists: !!data });
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('[API/watch GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get watch data' },
      { status: 500 }
    );
  }
}

// POST /api/watch - Update watch progress
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[API/watch POST] Request body:', body);
    const { 
      userId, 
      contentType: rawContentType, 
      contentId, 
      episodeId,
      seasonNumber,
      episodeNumber,
      currentTime, 
      duration,
      action // 'progress', 'completed', 'remove'
    } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId' },
        { status: 400 }
      );
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return NextResponse.json(
        { success: false, error: 'Invalid userId' },
        { status: 400 }
      );
    }

    // Normalize content type - 'episode' is treated as 'series'
    const contentType = rawContentType === 'episode' ? 'series' : rawContentType;

    // Handle different actions
    if (action === 'completed') {
      if (!contentType || !contentId) {
        return NextResponse.json(
          { success: false, error: 'Missing contentType or contentId' },
          { status: 400 }
        );
      }
      
      const sessionId = await markAsCompleted(
        userIdNum, 
        contentType, 
        contentId, 
        seasonNumber,
        episodeNumber
      );
      
      return NextResponse.json({ success: true, sessionId });
    }

    if (action === 'remove') {
      if (!contentType || !contentId) {
        return NextResponse.json(
          { success: false, error: 'Missing contentType or contentId' },
          { status: 400 }
        );
      }
      
      const removed = await removeFromHistory(
        userIdNum, 
        contentType, 
        contentId, 
        seasonNumber,
        episodeNumber
      );
      
      return NextResponse.json({ success: removed });
    }

    // Default: update progress
    if (!contentType || !contentId || currentTime === undefined || !duration) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields for progress update' },
        { status: 400 }
      );
    }

    const sessionId = await updateWatchProgress(
      userIdNum,
      String(contentId),
      contentType,
      currentTime,
      duration,
      seasonNumber,
      episodeNumber
    );

    return NextResponse.json({ success: true, sessionId });

  } catch (error) {
    console.error('Error updating watch progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update watch progress' },
      { status: 500 }
    );
  }
}
