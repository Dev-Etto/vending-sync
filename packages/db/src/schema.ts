import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  decimal,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core'

export const machineStatusEnum = pgEnum('machine_status', ['ONLINE', 'OFFLINE', 'MAINTENANCE'])
export const paymentMethodEnum = pgEnum('payment_method', ['PIX', 'CREDIT', 'DEBIT'])
export const transactionStatusEnum = pgEnum('transaction_status', ['PENDING', 'APPROVED', 'FAILED'])

export const machines = pgTable(
  'machines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serialNumber: varchar('serial_number', { length: 100 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    location: varchar('location', { length: 255 }),
    status: machineStatusEnum('status').default('OFFLINE').notNull(),
    stockLevel: integer('stock_level').default(100).notNull(),
    lastHeartbeat: timestamp('last_heartbeat', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('machines_serial_number_idx').on(table.serialNumber),
    index('machines_status_idx').on(table.status),
  ]
)

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    machineId: uuid('machine_id')
      .notNull()
      .references(() => machines.id, { onDelete: 'cascade' }),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    paymentMethod: paymentMethodEnum('payment_method').notNull(),
    status: transactionStatusEnum('status').default('PENDING').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('transactions_machine_id_idx').on(table.machineId),
    index('transactions_status_idx').on(table.status),
    index('transactions_created_at_idx').on(table.createdAt),
  ]
)

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('operator').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Tipos TypeScript inferidos do schema — type safety de graça!
export type Machine = typeof machines.$inferSelect
export type NewMachine = typeof machines.$inferInsert
export type Transaction = typeof transactions.$inferSelect
export type NewTransaction = typeof transactions.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
