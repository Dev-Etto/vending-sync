import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { db, transactions, machines } from '@vending-sync/db'
import { desc, eq } from 'drizzle-orm'
import { authenticate } from '../middleware/auth'

export async function transactionRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>()

  typedApp.get(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        querystring: z.object({
          machineId: z.string().uuid().optional(),
          limit: z.coerce.number().min(1).max(100).default(20),
        }),
        response: {
          200: z.array(
            z.object({
              id: z.string().uuid(),
              machineId: z.string().uuid(),
              machineName: z.string(),
              amount: z.string(),
              paymentMethod: z.enum(['PIX', 'CREDIT', 'DEBIT']),
              status: z.enum(['PENDING', 'APPROVED', 'FAILED']),
              createdAt: z.string().datetime(),
            })
          ),
        },
      },
    },
    async (request, reply) => {
      const { machineId, limit } = request.query

      const result = await db
        .select({
          id: transactions.id,
          machineId: transactions.machineId,
          machineName: machines.name,
          amount: transactions.amount,
          paymentMethod: transactions.paymentMethod,
          status: transactions.status,
          createdAt: transactions.createdAt,
        })
        .from(transactions)
        .innerJoin(machines, eq(transactions.machineId, machines.id))
        .orderBy(desc(transactions.createdAt))
        .limit(limit)

      return result.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }))
    }
  )
}
