// services/api/src/routes/voiceRoutes.js
import { Router } from 'express';
import { textToSpeech, getVoices } from '../services/elevenLabsService.js';

const router = Router();

// Endpoint para convertir texto a voz
router.post('/tts', async (req, res) => {
  const { text, voiceId } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Falta el campo "text"' });
  }

  try {
    const audioBuffer = await textToSpeech(text, voiceId);
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length
    });
    
    res.send(audioBuffer);
  } catch (error) {
    console.error('Error en TTS:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para listar voces disponibles
router.get('/voices', async (req, res) => {
  try {
    const voices = await getVoices();
    res.json(voices);
  } catch (error) {
    console.error('Error obteniendo voces:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;