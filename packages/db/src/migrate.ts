import { env } from './env'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import path from 'path'

const migrationClient = postgres(env.DATABASE_URL, { max: 1 })
const db = drizzle(migrationClient)

async function main() {
  console.log('Running migrations...')
  await migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') })
  console.log('Migrations complete!')
  await migrationClient.end()
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
