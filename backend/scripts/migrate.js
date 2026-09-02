import { readdir, readFile } from 'fs/promises'
import dotenv from 'dotenv'

dotenv.config({ path: process.env.DOTENV_PATH || '.env' })

const { pool } = await import('../src/core/database.js')

const migrationsDir = new URL('../migrations/', import.meta.url)

async function migrate() {
    const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort()

    for (const file of files) {
        const sql = await readFile(new URL(file, migrationsDir), 'utf-8')
        console.log(`Running migration: ${file}`)
        await pool.query(sql)
    }

    await pool.end()
    console.log('Migrations complete.')
}

migrate().catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
})
