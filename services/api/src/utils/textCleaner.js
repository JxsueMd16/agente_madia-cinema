// services/api/src/utils/textCleaner.js

/**
 * Limpia texto para que sea más amigable con TTS (Text-to-Speech)
 */
export function cleanForTTS(text) {
  if (!text) return '';
  
  return text
    // Eliminar markdown
    .replace(/\*\*(.+?)\*\*/g, '$1')           // **negrita**
    .replace(/\*(.+?)\*/g, '$1')               // *cursiva*
    .replace(/_(.+?)_/g, '$1')                 // _subrayado_
    .replace(/`(.+?)`/g, '$1')                 // `código`
    .replace(/~~(.+?)~~/g, '$1')               // ~~tachado~~
    
    // Eliminar enlaces pero mantener el texto
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    
    // Convertir listas a texto fluido
    .replace(/^\s*[-*+]\s+/gm, '')             // - items
    .replace(/^\s*\d+\.\s+/gm, '')             // 1. items
    
    // Mejorar puntuación
    .replace(/\n\n+/g, '. ')                   // Párrafos → punto
    .replace(/\n/g, ', ')                      // Líneas → coma
    .replace(/\s+/g, ' ')                      // Espacios múltiples
    
    // Mejorar abreviaciones
    .replace(/\bej\./gi, 'ejemplo')
    .replace(/\betc\./gi, 'etcétera')
    .replace(/\bpág\./gi, 'página')
    .replace(/\bcap\./gi, 'capítulo')
    
    // Números ordinales
    .replace(/\b(\d+)º/g, (match, num) => {
      const ordinals = {
        '1': 'primero', '2': 'segundo', '3': 'tercero',
        '4': 'cuarto', '5': 'quinto', '6': 'sexto',
        '7': 'séptimo', '8': 'octavo', '9': 'noveno',
        '10': 'décimo'
      };
      return ordinals[num] || match;
    })
    
    // Limpiar caracteres problemáticos
    .replace(/[#@$%^&*(){}[\]<>]/g, '')
    .replace(/\.{4,}/g, '...')
    
    .trim();
}

/**
 * Prepara respuesta completa para el frontend voice
 */
export function prepareVoiceResponse(data) {
  if (!data) return data;
  
  const result = { ...data };
  
  // Limpiar el campo principal de respuesta
  if (result.answer) {
    result.answer_tts = cleanForTTS(result.answer);
  } else if (result.message) {
    result.message_tts = cleanForTTS(result.message);
  }
  
  return result;
}

export default { cleanForTTS, prepareVoiceResponse };