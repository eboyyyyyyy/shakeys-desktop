import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'shakeys_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function query<T>(sql: string, params: (string | number | boolean | null)[] = []): Promise<T> {
  const [rows] = await pool.execute(sql, params);
  return rows as T;
}

export async function execute(sql: string, params: (string | number | boolean | null)[] = []) {
  const [result] = await pool.execute(sql, params);
  return result as mysql.ResultSetHeader;
}

export async function getConnection() {
  return pool.getConnection();
}

export function isDatabaseConnected(): boolean {
  return !!(process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_DATABASE);
}

export default pool;
