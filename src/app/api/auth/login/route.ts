import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = loginSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Błąd walidacji', 
          details: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // Get client info
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    const deviceInfo = request.headers.get('user-agent') || undefined;

    // Login user
    const result = await loginUser({
      email,
      password,
      deviceInfo,
      ipAddress,
    });

    // Create response with cookies
    const response = NextResponse.json(
      { 
        message: 'Logowanie zakończone sukcesem',
        user: result.user,
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        }
      },
      { status: 200 }
    );

    // Set HTTP-only cookies for tokens
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
    console.error('Login error:', error);
    
    const message = error instanceof Error ? error.message : 'Błąd podczas logowania';
    
    return NextResponse.json(
      { error: message },
      { status: 401 }
    );
  }
}
