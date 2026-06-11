import bcrypt from 'bcryptjs'
import { db } from './client'
import { machines, transactions, users } from './schema'

const hour = 1000 * 60 * 60
const day = hour * 24

async function seed() {
  console.log('Seeding database...')

  await db.delete(transactions)
  await db.delete(machines)
  await db.delete(users)

  // Users
  const [adminHash, operatorHash] = await Promise.all([
    bcrypt.hash('admin123', 12),
    bcrypt.hash('operator123', 12),
  ])

  await db.insert(users).values([
    { email: 'admin@vendingsync.com', passwordHash: adminHash, role: 'admin' },
    { email: 'operador@vendingsync.com', passwordHash: operatorHash, role: 'operator' },
  ])
  console.log('Users created: admin@vendingsync.com / admin123 | operador@vendingsync.com / operator123')

  // Machines
  const insertedMachines = await db
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
        lastHeartbeat: new Date(Date.now() - 5 * 60 * 1000),
      },
      {
        serialNumber: 'VM-003',
        name: 'Vending Machine - Estacionamento',
        location: 'Subsolo - Estacionamento',
        status: 'OFFLINE',
        stockLevel: 0,
        lastHeartbeat: new Date(Date.now() - hour),
      },
      {
        serialNumber: 'VM-004',
        name: 'Vending Machine - Recepção',
        location: 'Andar 1 - Recepção',
        status: 'ONLINE',
        stockLevel: 70,
        lastHeartbeat: new Date(Date.now() - 2 * 60 * 1000),
      },
      {
        serialNumber: 'VM-005',
        name: 'Vending Machine - TI',
        location: 'Andar 3 - Sala de TI',
        status: 'ONLINE',
        stockLevel: 95,
        lastHeartbeat: new Date(Date.now() - 10 * 60 * 1000),
      },
      {
        serialNumber: 'VM-006',
        name: 'Vending Machine - RH',
        location: 'Andar 2 - Recursos Humanos',
        status: 'MAINTENANCE',
        stockLevel: 20,
        lastHeartbeat: new Date(Date.now() - 2 * hour),
      },
      {
        serialNumber: 'VM-007',
        name: 'Vending Machine - Auditório',
        location: 'Andar 4 - Auditório',
        status: 'ONLINE',
        stockLevel: 60,
        lastHeartbeat: new Date(Date.now() - 15 * 60 * 1000),
      },
      {
        serialNumber: 'VM-008',
        name: 'Vending Machine - Almoxarifado',
        location: 'Térreo - Almoxarifado',
        status: 'OFFLINE',
        stockLevel: 5,
        lastHeartbeat: new Date(Date.now() - 6 * hour),
      },
    ])
    .returning()

  // Transactions — spread across last 7 days
  const txValues = []

  const amounts = ['2.50', '3.00', '3.50', '4.00', '4.50', '5.00', '5.50', '6.00', '7.50', '8.00']
  const methods = ['PIX', 'CREDIT', 'DEBIT'] as const
  const statuses = ['APPROVED', 'APPROVED', 'APPROVED', 'APPROVED', 'FAILED', 'PENDING'] as const

  for (let d = 0; d < 7; d++) {
    for (const machine of insertedMachines) {
      if (machine.status === 'OFFLINE') continue

      const txPerDay = machine.status === 'MAINTENANCE' ? 2 : Math.floor(Math.random() * 6) + 4

      for (let t = 0; t < txPerDay; t++) {
        txValues.push({
          machineId: machine.id,
          amount: amounts[Math.floor(Math.random() * amounts.length)],
          paymentMethod: methods[Math.floor(Math.random() * methods.length)],
          status: statuses[Math.floor(Math.random() * statuses.length)],
          createdAt: new Date(Date.now() - d * day - Math.random() * hour * 10),
        })
      }
    }
  }

  await db.insert(transactions).values(txValues)

  console.log(`Seed complete! ${insertedMachines.length} machines, ${txValues.length} transactions.`)
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
