import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { db, machines } from '@vending-sync/db'
import { eq, desc } from 'drizzle-orm'
import { authenticate } from '../middleware/auth'

export async function machineRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>()

  // GET /api/machines — lista todas as máquinas
  typedApp.get(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        response: {
          200: z.array(
            z.object({
              id: z.string().uuid(),
              serialNumber: z.string(),
              name: z.string(),
              location: z.string().nullable(),
              status: z.enum(['ONLINE', 'OFFLINE', 'MAINTENANCE']),
              stockLevel: z.number(),
              lastHeartbeat: z.string().datetime().nullable(),
              createdAt: z.string().datetime(),
            })
          ),
        },
      },
    },
    async (request, reply) => {
      const allMachines = await db.select().from(machines).orderBy(desc(machines.createdAt))
      return allMachines.map((m) => ({
        ...m,
        lastHeartbeat: m.lastHeartbeat?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
      }))
    }
  )

  // POST /api/machines — cadastra nova máquina
  typedApp.post(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        body: z.object({
          serialNumber: z.string().min(1).max(100),
          name: z.string().min(1).max(255),
          location: z.string().optional(),
        }),
        response: {
          201: z.object({
            id: z.string().uuid(),
            serialNumber: z.string(),
            name: z.string(),
            location: z.string().nullable(),
            status: z.enum(['ONLINE', 'OFFLINE', 'MAINTENANCE']),
            stockLevel: z.number(),
            lastHeartbeat: z.string().datetime().nullable(),
            createdAt: z.string().datetime(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { serialNumber, name, location } = request.body

      const [machine] = await db
        .insert(machines)
        .values({ serialNumber, name, location })
        .returning()

      reply.status(201).send({
        ...machine,
        lastHeartbeat: machine.lastHeartbeat?.toISOString() ?? null,
        createdAt: machine.createdAt.toISOString(),
      })
    }
  )

  // POST /api/machines/:id/telemetry — heartbeat da máquina física
  typedApp.post(
    '/:id/telemetry',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          stockLevel: z.number().min(0).max(100),
          status: z.enum(['ONLINE', 'OFFLINE', 'MAINTENANCE']).optional(),
        }),
        response: {
          200: z.object({ success: z.boolean() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params
      const { stockLevel, status } = request.body

      await db
        .update(machines)
        .set({
          stockLevel,
          status: status ?? 'ONLINE',
          lastHeartbeat: new Date(),
        })
        .where(eq(machines.id, id))

      // Aqui emitiremos evento Socket.io na Etapa 7
      request.server.log.info({ machineId: id, stockLevel }, 'Telemetry received')

      return { success: true }
    }
  )
}
