import { readdir, readFile } from 'fs/promises'
import dotenv from 'dotenv'

dotenv.config({ path: process.env.DOTENV_PATH || '.env' })

const { pool } = await import('../src/core/database.js')

const migrationsDir = new URL('../migrations/', import.meta.url)

async function migrate() {
    let files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort()

    const isLocal = process.env.DOTENV_PATH === '.env.local'

    if (isLocal) {
        files = files.filter((file) => file !== '003_create_anime_policies.sql')
    }

    for (const file of files) {
        const sql = await readFile(new URL(file, migrationsDir), 'utf-8')
        console.log(`Running migration: ${file}`)
        await pool.query(sql)
    }

    // PostgREST (what supabase-js talks to) caches the schema and only
    // reloads automatically for DDL run through Supabase's own dashboard/CLI.
    // Running migrations directly via `pg`, as above, doesn't trigger that -
    // without this, PostgREST keeps serving the pre-migration schema even
    // though `pg`/raw SQL clients already see the new one, which is exactly
    // why supabase-js writes/reads can silently diverge from direct SQL
    // checks right after a migration. Harmless no-op against local Postgres,
    // there's no PostgREST listening there.
    await pool.query("NOTIFY pgrst, 'reload schema'")

    await pool.end()
    console.log('Migrations complete.')
}

migrate().catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
})
