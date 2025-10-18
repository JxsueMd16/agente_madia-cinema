// services/api/src/controllers/agentController.js
import { answerWithAgentOrRAG } from '../services/agentService.js';

/**
 * Endpoint del agente inteligente (Fase 3)
 */
export async function handleAgent(req, res) {
  const { question } = req.body || {};
  
  if (!question) {
    return res.status(400).json({ 
      error: 'Falta el campo "question" en el body' 
    });
  }
  
  try {
    console.log('\n========================================');
    console.log('NUEVA CONSULTA AL AGENTE');
    console.log('========================================');
    
    const data = await answerWithAgentOrRAG({ question });
    
    res.json({
      success: true,
      ...data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en /agent:', error);
    res.status(500).json({ 
      success: false,
      error: error.message, 
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
}