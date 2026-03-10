import { NextRequest, NextResponse } from 'next/server';
import { refreshTokens, verifyRefreshToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refreshToken')?.value;
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Brak tokenu odświeżającego' },
        { status: 401 }
      );
    }

    // Refresh tokens
    const result = await refreshTokens(refreshToken);

    // Create response with new cookies
    const response = NextResponse.json(
      { message: 'Token odświeżony pomyślnie' },
      { status: 200 }
    );

    // Set new HTTP-only cookies
    response.cookies.set('accessToken', result.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    response.cookies.set('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Refresh token error:', error);
    
    const message = error instanceof Error ? error.message : 'Błąd odświeżania tokenu';
    
    // Clear cookies on error
    const response = NextResponse.json(
      { error: message },
      { status: 401 }
    );

    response.cookies.set('accessToken', '', { maxAge: 0, path: '/' });
    response.cookies.set('refreshToken', '', { maxAge: 0, path: '/' });

    return response;
  }
}
