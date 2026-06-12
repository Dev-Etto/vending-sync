import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { db, transactions, machines, TransactionWithMachineSchema } from '@vending-sync/db'
import { and, desc, eq, lt } from 'drizzle-orm'
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
          before: z.string().datetime().optional(),
        }),
        response: { 200: z.array(TransactionWithMachineSchema) },
      },
    },
    async (request) => {
      const { machineId, limit, before } = request.query

      const conditions = []
      if (machineId) conditions.push(eq(transactions.machineId, machineId))
      if (before) conditions.push(lt(transactions.createdAt, new Date(before)))

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
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(transactions.createdAt))
        .limit(limit)

      return result.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
    }
  )
}
