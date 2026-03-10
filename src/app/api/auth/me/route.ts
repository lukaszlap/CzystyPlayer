import { NextRequest, NextResponse } from 'next/server';
import { getUserById, verifyAccessToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const accessToken = request.cookies.get('accessToken')?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Nie zalogowano' },
        { status: 401 }
      );
    }

    // Verify token
    const payload = await verifyAccessToken(accessToken);
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Nieprawidłowy token' },
        { status: 401 }
      );
    }

    // Get user data
    const user = await getUserById(payload.userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Użytkownik nie znaleziony' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Get me error:', error);
    
    return NextResponse.json(
      { error: 'Błąd pobierania danych użytkownika' },
      { status: 500 }
    );
  }
}
