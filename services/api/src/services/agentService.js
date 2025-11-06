// services/api/src/services/agentService.js
import { chatWithTools, sendToolResults } from './aiService.js';
import { toolDefinitions, executeTool } from './toolsService.js';
import { semanticSearchPeliculas } from './ragService.js';
import { answerWithRAG } from './ragService.js';
import { pool } from '../config/database.js';
import { getMCPClient } from './mcpClient.js';

const SYSTEM_INSTRUCTION = `
Eres un asistente de IA experto en cine, con personalidad cálida y conversacional.

IMPORTANTE:
Eres una IA con conocimiento amplio sobre películas, cultura, entretenimiento y temas generales.
Tienes acceso a un catálogo específico de películas disponibles para el usuario, que puedes consultar mediante embeddings.

DISPONIBILIDAD (REGLA OBLIGATORIA):
- Nunca afirmes que una película está "en tu catálogo" sin verificarlo realmente en la base de datos.
- Si no la encuentras, responde: "no la tengo registrada en el catálogo por ahora", y ofrece alternativas parecidas.

CÓMO FUNCIONAS:

1. **Preguntas generales sobre cine o cultura** → responde libremente.
2. **Consultas sobre tu catálogo** → usa las herramientas o búsqueda semántica.
3. **Recomendaciones** → combina conocimiento general + tu catálogo.
4. **Preguntas de disponibilidad** → verifica con la base antes de afirmar.

ESTILO:
Natural, cálido, entusiasta. No suenes como chatbot.
Sé conversacional y real, usa expresiones humanas ("Mira...", "La verdad...").
`;

/* =====================================================
   INTENT DETECTOR
===================================================== */
function getIntent(question) {
  const q = (question || "").toLowerCase();

  return {
    askingAvailability: /(tienes|est[aá] en tu cat[aá]logo|disponible|lo tienes|existe en tu cat[aá]logo)/i.test(q),
    askingAboutCatalog: /(tu catálogo|películas disponibles|las que tienes|qué tienes|cuántas tienes|en tu colección|de las tuyas)/i.test(q),
    explicitTool: /(ejecuta|usa( la)? herramienta|contar|estadísticas?|compara(r)?)/i.test(q),
    catalogQuery: /\b(recomienda|recomiéndame|busca|quiero ver|películas de|algo de)\b/i.test(q),
    generalQuestion: /(quién dirigió|quién actuó|de qué trata|resumen de|cuéntame de|qué sabes de)/i.test(q)
  };
}

/* =====================================================
   CONSULTA DE DISPONIBILIDAD REAL
===================================================== */
async function findAvailability(title) {
  const q = title.trim();
  
  // 1. EXACTO - Coincidencia perfecta
  const exact = await pool.query(`
    SELECT id, titulo, anio, generos, calificacion, poster_url
    FROM v_peliculas
    WHERE LOWER(unaccent(titulo)) = LOWER(unaccent($1))
       OR LOWER(unaccent(titulo_original)) = LOWER(unaccent($1))
    LIMIT 1
  `, [q]);

  if (exact.rows[0]) return { match: exact.rows[0], via: 'exact' };

  // 2. FLEXIBLE - Búsqueda parcial ultra-tolerante
  const flexible = await pool.query(`
    SELECT id, titulo, titulo_original, anio, generos, calificacion, poster_url
    FROM v_peliculas
    WHERE 
      -- Búsqueda básica
      LOWER(titulo) LIKE '%' || LOWER($1) || '%'
      OR LOWER($1) LIKE '%' || LOWER(titulo) || '%'
      OR LOWER(titulo_original) LIKE '%' || LOWER($1) || '%'
      
      -- Sin guiones ni dos puntos
      OR LOWER(REPLACE(REPLACE(titulo, '-', ''), ':', '')) 
        LIKE '%' || LOWER(REPLACE(REPLACE($1, '-', ''), ':', '')) || '%'
      
      -- Solo letras y números
      OR regexp_replace(LOWER(titulo), '[^a-z0-9]', '', 'g') 
        LIKE '%' || regexp_replace(LOWER($1), '[^a-z0-9]', '', 'g') || '%'
    LIMIT 1
  `, [q]);

  if (flexible.rows[0]) {
    return { match: flexible.rows[0], via: 'flexible' };
  }

  // 3. SEMÁNTICO - Embeddings (último recurso)
  const sem = await semanticSearchPeliculas({ query: q, k: 1 });
  const hit = sem?.[0];
  if (hit && hit.similarity >= 0.85) {
    return { match: hit, via: 'semantic' };
  }

  return { match: null, via: 'none' };
}

