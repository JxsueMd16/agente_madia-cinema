// services/api/src/services/elevenLabsService.js
import fetch from 'node-fetch'; // Necesitas instalarlo: npm install node-fetch

const { ELEVENLABS_API_KEY } = process.env;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Voces disponibles (IDs reales de ElevenLabs)
const VOICES = {
  rachel: '21m00Tcm4TlvDq8ikWAM', // Voz femenina en inglés
  adam: 'pNInz6obpgDQGcFmaJgB',   // Voz masculina en inglés
  // Para español, necesitas buscar voces en español desde su API
};

/**
 * Convierte texto a audio usando ElevenLabs
 * @param {string} text - Texto a convertir
 * @param {string} voiceId - ID de la voz a usar
 * @returns {Promise<Buffer>} - Audio en formato MP3
 */
export async function textToSpeech(text, voiceId = VOICES.rachel) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY no configurada');
  }

  const url = `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2', // Soporta español
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${error}`);
  }

  // Retorna el buffer de audio
  const audioBuffer = await response.arrayBuffer();
  return Buffer.from(audioBuffer);
}

/**
 * Obtiene lista de voces disponibles
 */
export async function getVoices() {
  const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error('Error obteniendo voces');
  }

  const data = await response.json();
  return data.voices;
}