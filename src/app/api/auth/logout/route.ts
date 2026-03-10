import { NextRequest, NextResponse } from 'next/server';
import { logoutUser, verifyAccessToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie
    const accessToken = request.cookies.get('accessToken')?.value;
    
    if (accessToken) {
      const payload = await verifyAccessToken(accessToken);
      
      if (payload) {
        // Invalidate session
        await logoutUser(payload.userId);
      }
    }

    // Create response and clear cookies
    const response = NextResponse.json(
      { message: 'Wylogowano pomyślnie' },
      { status: 200 }
    );

    // Clear cookies
    response.cookies.set('accessToken', '', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    
    // Still clear cookies even if there's an error
    const response = NextResponse.json(
      { message: 'Wylogowano' },
      { status: 200 }
    );

    response.cookies.set('accessToken', '', { maxAge: 0, path: '/' });
    response.cookies.set('refreshToken', '', { maxAge: 0, path: '/' });

    return response;
  }
}
