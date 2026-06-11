import { env } from './env'
import Fastify from 'fastify'
import { ZodTypeProvider, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { machineRoutes } from './routes/machines'
import { transactionRoutes } from './routes/transactions'
import { webhookRoutes } from './routes/webhooks'
import { authRoutes } from './routes/auth'

const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
})

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

const typedApp = app.withTypeProvider<ZodTypeProvider>()

async function start() {
  await typedApp.register(cors, { origin: env.FRONTEND_URL })
  await typedApp.register(jwt, { secret: env.JWT_SECRET })

  await typedApp.register(authRoutes, { prefix: '/api/auth' })
  await typedApp.register(machineRoutes, { prefix: '/api/machines' })
  await typedApp.register(transactionRoutes, { prefix: '/api/transactions' })
  await typedApp.register(webhookRoutes, { prefix: '/api/webhooks' })

  typedApp.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  await app.listen({ port: env.PORT, host: '0.0.0.0' })
}

start().catch((err) => {
  app.log.error(err)
  process.exit(1)
})
