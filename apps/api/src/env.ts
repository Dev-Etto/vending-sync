import dotenv from 'dotenv'
import path from 'path'
import { z } from 'zod'

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })

const envSchema = z.object({
  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL é obrigatória' })
    .startsWith('postgresql://', 'DATABASE_URL deve começar com postgresql://'),
  RABBITMQ_URL: z.string().default('amqp://guest:guest@localhost:5672'),
  JWT_SECRET: z
    .string({ required_error: 'JWT_SECRET é obrigatório' })
    .min(16, 'JWT_SECRET deve ter pelo menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
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
