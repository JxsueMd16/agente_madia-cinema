// services/api/src/controllers/agentController.js
import { processWithAgentMCP } from '../services/agentService.js';

/**
 * Endpoint del agente inteligente (RAG + MCP)
 * - RAG: Búsquedas semánticas en catálogo local
 * - MCP: Consultas externas a TMDB cuando no hay match local
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
    console.log('NUEVA CONSULTA AL AGENTE (RAG + MCP)');
    console.log('========================================');
    console.log(`Pregunta: "${question}"`);
    
    const data = await processWithAgentMCP({ question });
    
    // Logs informativos para debugging
    console.log('\n--- Resumen de Ejecución ---');
    
    if (data.mode?.includes('availability-local')) {
      console.log('[RAG] Película encontrada en catálogo local');
    }
    
    if (data.mcpUsed || data.mode?.includes('tmdb')) {
      console.log('[MCP] Consultado TMDB (película no en catálogo)');
    }
    
    if (data.mode?.includes('rag') || data.mode?.includes('hybrid')) {
      console.log('[RAG] Búsqueda semántica en embeddings');
    }
    
    if (data.usedTools?.length > 0) {
      console.log('[TOOLS] Ejecutadas:', data.usedTools.join(', '));
    }
    
    console.log(`Modo: ${data.mode}`);
    console.log('========================================\n');
    
    res.json({
      success: true,
      ...data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error en /agent:', error);
    res.status(500).json({ 
      success: false,
      error: error.message, 
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
}