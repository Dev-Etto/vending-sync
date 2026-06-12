import pino from 'pino'
import { getChannel, QUEUE, PaymentMessage } from '../services/rabbitmq'
import { db, transactions, machines } from '@vending-sync/db'
import { eq } from 'drizzle-orm'

const logger = pino({ name: 'payment-worker' })

const serializeMachine = (m: typeof machines.$inferSelect, stockLevel: number) => ({
  id: m.id,
  serialNumber: m.serialNumber,
  name: m.name,
  location: m.location,
  status: m.status,
  stockLevel,
  lastHeartbeat: m.lastHeartbeat?.toISOString() ?? null,
  createdAt: m.createdAt.toISOString(),
})

export async function startPaymentWorker(
  emitEvent: (event: string, data: unknown) => void
): Promise<void> {
  const channel = getChannel()
  await channel.prefetch(1)
  logger.info('Worker de pagamentos iniciado. Aguardando mensagens...')

  channel.consume(QUEUE, async (msg) => {
    if (!msg) return

    let payload: PaymentMessage

    try {
      payload = JSON.parse(msg.content.toString()) as PaymentMessage
    } catch {
      logger.error('Formato de mensagem inválido. Enviando para DLQ.')
      channel.nack(msg, false, false)
      return
    }

    const { correlationId, machineId } = payload
    const status = payload.forceStatus ?? 'APPROVED'

    try {
      logger.info({ correlationId, machineId, amount: payload.amount, status }, 'Processando pagamento')

      const [machine] = await db.select().from(machines).where(eq(machines.id, machineId)).limit(1)

      if (!machine) {
        logger.error({ correlationId, machineId }, 'Máquina não encontrada. Enviando para DLQ.')
        channel.nack(msg, false, false)
        return
      }

      if (machine.status !== 'ONLINE') {
        logger.warn({ correlationId, machineId, status: machine.status }, 'Máquina inoperante no momento do processamento. Enviando para DLQ.')
        channel.nack(msg, false, false)
        return
      }

      const [transaction] = await db
        .insert(transactions)
        .values({
          machineId,
          amount: String(payload.amount),
          paymentMethod: payload.paymentMethod,
          status,
        })
        .returning()

      let newStockLevel = machine.stockLevel

      if (status === 'APPROVED') {
        newStockLevel = Math.max(0, machine.stockLevel - 10)
        await db.update(machines).set({ stockLevel: newStockLevel }).where(eq(machines.id, machineId))
        logger.info({ correlationId, machineId, transactionId: transaction.id, newStockLevel }, 'Pagamento aprovado')
      } else {
        logger.info({ correlationId, machineId, transactionId: transaction.id }, 'Pagamento registrado como falha')
      }

      const updatedMachine = serializeMachine(machine, newStockLevel)

      emitEvent('new_transaction', {
        transaction: { ...transaction, machineName: machine.name, createdAt: transaction.createdAt.toISOString() },
        machine: updatedMachine,
      })

      emitEvent('machine_updated', { machine: updatedMachine })

      channel.ack(msg)
    } catch (err) {
      logger.error({ err, correlationId, machineId }, 'Falha no processamento do pagamento')
      channel.nack(msg, false, false)
    }
  })
}
