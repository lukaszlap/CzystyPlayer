import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { query, queryOne, insert, execute } from '@/lib/db';

// Types - aligned with MariaDB schema
export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  created_at: Date;
  last_login: Date | null;
}

export interface Session {
  id: number;
  user_id: number;
  session_token: string;
  created_at: Date;
  expires_at: Date;
  is_active: boolean;
  last_activity: Date | null;
}

export interface TokenPayload {
  userId: number;
  email: string;
  username: string;
}

// JWT Configuration
if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET environment variables must be set');
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const JWT_REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Parse duration string to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // Default 15 minutes
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 900;
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate access token
export async function generateAccessToken(payload: TokenPayload): Promise<string> {
  const expiresIn = parseDuration(JWT_EXPIRES_IN);
  
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(JWT_SECRET);
}

// Generate refresh token
export async function generateRefreshToken(payload: TokenPayload): Promise<string> {
  const expiresIn = parseDuration(JWT_REFRESH_EXPIRES_IN);
  
  return new SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(JWT_REFRESH_SECRET);
}

// Verify access token
export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

// Verify refresh token
export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
    if ((payload as { type?: string }).type !== 'refresh') return null;
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

// Hash token for storage
export async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, 8);
}

// Register user
export async function registerUser(data: {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<{ user: Omit<User, 'password_hash'>; accessToken: string; refreshToken: string }> {
  // Check if user exists
  const existingUser = await queryOne<User>(
    'SELECT id FROM users WHERE email = ? OR username = ?',
    [data.email, data.username]
  );

  if (existingUser) {
    throw new Error('Użytkownik z tym emailem lub nazwą już istnieje');
  }

  // Hash password
  const passwordHash = await hashPassword(data.password);

  // Insert user (schema: id, username, email, password_hash, is_active, created_at, last_login)
  const result = await insert(
    `INSERT INTO users (username, email, password_hash) 
     VALUES (?, ?, ?)`,
    [data.username, data.email, passwordHash]
  );

  // Get created user
  const user = await queryOne<User>(
    'SELECT * FROM users WHERE id = ?',
    [result.insertId]
  );

  if (!user) {
    throw new Error('Błąd tworzenia użytkownika');
  }

  // Generate tokens
  const tokenPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    username: user.username,
  };

  const accessToken = await generateAccessToken(tokenPayload);
  const refreshToken = await generateRefreshToken(tokenPayload);

  // Store session
  await createSession(user.id, accessToken, refreshToken);

  // Remove password from response
  const { password_hash, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    accessToken,
    refreshToken,
  };
}

// Login user
export async function loginUser(data: {
  email: string;
  password: string;
  deviceInfo?: string;
  ipAddress?: string;
}): Promise<{ user: Omit<User, 'password_hash'>; accessToken: string; refreshToken: string }> {
  // Find user
  const user = await queryOne<User>(
    'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
    [data.email]
  );

  if (!user) {
    throw new Error('Nieprawidłowy email lub hasło');
  }

  // Verify password
  const isValidPassword = await verifyPassword(data.password, user.password_hash);

  if (!isValidPassword) {
    // Log failed attempt
    await logActivity(user.id, 'failed_login', data.ipAddress);
    throw new Error('Nieprawidłowy email lub hasło');
  }

  // Update last login
  await execute(
    'UPDATE users SET last_login = NOW() WHERE id = ?',
    [user.id]
  );

  // Generate tokens
  const tokenPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    username: user.username,
  };

  const accessToken = await generateAccessToken(tokenPayload);
  const refreshToken = await generateRefreshToken(tokenPayload);

  // Store session
  await createSession(user.id, accessToken, refreshToken, data.deviceInfo, data.ipAddress);

  // Log successful login
  await logActivity(user.id, 'login', data.ipAddress);

  // Remove password from response
  const { password_hash, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    accessToken,
    refreshToken,
  };
}

// Create session
async function createSession(
  userId: number,
  accessToken: string,
  refreshToken: string,
  deviceInfo?: string,
  ipAddress?: string
): Promise<void> {
  const expiresIn = parseDuration(JWT_REFRESH_EXPIRES_IN);

  // Using user_sessions table (schema: id, user_id, session_token, expires_at, created_at)
  await insert(
    `INSERT INTO user_sessions (user_id, session_token, expires_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))`,
    [userId, refreshToken, expiresIn]
  );
}

// Refresh tokens
export async function refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const payload = await verifyRefreshToken(refreshToken);

  if (!payload) {
    throw new Error('Nieprawidłowy token odświeżający');
  }

  // Verify user still exists and is active
  const user = await queryOne<User>(
    'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
    [payload.userId]
  );

  if (!user) {
    throw new Error('Użytkownik nie istnieje lub jest nieaktywny');
  }

  // Delete old session with the current refresh token
  await execute(
    'DELETE FROM user_sessions WHERE session_token = ?',
    [refreshToken]
  );

  // Generate new tokens
  const tokenPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    username: user.username,
  };

  const newAccessToken = await generateAccessToken(tokenPayload);
  const newRefreshToken = await generateRefreshToken(tokenPayload);

  // Create new session
  await createSession(user.id, newAccessToken, newRefreshToken);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

// Logout - invalidate session
export async function logoutUser(userId: number): Promise<void> {
  await execute(
    'DELETE FROM user_sessions WHERE user_id = ?',
    [userId]
  );
}

// Get user by ID
export async function getUserById(userId: number): Promise<Omit<User, 'password_hash'> | null> {
  const user = await queryOne<User>(
    'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
    [userId]
  );

  if (!user) return null;

  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// Log user activity (simplified - no separate activity table in current schema)
async function logActivity(
  userId: number,
  action: string,
  ipAddress?: string,
  details?: string
): Promise<void> {
  // Activity logging disabled - no user_activity_log table in current schema
  // This is a no-op function to maintain API compatibility
  console.log(`Activity: user=${userId}, action=${action}, ip=${ipAddress || 'unknown'}`);
}

// Get user from request (middleware helper)
export async function getUserFromToken(authHeader: string | null): Promise<Omit<User, 'password_hash'> | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const payload = await verifyAccessToken(token);

  if (!payload) {
    return null;
  }

  return getUserById(payload.userId);
}
