import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import productosRoutes from './productosRoutes.js';
import queryRoutes from './queryRoutes.js';
import agentRoutes from './agentRoutes.js';
import voiceRoutes from './voiceRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/productos', productosRoutes);
router.use('/query', queryRoutes);
router.use('/agent', agentRoutes);
router.use('/voice', voiceRoutes);

export default router;