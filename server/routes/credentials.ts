import { Router } from 'express';
import { credentialService } from '../services/credentialService.js';
import { z } from 'zod';

export const credentialRouter = Router();

const CredentialCreateSchema = z.object({
  name: z.string().min(1, 'Credential name is required'),
  type: z.enum(['login', 'api_key', 'secret', 'payment']),
  username_or_key: z.string().optional(),
  secret: z.string().min(1, 'Secret value is required'),
  metadata: z.record(z.any()).optional()
});

credentialRouter.get('/', (req, res) => {
  try {
    const list = credentialService.list();
    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

credentialRouter.post('/', (req, res) => {
  try {
    const parsed = CredentialCreateSchema.parse(req.body);
    const created = credentialService.create(parsed as any);
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

credentialRouter.put('/:id', (req, res) => {
  try {
    const updated = credentialService.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Credential not found' });
    }
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

credentialRouter.delete('/:id', (req, res) => {
  try {
    const deleted = credentialService.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Credential not found' });
    }
    res.json({ success: true, message: 'Credential deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
