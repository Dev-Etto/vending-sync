import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify'
import { randomUUID } from 'crypto'

export function correlationIdMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
) {
  const correlationId =
    (request.headers['x-correlation-id'] as string) || randomUUID()

  request.log = request.log.child({ correlationId })
  reply.header('x-correlation-id', correlationId)

  done()
}
