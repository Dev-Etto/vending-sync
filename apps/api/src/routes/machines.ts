import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { db, machines, MachineSelectSchema, MachineInsertSchema, MachinePatchSchema } from '@vending-sync/db'
import { eq, desc } from 'drizzle-orm'
import { authenticate } from '../middleware/auth'
import { emit } from '../services/socket'

const serializeMachine = (m: typeof machines.$inferSelect) => ({
  ...m,
  lastHeartbeat: m.lastHeartbeat?.toISOString() ?? null,
  createdAt: m.createdAt.toISOString(),
})

export async function machineRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>()

  typedApp.get(
    '/',
    {
      preHandler: [authenticate],
      schema: { response: { 200: z.array(MachineSelectSchema) } },
    },
    async () => {
      const all = await db.select().from(machines).orderBy(desc(machines.createdAt))
      return all.map(serializeMachine)
    }
  )

  typedApp.post(
    '/',
    {
      preHandler: [authenticate],
      schema: { body: MachineInsertSchema, response: { 201: MachineSelectSchema } },
    },
    async (request, reply) => {
      const [machine] = await db.insert(machines).values(request.body).returning()
      reply.status(201).send(serializeMachine(machine))
    }
  )

  typedApp.get(
    '/:id',
    {
      preHandler: [authenticate],
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: { 200: MachineSelectSchema, 404: z.object({ error: z.string() }) },
      },
    },
    async (request, reply) => {
      const [machine] = await db.select().from(machines).where(eq(machines.id, request.params.id)).limit(1)
      if (!machine) return reply.status(404).send({ error: 'Máquina não encontrada' })
      return serializeMachine(machine)
    }
  )

  typedApp.patch(
    '/:id',
    {
      preHandler: [authenticate],
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: MachinePatchSchema,
        response: { 200: MachineSelectSchema, 404: z.object({ error: z.string() }) },
      },
    },
    async (request, reply) => {
      const { id } = request.params

      const [updated] = await db
        .update(machines)
        .set(request.body)
        .where(eq(machines.id, id))
        .returning()

      if (!updated) return reply.status(404).send({ error: 'Máquina não encontrada' })

      const serialized = serializeMachine(updated)
      emit('machine_updated', { machine: serialized })
      request.log.info({ machineId: id, ...request.body }, 'Machine updated by operator')

      return serialized
    }
  )

  typedApp.post(
    '/:id/telemetry',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          status: z.enum(['ONLINE', 'OFFLINE', 'MAINTENANCE']).optional(),
          stockLevel: z.number().min(0).max(100),
        }),
        response: {
          200: z.object({ machine: MachineSelectSchema }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params
      const { stockLevel, status } = request.body

      const [updated] = await db
        .update(machines)
        .set({ stockLevel, status: status ?? 'ONLINE', lastHeartbeat: new Date() })
        .where(eq(machines.id, id))
        .returning()

      if (!updated) return reply.status(404).send({ error: 'Máquina não encontrada' })

      const serialized = serializeMachine(updated)
      emit('machine_updated', { machine: serialized })
      request.server.log.info({ machineId: id, stockLevel }, 'Telemetry received')

      return reply.send({ machine: serialized })
    }
  )
}
