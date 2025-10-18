// services/api/src/services/agentService.js
import { chatWithTools, sendToolResults } from './aiService.js';
import { toolDefinitions, executeTool } from './toolsService.js';
import { semanticSearchPeliculas } from './ragService.js';
import { answerWithRAG } from './ragService.js';
import { pool } from '../config/database.js';

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
  // 1. Exacto
  const exact = await pool.query(`
    SELECT id, titulo, anio, generos, calificacion, poster_url
    FROM v_peliculas
    WHERE LOWER(unaccent(titulo)) = LOWER(unaccent($1))
       OR LOWER(unaccent(titulo_original)) = LOWER(unaccent($1))
    LIMIT 1
  `, [q]);

  if (exact.rows[0]) return { match: exact.rows[0], via: 'exact' };

  // 2. Semántico
  const sem = await semanticSearchPeliculas({ query: q, k: 1 });
  const hit = sem?.[0];
  if (hit && hit.similarity >= 0.88) return { match: hit, via: 'semantic' };

  return { match: null, via: 'none' };
}

async function checkAvailabilityFlow(question) {
  const title = /"(.*?)"/.exec(question)?.[1] ||
    question.replace(/(tienes|est[aá] en tu cat[aá]logo|disponible|lo tienes|\?)/gi, '').trim();

  const { match, via } = await findAvailability(title);

  if (match) {
    return {
      answer: `Sí, tengo **${match.titulo}** (${match.anio}) en mi catálogo. ¿Quieres su sinopsis o películas similares?`,
      mode: `availability-${via}`,
      peliculas: [match],
      usedTools: []
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
    usedTools: []
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
  return { answer, mode: 'hybrid', peliculas: peliculas.length ? peliculas : undefined, usedTools: [] };
}

async function executeWithCatalogFocus(question) {
  const response = await chatWithTools({ prompt: question, tools: toolDefinitions, systemInstruction: SYSTEM_INSTRUCTION });

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
    return { answer: finalAnswer, mode: 'catalog-tools', usedTools: response.functionCalls.map(c => c.name) };
  }

  const rag = await answerWithRAG({ question });
  return { answer: rag.answer, mode: 'catalog-rag', peliculas: rag.peliculas, usedTools: [] };
}

/* =====================================================
   ORQUESTADOR PRINCIPAL
===================================================== */
export async function processWithAgent({ question }) {
  console.log('\n=== INICIO DEL AGENTE ===');
  const intent = getIntent(question);
  console.log('[INTENT]', intent);

  if (intent.askingAvailability) return await checkAvailabilityFlow(question);
  if (intent.explicitTool || intent.askingAboutCatalog) return await executeWithCatalogFocus(question);
  if (intent.generalQuestion) return await answerFreely(question);
  if (intent.catalogQuery) return await answerHybrid(question);

  return await answerFreely(question);
}

/* =====================================================
   Fallback
===================================================== */
export async function answerWithAgentOrRAG({ question }) {
  try {
    return await processWithAgent({ question });
  } catch (e) {
    console.warn('Error en agente, fallback:', e.message);
    return await answerFreely(question);
  }
}
