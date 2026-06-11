import { db } from './client'
import { machines, transactions } from './schema'

async function seed() {
  console.log('Seeding database...')

  await db.delete(transactions)
  await db.delete(machines)

  const [machine1, machine2, machine3] = await db
    .insert(machines)
    .values([
      {
        serialNumber: 'VM-001',
        name: 'Vending Machine - Hall Principal',
        location: 'Andar 1 - Entrada',
        status: 'ONLINE',
        stockLevel: 85,
        lastHeartbeat: new Date(),
      },
      {
        serialNumber: 'VM-002',
        name: 'Vending Machine - Cafeteria',
        location: 'Andar 2 - Cafeteria',
        status: 'ONLINE',
        stockLevel: 42,
        lastHeartbeat: new Date(Date.now() - 30000),
      },
      {
        serialNumber: 'VM-003',
        name: 'Vending Machine - Estacionamento',
        location: 'Subsolo - Estacionamento',
        status: 'OFFLINE',
        stockLevel: 0,
        lastHeartbeat: new Date(Date.now() - 3600000),
      },
    ])
    .returning()

  await db.insert(transactions).values([
    { machineId: machine1.id, amount: '5.50', paymentMethod: 'PIX', status: 'APPROVED' },
    { machineId: machine1.id, amount: '3.00', paymentMethod: 'CREDIT', status: 'APPROVED' },
    { machineId: machine2.id, amount: '7.50', paymentMethod: 'DEBIT', status: 'APPROVED' },
    { machineId: machine2.id, amount: '4.00', paymentMethod: 'PIX', status: 'FAILED' },
    { machineId: machine3.id, amount: '3.00', paymentMethod: 'CREDIT', status: 'APPROVED' },
    { machineId: machine3.id, amount: '7.50', paymentMethod: 'DEBIT', status: 'APPROVED' },
    { machineId: machine3.id, amount: '4.00', paymentMethod: 'PIX', status: 'FAILED' },
  ])

  console.log('Seed complete!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
