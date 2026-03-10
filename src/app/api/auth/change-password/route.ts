import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, verifyPassword, hashPassword } from '@/lib/auth';
import { queryOne, execute } from '@/lib/db';

interface User {
  id: number;
  password_hash: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie
    const accessToken = request.cookies.get('accessToken')?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Musisz być zalogowany' },
        { status: 401 }
      );
    }

    const payload = await verifyAccessToken(accessToken);
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Sesja wygasła, zaloguj się ponownie' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validation
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Wszystkie pola są wymagane' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Nowe hasło musi mieć co najmniej 8 znaków' },
        { status: 400 }
      );
    }

    // Get current user
    const user = await queryOne<User>(
      'SELECT id, password_hash FROM users WHERE id = ?',
      [payload.userId]
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Użytkownik nie znaleziony' },
        { status: 404 }
      );
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, user.password_hash);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Obecne hasło jest nieprawidłowe' },
        { status: 400 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, payload.userId]
    );

    return NextResponse.json({
      success: true,
      message: 'Hasło zostało zmienione pomyślnie'
    });

  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, error: 'Wystąpił błąd podczas zmiany hasła' },
      { status: 500 }
    );
  }
}