async function checkAvailabilityFlow(question) {
  const title = /"(.*?)"/.exec(question)?.[1] ||
    question.replace(/(tienes|est[aá] en tu cat[aá]logo|disponible|lo tienes|\?)/gi, '').trim();

  const { match, via } = await findAvailability(title);

  if (match) {
      let confidence = '';
      if (via === 'flexible') {
        confidence = ' (encontrada por similitud)';
      } else if (via === 'semantic') {
        confidence = ' (encontrada por búsqueda semántica)';
      }

      return {
        answer: `Sí, tengo **${match.titulo}** (${match.anio}) en mi catálogo${confidence}. ¿Quieres su sinopsis o películas similares?`,
      mode: `availability-${via}`,
      peliculas: [match],
      usedTools: [],
      usedRAG: true
    };
  }

  const near = await semanticSearchPeliculas({ query: title, k: 3 });
  const alt = near?.length
    ? 'Puedo ofrecerte algo parecido:\n' +
      near.map(p => `- ${p.titulo} (${p.anio})`).join('\n')
    : '¿Quieres que busque algo del mismo género o estilo?';

  return {
    answer: `No la tengo registrada en mi catálogo por ahora. ${alt}`,
    mode: 'availability-none',
    peliculas: near?.length ? near : undefined,
    usedTools: [],
    usedRAG: true
  };
}

/* =====================================================
   RESPUESTAS PRINCIPALES
===================================================== */
async function answerFreely(question) {
  const { chatAnswer } = await import('./aiService.js');
  const prompt = `${SYSTEM_INSTRUCTION}

El usuario te pregunta algo general sobre cine. Responde con conocimiento real y natural, sin limitarte.

PREGUNTA: ${question}`;

  const answer = await chatAnswer(prompt);
  return { answer, mode: 'free', usedTools: [] };
}

async function answerHybrid(question) {
  const peliculas = await semanticSearchPeliculas({ query: question, k: 3 });
  const { chatAnswer } = await import('./aiService.js');

  let context = '';
  if (peliculas.length) {
    context += '\nPELÍCULAS DISPONIBLES:\n';
    peliculas.forEach(p => {
      context += `- ${p.titulo} (${p.anio}) - ${p.generos} - ${p.calificacion}/10\n`;
    });
  }

  const prompt = `${SYSTEM_INSTRUCTION}
El usuario busca recomendaciones.
${context}
PREGUNTA: ${question}`;

  const answer = await chatAnswer(prompt);
  return { 
    answer, 
    mode: 'hybrid', 
    peliculas: peliculas.length ? peliculas : undefined, 
    usedTools: [],
    usedRAG: true 
  };
}

async function executeWithCatalogFocus(question) {
  const response = await chatWithTools({ 
    prompt: question, 
    tools: toolDefinitions, 
    systemInstruction: SYSTEM_INSTRUCTION 
  });

  if (response.functionCalls?.length) {
    const toolResults = [];
    for (const call of response.functionCalls) {
      try {
        const result = await executeTool(call.name, call.args);
        toolResults.push({ functionResponse: { name: call.name, response: result } });
      } catch (e) {
        toolResults.push({ functionResponse: { name: call.name, response: { error: e.message } } });
      }
    }
    const finalAnswer = await sendToolResults({ chat: response.chat, toolResults });
    return { 
      answer: finalAnswer, 
      mode: 'catalog-tools', 
      usedTools: response.functionCalls.map(c => c.name) 
    };
  }

  const rag = await answerWithRAG({ question });
  return { 
    answer: rag.answer, 
    mode: 'catalog-rag', 
    peliculas: rag.peliculas, 
    usedTools: [],
    usedRAG: true 
  };
}

