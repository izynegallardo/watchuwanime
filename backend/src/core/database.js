import pg from 'pg'

const { Pool } = pg

function buildConfig() {
    if (process.env.DATABASE_URL) {
        return {
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
        }
    }

    return {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT) || 5432,
    }
}

export const pool = new Pool(buildConfig())
