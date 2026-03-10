import { NextRequest, NextResponse } from 'next/server';
import { 
  getSeriesById, 
  getSeriesSeasons,
  getEpisodesBySeriesAndSeason,
  getSeriesPosterPath,
  getSeriesBackgroundPath,
} from '@/lib/contentDb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const seriesId = parseInt(id);

    if (isNaN(seriesId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid series ID' },
        { status: 400 }
      );
    }

    const series = await getSeriesById(seriesId);

    if (!series) {
      return NextResponse.json(
        { success: false, error: 'Series not found' },
        { status: 404 }
      );
    }

    // Get seasons
    const seasons = await getSeriesSeasons(seriesId);

    // Get episodes for each season
    const seasonsWithEpisodes = await Promise.all(
      seasons.map(async (season) => {
        const episodes = await getEpisodesBySeriesAndSeason(seriesId, season.season_number);
        return {
          ...season,
          episodes,
        };
      })
    );

    return NextResponse.json({
      success: true,
      series: {
        ...series,
        posterPath: getSeriesPosterPath(series),
        backgroundPath: getSeriesBackgroundPath(series),
      },
      seasons: seasonsWithEpisodes,
    });

  } catch (error) {
    console.error('Error fetching series:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch series' },
      { status: 500 }
    );
  }
}
