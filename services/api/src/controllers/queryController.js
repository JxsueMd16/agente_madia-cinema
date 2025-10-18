// services/api/src/controllers/queryController.js
import { answerWithRAG } from '../services/ragService.js';

/**
 * Endpoint de consulta usando RAG (Fase 2)
 */
export async function handleQuery(req, res) {
  const { question } = req.body || {};
  
  if (!question) {
    return res.status(400).json({ 
      error: 'Falta el campo "question" en el body' 
    });
  }
  
  try {
    const data = await answerWithRAG({ question });
    res.json(data);
  } catch (error) {
    console.error('Error en /query:', error);
    res.status(500).json({ 
      error: error.message, 
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
}