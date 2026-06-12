import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { db, machines } from '@vending-sync/db'
import { eq } from 'drizzle-orm'
import { publishPayment } from '../services/rabbitmq'
import { randomUUID } from 'crypto'

export async function webhookRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>()

  typedApp.post(
    '/payment',
    {
      schema: {
        body: z.object({
          machineId: z.string().uuid(),
          amount: z.number().positive(),
          paymentMethod: z.enum(['PIX', 'CREDIT', 'DEBIT']),
          forceStatus: z.enum(['APPROVED', 'FAILED']).optional(),
        }),
        response: {
          202: z.object({ message: z.string(), correlationId: z.string() }),
          404: z.object({ error: z.string() }),
          422: z.object({ error: z.string(), status: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { machineId } = request.body

      const [machine] = await db.select().from(machines).where(eq(machines.id, machineId)).limit(1)

      if (!machine) {
        return reply.status(404).send({ error: 'Máquina não encontrada' })
      }

      if (machine.status !== 'ONLINE') {
        request.log.warn({ machineId, status: machine.status }, 'Pagamento rejeitado — máquina inoperante')
        return reply.status(422).send({
          error: `Máquina não está disponível para transações`,
          status: machine.status,
        })
      }

      const correlationId = randomUUID()
      await publishPayment({ ...request.body, correlationId })

      request.log.info(
        { correlationId, machineId, forceStatus: request.body.forceStatus },
        'Webhook de pagamento publicado na fila'
      )

      return reply.status(202).send({
        message: 'Pagamento enfileirado para processamento',
        correlationId,
      })
    }
  )
}
