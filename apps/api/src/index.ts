import { env } from './env'
import Fastify from 'fastify'
import { ZodTypeProvider, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { authRoutes } from './routes/auth'
import { machineRoutes } from './routes/machines'
import { transactionRoutes } from './routes/transactions'
import { webhookRoutes } from './routes/webhooks'
import { simulateRoutes } from './routes/simulate'
import { healthRoutes } from './routes/health'
import { correlationIdMiddleware } from './middleware/correlationId'
import { connectRabbitMQ } from './services/rabbitmq'
import { startPaymentWorker } from './workers/payment.worker'
import { initSocketIO, emit } from './services/socket'

const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } }
        : undefined,
  },
})

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

const typedApp = app.withTypeProvider<ZodTypeProvider>()

async function start() {
  app.addHook('onRequest', correlationIdMiddleware)

  app.addHook('onResponse', (request, reply, done) => {
    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        durationMs: Math.round(reply.elapsedTime),
      },
      'Request completed'
    )
    done()
  })

  await typedApp.register(cors, { origin: env.FRONTEND_URL })
  await typedApp.register(jwt, { secret: env.JWT_SECRET })

  await typedApp.register(authRoutes, { prefix: '/api/auth' })
  await typedApp.register(machineRoutes, { prefix: '/api/machines' })
  await typedApp.register(transactionRoutes, { prefix: '/api/transactions' })
  await typedApp.register(webhookRoutes, { prefix: '/api/webhooks' })
  await typedApp.register(simulateRoutes, { prefix: '/api/simulate' })
  await typedApp.register(healthRoutes)

  await app.listen({ port: env.PORT, host: '0.0.0.0' })

  initSocketIO(app.server)
  await connectRabbitMQ()
  await startPaymentWorker(emit)

  app.log.info(`Servidor rodando na porta ${env.PORT}`)
}

start().catch((err) => {
  app.log.error(err)
  process.exit(1)
})