/* =====================================================
   BÚSQUEDA HÍBRIDA (RAG + MCP)
===================================================== */
async function buscarPeliculaHibrida(titulo) {
  console.log(`\n[BUSQUEDA HIBRIDA] Título: "${titulo}"`);
  
  // 1. Buscar en catálogo local (RAG)
  console.log('   -> Buscando en catálogo local (RAG)...');
  const { match: localMatch } = await findAvailability(titulo);
  
  if (localMatch) {
    console.log('   [OK] Encontrada en catálogo local');
    return {
      source: 'local',
      pelicula: localMatch,
      message: `Tengo **${localMatch.titulo}** (${localMatch.anio}) en mi catálogo.`
    };
  }

  // 2. Buscar en TMDB vía MCP
  console.log('   -> No encontrada localmente, buscando en TMDB (MCP)...');
  try {
    const mcpClient = getMCPClient();
    const tmdbResults = await mcpClient.searchMovie(titulo);
    
    // DEBUG: Ver qué devuelve MCP
    console.log('   [DEBUG] Resultado de MCP:', JSON.stringify(tmdbResults, null, 2));
    
    if (tmdbResults?.peliculas?.length > 0) {
      const pelicula = tmdbResults.peliculas[0];
      console.log('   [OK] Encontrada en TMDB');
      
      // Obtener disponibilidad de streaming en Guatemala
      let streamingInfo = '';
      try {
        const availability = await mcpClient.getStreamingAvailability(pelicula.id);
        
        if (availability.disponible) {
          streamingInfo = '\n\n**Disponible en Guatemala:**\n';
          
          if (availability.streaming?.length > 0) {
            streamingInfo += `📺 Streaming: ${availability.streaming.map(s => s.nombre).join(', ')}\n`;
          }
          
          if (availability.rent?.length > 0) {
            streamingInfo += `💵 Alquiler: ${availability.rent.map(s => s.nombre).join(', ')}\n`;
          }
          
          if (availability.buy?.length > 0) {
            streamingInfo += `🛒 Compra: ${availability.buy.map(s => s.nombre).join(', ')}\n`;
          }
          
          if (availability.link) {
            streamingInfo += `🔗 Más info: ${availability.link}`;
          }
        } else {
          streamingInfo = '\n\n⚠️ No disponible en servicios de streaming en Guatemala actualmente.';
        }
      } catch (error) {
        console.error('   [WARN] No se pudo obtener info de streaming:', error.message);
      }
      
      return {
        source: 'tmdb',
        pelicula,
        allResults: tmdbResults.peliculas.slice(1, 3),
        message: `No la tengo en mi catálogo, pero la encontré en TMDB:\n\n` +
          `**${pelicula.titulo}** (${pelicula.anio})\n` +
          `Calificación: ${pelicula.calificacion}/10\n\n` +
          `${pelicula.descripcion}${streamingInfo}\n\n` +
          `Nota: Esta información fue consultada vía MCP desde TMDB.`
      };
    } else {
      console.log('   [WARN] MCP no devolvió películas o estructura incorrecta');
    }
  } catch (error) {
    console.error('   [ERROR] En búsqueda MCP:', error.message);
    console.error('   [ERROR] Stack:', error.stack);
  }

  // 3. No encontrada en ningún lado
  console.log('   [WARN] No encontrada en ninguna fuente');
  return {
    source: 'none',
    pelicula: null,
    message: `No encontré información sobre "${titulo}" ni en mi catálogo ni en TMDB. ` +
      `¿Podrías verificar el título o probar con otro nombre?`
  };
}

/* =====================================================
   FLUJO CON MCP
===================================================== */
async function checkAvailabilityFlowMCP(question) {
  const title = /"(.*?)"/.exec(question)?.[1] ||
    question.replace(/(tienes|está en tu catálogo|disponible|lo tienes|\?)/gi, '').trim();

  console.log(`\n[DISPONIBILIDAD] Verificando: "${title}"`);
  
  const result = await buscarPeliculaHibrida(title);
  
  return {
    answer: result.message,
    mode: `availability-${result.source}`,
    peliculas: result.pelicula ? [result.pelicula] : undefined,
    usedTools: result.source === 'tmdb' ? ['MCP:search_movie_tmdb'] : [],
    mcpUsed: result.source === 'tmdb',
    usedRAG: result.source === 'local'
  };
}

/* =====================================================
   ORQUESTADORES
===================================================== */
async function processWithAgent({ question }) {
  console.log('\n=== AGENTE (SOLO RAG) ===');
  const intent = getIntent(question);
  console.log('[INTENT]', intent);

  if (intent.askingAvailability) return await checkAvailabilityFlow(question);
  if (intent.explicitTool || intent.askingAboutCatalog) return await executeWithCatalogFocus(question);
  if (intent.generalQuestion) return await answerFreely(question);
  if (intent.catalogQuery) return await answerHybrid(question);

  return await answerFreely(question);
}

async function processWithAgentMCP({ question }) {
  console.log('\n=== AGENTE (RAG + MCP) ===');
  const intent = getIntent(question);
  console.log('[INTENT]', intent);

  // Si pregunta por disponibilidad, usar flujo híbrido MCP
  if (intent.askingAvailability) {
    return await checkAvailabilityFlowMCP(question);
  }

  // Resto de casos igual que antes
  if (intent.explicitTool || intent.askingAboutCatalog) {
    return await executeWithCatalogFocus(question);
  }
  if (intent.generalQuestion) {
    return await answerFreely(question);
  }
  if (intent.catalogQuery) {
    return await answerHybrid(question);
  }

  return await answerFreely(question);
}

/* =====================================================
   EXPORTS
===================================================== */
export { 
  processWithAgent, 
  processWithAgentMCP, 
  buscarPeliculaHibrida 
};

// Fallback compatible con código existente
export async function answerWithAgentOrRAG({ question }) {
  try {
    return await processWithAgent({ question });
  } catch (e) {
    console.warn('[FALLBACK] Error en agente:', e.message);
    return await answerFreely(question);
  }
}