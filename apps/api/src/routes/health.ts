import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { db } from '@vending-sync/db'
import { sql } from 'drizzle-orm'

export async function healthRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>()

  typedApp.get(
    '/health',
    {
      schema: {
        response: {
          200: z.object({
            status: z.literal('ok'),
            timestamp: z.string(),
            uptime: z.number(),
            environment: z.string(),
            checks: z.object({
              database: z.object({ status: z.string(), latencyMs: z.number().nullable() }),
            }),
          }),
          503: z.object({
            status: z.literal('degraded'),
            timestamp: z.string(),
            uptime: z.number(),
            environment: z.string(),
            checks: z.object({
              database: z.object({ status: z.string(), latencyMs: z.number().nullable() }),
            }),
          }),
        },
      },
    },
    async (_request, reply) => {
      let dbStatus = 'ok'
      let dbLatencyMs: number | null = null

      try {
        const start = Date.now()
        await db.execute(sql`SELECT 1`)
        dbLatencyMs = Date.now() - start
      } catch {
        dbStatus = 'error'
      }

      const isHealthy = dbStatus === 'ok'
      const body = {
        status: (isHealthy ? 'ok' : 'degraded') as 'ok' | 'degraded',
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
        environment: process.env.NODE_ENV ?? 'development',
        checks: { database: { status: dbStatus, latencyMs: dbLatencyMs } },
      }

      return reply.status(isHealthy ? 200 : 503).send(body)
    }
  )
}
