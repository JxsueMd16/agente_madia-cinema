// services/api/src/routes/healthRoutes.js
import { Router } from 'express';
import { checkHealth } from '../controllers/healthController.js';

const router = Router();

router.get('/', checkHealth);

export default router;