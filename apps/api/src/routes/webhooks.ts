import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

export async function webhookRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>()

  typedApp.post('/payment',{
      schema: {
        body: z.object({
          machineId: z.string().uuid(),
          amount: z.number().positive(),
          paymentMethod: z.enum(['PIX', 'CREDIT', 'DEBIT']),
        }),
        response: {
          202: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      // TODO Etapa 6: Publicar mensagem no RabbitMQ
      app.log.info({ payload: request.body }, 'Payment webhook received')
      reply.status(202).send({ message: 'Payment queued for processing' })
    }
  )
}
