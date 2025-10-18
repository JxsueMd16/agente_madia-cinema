// services/api/src/routes/agentRoutes.js
import { Router } from 'express';
import { handleAgent } from '../controllers/agentController.js';

const router = Router();

router.post('/', handleAgent);

export default router;