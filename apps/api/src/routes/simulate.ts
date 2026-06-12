import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { startSimulation, stopSimulation, isRunning } from '../services/simulation'

const statusSchema = z.object({ running: z.boolean() })

export async function simulateRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>()

  typedApp.get('/', {
    preHandler: [authenticate],
    schema: { response: { 200: statusSchema } },
  }, async () => ({ running: isRunning() }))

  typedApp.post('/toggle', {
    preHandler: [authenticate],
    schema: { response: { 200: statusSchema } },
  }, async () => {
    if (isRunning()) {
      stopSimulation()
      return { running: false }
    }
    startSimulation()
    return { running: true }
  })
}
