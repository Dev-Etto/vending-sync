import { Server as HttpServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import pino from 'pino'
import { env } from '../env'

const logger = pino({ name: 'socket' })

let io: SocketServer | null = null

export function initSocketIO(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'Cliente conectado')

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'Cliente desconectado')
    })
  })

  logger.info('Socket.io inicializado')
  return io
}

export function emit(event: string, data: unknown): void {
  if (!io) {
    logger.warn({ event }, 'Socket.io não inicializado. Evento não emitido.')
    return
  }
  io.emit(event, data)
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.io não inicializado')
  return io
}
