import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db, users } from '@vending-sync/db'
import { env } from '../env'

export async function authRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>()

  // POST /api/auth/login
  typedApp.post(
    '/login',
    {
      schema: {
        body: z.object({
          email: z.string().email(),
          password: z.string().min(1),
        }),
        response: {
          200: z.object({
            token: z.string(),
            user: z.object({
              id: z.string(),
              email: z.string(),
              role: z.string(),
            }),
          }),
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body

      const [user] = await db.select().from(users).where(eq(users.email, email))

      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return reply.status(401).send({ error: 'Credenciais inválidas' })
      }

      const token = app.jwt.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
        },
        { expiresIn: env.JWT_EXPIRES_IN }
      )

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      }
    }
  )

  // GET /api/auth/me — retorna os dados do usuário logado
  typedApp.get(
    '/me',
    {
      preHandler: [
        async (request, reply) => {
          try {
            await request.jwtVerify()
          } catch {
            reply.status(401).send({ error: 'Unauthorized' })
          }
        },
      ],
      schema: {
        response: {
          200: z.object({
            id: z.string(),
            email: z.string(),
            role: z.string(),
          }),
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request) => {
      const user = request.user
      return { id: user.sub, email: user.email, role: user.role }
    }
  )
}
