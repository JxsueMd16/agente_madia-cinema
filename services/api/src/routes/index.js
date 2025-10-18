// services/api/src/routes/index.js
import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import productosRoutes from './productosRoutes.js';
import queryRoutes from './queryRoutes.js';
import agentRoutes from './agentRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/productos', productosRoutes);
router.use('/query', queryRoutes);
router.use('/agent', agentRoutes);

export default router;