import dotenv from 'dotenv'
import path from 'path'
import { z } from 'zod'

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })

const envSchema = z.object({
  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL é obrigatória' })
    .min(1, 'DATABASE_URL não pode ser vazia')
    .startsWith('postgresql://', 'DATABASE_URL deve começar com postgresql://'),
})

const result = envSchema.safeParse(process.env)

if (!result.success) {
  const errors = result.error.flatten().fieldErrors
  console.error('❌ Variáveis de ambiente inválidas:')
  for (const [key, messages] of Object.entries(errors)) {
    console.error(`  ${key}: ${messages?.join(', ')}`)
  }
  process.exit(1)
}

export const env = result.data
