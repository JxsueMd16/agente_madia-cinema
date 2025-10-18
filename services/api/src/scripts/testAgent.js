// services/api/src/scripts/testAgent.js
import { processWithAgent } from '../services/agentService.js';
import logger from '../utils/logger.js';

const testQuestions = [
  // Pruebas que DEBEN usar herramientas
  "Ejecuta la función para contar exactamente cuántas películas de acción hay en la base de datos",
  "Usa la herramienta de estadísticas para obtener información completa del catálogo",
  
  // ❌ Pruebas que NO deben usar herramientas (búsqueda semántica)
  "Quiero ver algo sobre viajes en el tiempo",
  "¿Tienes algo familiar y emotivo?"
];

async function runTests() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║     PRUEBAS DEL AGENTE INTELIGENTE (FASE 3)         ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  
  for (let i = 0; i < testQuestions.length; i++) {
    const question = testQuestions[i];
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`PRUEBA ${i + 1}/${testQuestions.length}`);
    console.log(`${'='.repeat(60)}`);
    logger.info(`Pregunta: "${question}"`);
    console.log(`${'-'.repeat(60)}`);
    
    try {
      const result = await processWithAgent({ question });
      
      logger.success('RESPUESTA:');
      console.log(result.answer);
      
      if (result.usedTools && result.usedTools.length > 0) {
        logger.agent('✅ HERRAMIENTAS USADAS:', result.usedTools.join(', '));
      } else {
        if (result.fallbackMode === 'RAG' || result.fallbackSearch) {
          logger.info('ℹ️  No usó herramientas (RAG / búsqueda semántica), comportamiento esperado.');
        } else {
          logger.warn('⚠️  No usó herramientas (modelo respondió directo).');
        }
      }

      
      if (result.toolResults) {
        logger.debug('Datos obtenidos de las herramientas:');
        result.toolResults.forEach(tr => {
          console.log(`  - ${tr.tool}: ${tr.dataCount} resultados`);
        });
      }
      
    } catch (error) {
      logger.error('ERROR:', error);
    }
    
    // Pausa entre pruebas
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n\n╔══════════════════════════════════════════════════════╗');
  console.log('║              PRUEBAS COMPLETADAS                     ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
    .then(() => {
      logger.success('Proceso completado exitosamente');
      process.exit(0);
    })
    .catch(err => {
      logger.error('Error fatal:', err);
      process.exit(1);
    });
}

export { runTests };