import { randomUUID } from 'crypto'
import pino from 'pino'
import { db, machines } from '@vending-sync/db'
import { eq } from 'drizzle-orm'
import { emit } from './socket'
import { publishPayment } from './rabbitmq'

const logger = pino({ name: 'simulation' })

const PAYMENT_METHODS = ['PIX', 'CREDIT', 'DEBIT'] as const
const AMOUNTS = [3.5, 5.0, 7.5, 4.0, 6.0, 8.5]

type Machine = typeof machines.$inferSelect

function sample<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

function brl(n: number) {
  return n.toFixed(2).replace('.', ',')
}

function serializeMachine(m: Machine) {
  return { ...m, lastHeartbeat: m.lastHeartbeat?.toISOString() ?? null, createdAt: m.createdAt.toISOString() }
}

let running = false
let stopSignal = false

export function isRunning() {
  return running
}

export function startSimulation() {
  if (running) return
  running = true
  stopSignal = false
  logger.info('Simulação iniciada')
  emit('simulation_started', {})
  runLoop().catch((err) => {
    logger.error({ err }, 'Erro inesperado na simulação')
    running = false
    emit('simulation_stopped', {})
  })
}

export function stopSimulation() {
  stopSignal = true
  running = false
}

async function sendPayment(machine: Machine) {
  const method = sample(PAYMENT_METHODS)
  const amount = sample(AMOUNTS)
  const forceStatus = Math.random() < 0.2 ? ('FAILED' as const) : undefined

  await publishPayment({ correlationId: randomUUID(), machineId: machine.id, amount, paymentMethod: method, ...(forceStatus && { forceStatus }) })

  emit('simulation_action', {
    message: forceStatus
      ? `✗ ${method} R$${brl(amount)} recusado · ${machine.name}`
      : `✓ ${method} R$${brl(amount)} aprovado · ${machine.name}`,
  })
}

async function sendTelemetry(machine: Machine) {
  const [updated] = await db.update(machines).set({ lastHeartbeat: new Date() }).where(eq(machines.id, machine.id)).returning()
  if (updated) emit('machine_updated', { machine: serializeMachine(updated) })
  emit('simulation_action', { message: `♥ Heartbeat · ${machine.name} (estoque ${machine.stockLevel}%)` })
}

async function patchMachine(id: string, data: { status?: Machine['status']; stockLevel?: number }) {
  const [updated] = await db.update(machines).set(data).where(eq(machines.id, id)).returning()
  if (updated) emit('machine_updated', { machine: serializeMachine(updated) })
  return updated
}

async function runLoop() {
  while (!stopSignal) {
    const online = await db.select().from(machines).where(eq(machines.status, 'ONLINE'))

    if (online.length === 0) {
      const all = await db.select().from(machines)
      if (all.length > 0) {
        const m = sample(all)
        emit('simulation_action', { message: `↑ Reativando ${m.name}...` })
        await patchMachine(m.id, { status: 'ONLINE', stockLevel: 100 })
      }
      await sleep(2000)
      continue
    }

    const machine = sample(online)
    const roll = Math.random()

    if (roll < 0.55) {
      await sendPayment(machine)
    } else if (roll < 0.75) {
      await sendTelemetry(machine)
    } else if (roll < 0.88) {
      if (machine.stockLevel < 30) {
        emit('simulation_action', { message: `↑ Reabastecendo ${machine.name}...` })
        await patchMachine(machine.id, { stockLevel: 100 })
        emit('simulation_action', { message: `↑ ${machine.name} reabastecida → 100%` })
      } else {
        await sendPayment(machine)
      }
    } else if (roll < 0.94) {
      emit('simulation_action', { message: `⚙ ${machine.name} entrando em manutenção...` })
      await patchMachine(machine.id, { status: 'MAINTENANCE' })
      await sleep(3000 + Math.random() * 4000)
      if (!stopSignal) {
        await patchMachine(machine.id, { status: 'ONLINE' })
        emit('simulation_action', { message: `✓ ${machine.name} voltou online` })
      }
    } else {
      emit('simulation_action', { message: `● ${machine.name} offline temporariamente...` })
      await patchMachine(machine.id, { status: 'OFFLINE' })
      await sleep(2000 + Math.random() * 3000)
      if (!stopSignal) {
        await patchMachine(machine.id, { status: 'ONLINE' })
        emit('simulation_action', { message: `✓ ${machine.name} voltou online` })
      }
    }

    await sleep(1500 + Math.random() * 2500)
  }

  emit('simulation_stopped', {})
  logger.info('Simulação encerrada')
}
