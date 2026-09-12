import dotenv from 'dotenv'

dotenv.config({ path: process.env.DOTENV_PATH || '.env' })

const { default: app } = await import('./src/app.js')
const { startSupabaseKeepAlive } = await import('./src/jobs/keepAliveSupabase.js')

const port = process.env.PORT || process.env.API_PORT || 3000

app.listen(port, () => {
    console.log(`Api is running at port ${port}...`)
    startSupabaseKeepAlive()
})
