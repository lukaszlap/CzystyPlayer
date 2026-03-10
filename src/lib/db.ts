import mysql from 'mysql2/promise';

// User Database configuration (czystyplayer - user data, watch progress)
const dbConfig = {
  host: process.env.DB_HOST || '192.168.1.55',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'remote',
  password: process.env.DB_PASSWORD || 'Lapix1@3456xD',
  database: process.env.DB_NAME || 'czystyplayer',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Helper function to get a connection from pool
export async function getConnection() {
  return await pool.getConnection();
}

// Helper function to execute queries
export async function query<T>(
  sql: string,
  params?: (string | number | boolean | null | undefined)[]
): Promise<T> {
  const [results] = await pool.execute(sql, params);
  return results as T;
}

// Helper function for single row queries
export async function queryOne<T>(
  sql: string,
  params?: (string | number | boolean | null | undefined)[]
): Promise<T | null> {
  const results = await query<T[]>(sql, params);
  return Array.isArray(results) && results.length > 0 ? results[0] : null;
}

// Helper function for insert operations
export async function insert(
  sql: string,
  params?: (string | number | boolean | null | undefined)[]
): Promise<{ insertId: number; affectedRows: number }> {
  const [result] = await pool.execute(sql, params);
  const insertResult = result as mysql.ResultSetHeader;
  return {
    insertId: insertResult.insertId,
    affectedRows: insertResult.affectedRows,
  };
}

// Helper function for update/delete operations
export async function execute(
  sql: string,
  params?: (string | number | boolean | null | undefined)[]
): Promise<{ affectedRows: number; changedRows: number }> {
  const [result] = await pool.execute(sql, params);
  const execResult = result as mysql.ResultSetHeader;
  return {
    affectedRows: execResult.affectedRows,
    changedRows: execResult.changedRows,
  };
}

// Transaction helper
export async function transaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Health check function
export async function checkConnection(): Promise<boolean> {
  try {
    await pool.execute('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}

export default pool;
