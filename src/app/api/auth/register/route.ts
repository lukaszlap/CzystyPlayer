import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = registerSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Błąd walidacji', 
          details: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { email, username, password, firstName, lastName } = validationResult.data;

    // Register user
    const result = await registerUser({
      email,
      username,
      password,
      firstName,
      lastName,
    });

    // Create response with cookies
    const response = NextResponse.json(
      { 
        message: 'Rejestracja zakończona sukcesem',
        user: result.user,
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        }
      },
      { status: 201 }
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
    console.error('Registration error:', error);
    
    const message = error instanceof Error ? error.message : 'Błąd podczas rejestracji';
    
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
