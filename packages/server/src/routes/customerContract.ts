import { Router, Request, Response } from 'express';
import { CustomerService } from '../services/CustomerService.js';
import { ContractService } from '../services/ContractService.js';
import { createAuthMiddleware, requirePermission } from '../middleware/auth.js';
import { AuthService } from '../services/AuthService.js';
import { z } from 'zod';

const createCustomerSchema = z.object({
  companyName: z.string().min(1),
  contact: z.object({
    primaryName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    emergencyContact: z.string().optional(),
  }),
  serviceTier: z.enum([
    'Standard',
    'Enterprise',
    'Mission-Critical Dedicated',
    'AI High-Performance',
  ]),
  activeServices: z.array(z.string()).optional(),
  internalNotes: z.string().optional(),
});

const createContractSchema = z.object({
  customerId: z.string().min(1),
  title: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  renewalDate: z.string().min(1),
  monthlyValueUsd: z.number().nonnegative(),
  assignedServiceKeys: z.array(z.string()).optional(),
  termsSummary: z.string().optional(),
  isAutoRenew: z.boolean().optional(),
});

const enforcementSchema = z.object({
  contractId: z.string().min(1),
  actionType: z.enum(['DEFAULT_WARNING', 'GRACE_PERIOD_NOTICE', 'SUSPENSION', 'REINSTATEMENT']),
  reason: z.string().min(5),
  gracePeriodDays: z.number().int().positive().optional(),
});

export function createCustomerContractRouter(
  customerService: CustomerService,
  contractService: ContractService,
  authService: AuthService
): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(authService);

  router.get('/customers', authMiddleware, requirePermission('CUSTOMER_VIEW'), (_req: Request, res: Response) => {
    try {
      const customers = customerService.getAllCustomers();
      res.json(customers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/customers/:id', authMiddleware, requirePermission('CUSTOMER_VIEW'), (req: Request, res: Response) => {
    try {
      const customer = customerService.getCustomerById(req.params.id);
      if (!customer) return res.status(404).json({ error: 'Customer not found' });
      res.json(customer);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/customers', authMiddleware, requirePermission('CUSTOMER_MANAGE'), (req: Request, res: Response) => {
    const parse = createCustomerSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid customer payload', details: parse.error.format() });
    }
    try {
      const customer = customerService.createCustomer(parse.data, {
        id: req.user!.id,
        username: req.user!.username,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });
      res.status(201).json(customer);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/contracts', authMiddleware, requirePermission('CONTRACT_VIEW'), (req: Request, res: Response) => {
    try {
      const customerId = req.query.customerId as string | undefined;
      const contracts = contractService.getAllContracts({ customerId });
      res.json(contracts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/contracts', authMiddleware, requirePermission('CONTRACT_MANAGE'), (req: Request, res: Response) => {
    const parse = createContractSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid contract payload', details: parse.error.format() });
    }
    try {
      const contract = contractService.createContract(parse.data, {
        id: req.user!.id,
        username: req.user!.username,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      });
      res.status(201).json(contract);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/contracts/defaults', authMiddleware, requirePermission('CONTRACT_VIEW'), (_req: Request, res: Response) => {
    try {
      const defaults = contractService.identifyContractDefaults();
      res.json(defaults);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/contracts/enforce', authMiddleware, requirePermission('CONTRACT_ENFORCE'), (req: Request, res: Response) => {
    const parse = enforcementSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid enforcement payload', details: parse.error.format() });
    }
    try {
      const action = contractService.initiateEnforcementAction({
        ...parse.data,
        actor: {
          id: req.user!.id,
          username: req.user!.username,
          ip: req.ip || req.socket.remoteAddress || 'unknown',
        },
      });
      res.status(200).json(action);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
