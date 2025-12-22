import sql from 'mssql';

let pool;

export async function getPool() {
  if (pool) return pool;
  const conn = process.env.AZURE_SQL_CONNECTION_STRING;
  if (!conn) {
    throw new Error('AZURE_SQL_CONNECTION_STRING is not set.');
  }
  pool = await sql.connect(conn);
  return pool;
}

export { sql };
