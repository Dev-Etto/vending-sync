import { z } from 'zod'

export const MachineSelectSchema = z.object({
  id: z.string().uuid(),
  serialNumber: z.string(),
  name: z.string(),
  location: z.string().nullable(),
  status: z.enum(['ONLINE', 'OFFLINE', 'MAINTENANCE']),
  stockLevel: z.number(),
  lastHeartbeat: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
})

export const MachineInsertSchema = z.object({
  serialNumber: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  location: z.string().optional(),
})

export const TransactionSelectSchema = z.object({
  id: z.string().uuid(),
  machineId: z.string().uuid(),
  amount: z.string(),
  paymentMethod: z.enum(['PIX', 'CREDIT', 'DEBIT']),
  status: z.enum(['PENDING', 'APPROVED', 'FAILED']),
  createdAt: z.string().datetime(),
})

export const TransactionWithMachineSchema = TransactionSelectSchema.extend({
  machineName: z.string(),
})

export const MachinePatchSchema = z.object({
  status: z.enum(['ONLINE', 'OFFLINE', 'MAINTENANCE']).optional(),
  stockLevel: z.number().min(0).max(100).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Pelo menos um campo deve ser fornecido',
})

export const UserPublicSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.string(),
})
