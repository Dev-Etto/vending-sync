import amqplib, { Channel } from 'amqplib'
import pino from 'pino'
import { env } from '../env'

const logger = pino({ name: 'rabbitmq' })

const EXCHANGE = 'payment_exchange'
const QUEUE = 'payment_processing_queue'
const DLQ_EXCHANGE = 'payment_dlq_exchange'
const DLQ_QUEUE = 'payment_dead_letter_queue'
const ROUTING_KEY = 'payment.new'
const DLQ_ROUTING_KEY = 'payment.failed'

let channel: Channel | null = null
let retryCount = 0
const MAX_RETRY_DELAY_MS = 30_000

export interface PaymentMessage {
  machineId: string
  amount: number
  paymentMethod: 'PIX' | 'CREDIT' | 'DEBIT'
  correlationId: string
  forceStatus?: 'APPROVED' | 'FAILED'
}

export async function connectRabbitMQ(): Promise<void> {
  try {
    const conn = await amqplib.connect(env.RABBITMQ_URL)
    const ch = await conn.createChannel()

    await ch.assertExchange(DLQ_EXCHANGE, 'direct', { durable: true })
    await ch.assertQueue(DLQ_QUEUE, { durable: true })
    await ch.bindQueue(DLQ_QUEUE, DLQ_EXCHANGE, DLQ_ROUTING_KEY)

    await ch.assertExchange(EXCHANGE, 'direct', { durable: true })
    await ch.assertQueue(QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': DLQ_EXCHANGE,
        'x-dead-letter-routing-key': DLQ_ROUTING_KEY,
        'x-message-ttl': 30000,
      },
    })
    await ch.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY)

    channel = ch
    retryCount = 0

    logger.info('RabbitMQ conectado e filas configuradas')

    conn.on('close', () => {
      channel = null
      const delay = Math.min(5000 * Math.pow(2, retryCount), MAX_RETRY_DELAY_MS)
      retryCount++
      logger.warn({ retryCount, delayMs: delay }, 'Conexão RabbitMQ encerrada. Reconectando...')
      setTimeout(connectRabbitMQ, delay)
    })

    conn.on('error', (err) => {
      logger.error({ err }, 'Erro na conexão RabbitMQ')
    })
  } catch (err) {
    const delay = Math.min(5000 * Math.pow(2, retryCount), MAX_RETRY_DELAY_MS)
    retryCount++
    logger.error({ err, retryCount, delayMs: delay }, 'Falha ao conectar no RabbitMQ. Tentando novamente...')
    setTimeout(connectRabbitMQ, delay)
  }
}

export async function publishPayment(message: PaymentMessage): Promise<void> {
  if (!channel) throw new Error('Canal RabbitMQ não inicializado')

  const content = Buffer.from(JSON.stringify(message))

  channel.publish(EXCHANGE, ROUTING_KEY, content, {
    persistent: true,
    contentType: 'application/json',
    headers: { correlationId: message.correlationId },
  })
}

export function getChannel(): Channel {
  if (!channel) throw new Error('Canal RabbitMQ não inicializado')
  return channel
}

export { QUEUE, EXCHANGE, ROUTING_KEY }
