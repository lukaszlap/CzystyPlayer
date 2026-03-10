import { NextResponse } from 'next/server';
import { 
  getMovieCategories, 
  getMovieCountries,
  getMovieYears,
} from '@/lib/contentDb';

// Get all filter options from database
export async function GET() {
  try {
    const [categories, countries, years] = await Promise.all([
      getMovieCategories(),
      getMovieCountries(),
      getMovieYears(),
    ]);

    return NextResponse.json({
      success: true,
      categories: ['Wszystkie gatunki', ...categories],
      countries: ['Wszystkie kraje', ...countries],
      years: ['Wszystkie lata', ...years],
    });
  } catch (error) {
    console.error('Error fetching movie filter options:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch filter options' },
      { status: 500 }
    );
  }
}
