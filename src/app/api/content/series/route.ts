import { NextRequest, NextResponse } from 'next/server';
import { 
  getSeries, 
  searchSeries, 
  getSeriesCategories, 
  getSeriesCountries,
  getTrendingSeries,
  getRandomSeries,
  getSeriesPosterPath,
  getSeriesBackgroundPath,
  type SeriesFull 
} from '@/lib/contentDb';

// Transform series data to include correct image paths
function transformSeries(series: SeriesFull) {
  return {
    ...series,
    posterPath: getSeriesPosterPath(series),
    backgroundPath: getSeriesBackgroundPath(series),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'rating';
    const sortOrder = (searchParams.get('sortOrder') || 'DESC') as 'ASC' | 'DESC';
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const country = searchParams.get('country') || '';
    const year = searchParams.get('year') || '';
    const trending = searchParams.get('trending') === 'true';
    const random = searchParams.get('random') === 'true';

    // If requesting random series for suggestions
    if (random) {
      const randomLimit = parseInt(searchParams.get('limit') || '4');
      const series = await getRandomSeries(randomLimit);
      return NextResponse.json({
        success: true,
        series: series.map(transformSeries),
        total: series.length,
      });
    }

    // If requesting trending series
    if (trending) {
      const trendingLimit = parseInt(searchParams.get('limit') || '10');
      const series = await getTrendingSeries(trendingLimit);
      return NextResponse.json({
        success: true,
        series: series.map(transformSeries),
        total: series.length,
      });
    }

    // If searching
    if (search || category || country || year) {
      const { series, total } = await searchSeries(search, category, country, year, page, limit);
      return NextResponse.json({
        success: true,
        series: series.map(transformSeries),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    }

    // Default: get all series with pagination
    const { series, total } = await getSeries(page, limit, sortBy, sortOrder);

    return NextResponse.json({
      success: true,
      series: series.map(transformSeries),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    console.error('Error fetching series:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch series' },
      { status: 500 }
    );
  }
}

// Get filter options
export async function OPTIONS() {
  try {
    const [categories, countries] = await Promise.all([
      getSeriesCategories(),
      getSeriesCountries(),
    ]);

    return NextResponse.json({
      success: true,
      categories: ['Wszystkie gatunki', ...categories],
      countries: ['Wszystkie kraje', ...countries],
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch filter options' },
      { status: 500 }
    );
  }
}
