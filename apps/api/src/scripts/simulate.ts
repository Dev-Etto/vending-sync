/**
 * Simulador de vending machine para demonstração e testes manuais.
 *
 * Uso:
 *   MACHINE_ID=<uuid> pnpm --filter api simulate
 */
import 'dotenv/config'

const API_URL = process.env.API_URL || 'http://localhost:3001'
const MACHINE_ID = process.env.MACHINE_ID

const PAYMENT_METHODS = ['PIX', 'CREDIT', 'DEBIT'] as const
const AMOUNTS = [3.50, 5.00, 7.50, 4.00, 6.00, 8.50]

function sample<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function ts(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour12: false })
}

async function sendTelemetry(stockLevel: number): Promise<void> {
  try {
    await fetch(`${API_URL}/api/machines/${MACHINE_ID}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stockLevel, status: 'ONLINE' }),
    })
    console.log(`[${ts()}] ♥  Heartbeat   stock=${stockLevel}%`)
  } catch (err) {
    console.error(`[${ts()}] ✗  Telemetry failed:`, err)
  }
}

async function sendPayment(): Promise<void> {
  const method = sample(PAYMENT_METHODS)
  const amount = sample(AMOUNTS)

  try {
    const res = await fetch(`${API_URL}/api/webhooks/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machineId: MACHINE_ID, amount, paymentMethod: method }),
    })
    const data = await res.json() as { correlationId: string }
    console.log(`[${ts()}] $  Pagamento   ${method} R$${amount.toFixed(2)}  id=${data.correlationId}`)
  } catch (err) {
    console.error(`[${ts()}] ✗  Payment failed:`, err)
  }
}

async function simulate(): Promise<void> {
  if (!MACHINE_ID) {
    console.error(
      'Erro: MACHINE_ID é obrigatório.\n\n' +
      'Exemplo:\n' +
      '  MACHINE_ID=<uuid> pnpm --filter api simulate\n\n' +
      'Obtenha o UUID via:\n' +
      '  curl -s http://localhost:3001/api/machines -H "Authorization: Bearer <token>" | jq \'.[0].id\''
    )
    process.exit(1)
  }

  let stock = 100

  console.log('VendingSync Simulator')
  console.log(`Machine : ${MACHINE_ID}`)
  console.log(`API     : ${API_URL}`)
  console.log('Pressione Ctrl+C para parar\n')

  const heartbeatInterval = setInterval(() => sendTelemetry(stock), 10_000)

  const scheduleNextPayment = async () => {
    await sendPayment()
    stock = Math.max(0, stock - 10)
    setTimeout(scheduleNextPayment, 15_000 + Math.random() * 15_000)
  }

  await sendTelemetry(stock)
  await sleep(5_000)
  scheduleNextPayment()

  process.on('SIGINT', () => {
    console.log('\nSimulação encerrada.')
    clearInterval(heartbeatInterval)
    process.exit(0)
  })
}

simulate().catch(console.error)
