import { NextRequest, NextResponse } from 'next/server';
import { getEpisodeSources } from '@/lib/contentDb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  try {
    const { episodeId } = await params;
    const epId = parseInt(episodeId);

    if (isNaN(epId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid episode ID' },
        { status: 400 }
      );
    }

    const rawSources = await getEpisodeSources(epId);
    
    // Transform to match VideoPlayer interface
    const sources = rawSources.map(s => ({
      id: s.id,
      url: s.iframe_url,
      hosting: s.hosting || 'unknown',
      quality: s.quality || 'unknown',
      language: s.language || 'pl'
    }));

    return NextResponse.json({
      success: true,
      sources,
    });

  } catch (error) {
    console.error('Error fetching episode sources:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch episode sources' },
      { status: 500 }
    );
  }
}
