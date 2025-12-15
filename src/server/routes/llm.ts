import { Router } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.js';
import { getLLMStatus } from '../services/llmService.js';

const router = Router();

router.use(authenticate);

router.get('/status', (req: AuthRequest, res) => {
  const status = getLLMStatus();
  res.json({
    success: true,
    data: status,
  });
});

export default router;
