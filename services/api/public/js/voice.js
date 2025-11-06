export function initVoice(){
  const btn = document.getElementById('btn-voice');
  const status = document.getElementById('voice-status');
  const recoEl = document.getElementById('voice-reco');
  const visualizer = document.getElementById('audio-visualizer');
  const bars = visualizer.querySelectorAll('.bar');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;

  if(!SpeechRecognition){
    status.textContent = 'STT no disponible en este navegador';
    btn.disabled = true;
    return;
  }

  // Seleccionar mejor voz en español
  let selectedVoice = null;
  
  function loadVoices() {
    const voices = synth.getVoices();
    
    // Buscar voces en español en orden de preferencia
    const preferredVoices = [
      'Google español',
      'Microsoft Helena - Spanish (Spain)',
      'Paulina',
      'Monica',
      'es-ES',
      'es-MX'
    ];
    
    for (const preferred of preferredVoices) {
      selectedVoice = voices.find(v => 
        v.name.includes(preferred) || 
        v.lang.startsWith('es')
      );
      if (selectedVoice) break;
    }
    
    // Fallback: cualquier voz en español
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.startsWith('es'));
    }
    
    console.log('Voz seleccionada:', selectedVoice?.name || 'Predeterminada del sistema');
  }
  
  // Cargar voces al inicio y cuando estén disponibles
  if (synth.getVoices().length > 0) {
    loadVoices();
  }
  synth.onvoiceschanged = loadVoices;

  const rec = new SpeechRecognition();
  rec.lang = 'es-ES';
  rec.interimResults = true;
  rec.continuous = true;
  rec.maxAlternatives = 1;

  let isListening = false;
  let fullTranscript = '';
  let shouldRestart = false;
  let animationInterval = null;

  // Animación de barras
  function startBarsAnimation() {
    bars.forEach(bar => bar.classList.add('active'));
    
    animationInterval = setInterval(() => {
      bars.forEach(bar => {
        const height = Math.random() * 120 + 20;
        bar.style.height = `${height}px`;
      });
    }, 150);
  }

  function stopBarsAnimation() {
    bars.forEach(bar => {
      bar.classList.remove('active');
      bar.style.height = '20px';
    });
    
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }
  }

  rec.onstart = ()=>{
    status.textContent = '🎤 Escuchando... (mantén presionado)';
    btn.setAttribute('aria-pressed','true');
    visualizer.classList.add('listening');
    isListening = true;
    startBarsAnimation();
  };

  rec.onend = ()=>{
    isListening = false;
    stopBarsAnimation();
    visualizer.classList.remove('listening');
    
    if(shouldRestart && btn.getAttribute('aria-pressed') === 'true'){
      try{ rec.start(); }catch(e){ console.log('No se pudo reiniciar:', e); }
      return;
    }
    
    if(fullTranscript.trim()){
      processTranscript(fullTranscript.trim());
      fullTranscript = '';
    } else {
      status.textContent = 'Presiona y mantén para hablar';
    }
    
    btn.setAttribute('aria-pressed','false');
  };

  rec.onerror = (e)=>{ 
    console.error('Error de reconocimiento:', e.error);
    stopBarsAnimation();
    
    if(e.error === 'no-speech'){
      status.textContent = '🔇 No se detectó voz, mantén presionado y habla';
      return;
    }
    
    if(e.error === 'aborted'){
      status.textContent = 'Reconocimiento detenido';
      return;
    }
    
    status.textContent = `Error: ${e.error}`;
    isListening = false;
  };

  rec.onresult = (e)=>{
    let interim = '';
    let newFinal = '';
    
    for(let i=e.resultIndex; i<e.results.length; i++){
      const transcript = e.results[i][0].transcript;
      if(e.results[i].isFinal){ 
        newFinal += transcript + ' ';
      } else { 
        interim += transcript; 
      }
    }
    
    if(newFinal) fullTranscript += newFinal;
    
    const display = (fullTranscript + interim).trim();
    recoEl.textContent = display || 'Hablando...';
    
    if(display){
      status.textContent = '🎤 Te escucho... (mantén presionado)';
    }
  };

  // Eventos de mouse/touch
  btn.addEventListener('mousedown', startListening);
  btn.addEventListener('touchstart', startListening);
  
  btn.addEventListener('mouseup', stopListening);
  btn.addEventListener('touchend', stopListening);
  btn.addEventListener('mouseleave', stopListening);
  
  btn.addEventListener('click', (e)=>{
    e.preventDefault();
  });

  function startListening(e){
    e.preventDefault();
    
    if(isListening) return;
    
    recoEl.textContent = '';
    fullTranscript = '';
    shouldRestart = true;
    
    try{ 
      rec.start(); 
    } catch(err) { 
      if(err.message && err.message.includes('already started')){
        console.log('Ya está escuchando');
      } else {
        console.error('Error al iniciar:', err); 
      }
    }
  }

  function stopListening(e){
    e.preventDefault();
    shouldRestart = false;
    
    if(isListening){
      rec.stop();
    }
  }

  function processTranscript(text){
    if(!text) return;
    
    status.textContent = '⚙️ Procesando...';
    recoEl.textContent = `"${text}"`;
    visualizer.classList.add('processing');
    
    fetch('/agent', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ question: text })
    })
    .then(r=>r.json())
    .then(data=>{
      // Usar versión TTS si está disponible, sino limpiar la respuesta normal
      const answer = data?.answer_tts || data?.message_tts || 
                     data?.answer || data?.message || 'Sin respuesta';
      
      // DEBUG: Ver texto original vs limpio
      console.log('--- TTS DEBUG ---');
      console.log('Texto original:', answer);
      const cleaned = cleanTextForSpeech(answer);
      console.log('Texto limpio:', cleaned);
      console.log('--- FIN DEBUG ---');
      
      visualizer.classList.remove('processing');
      speak(answer);
    })
    .catch(err=>{
      status.textContent = '❌ Error de red';
      visualizer.classList.remove('processing');
      console.error(err);
      
      setTimeout(()=>{
        status.textContent = 'Presiona y mantén para hablar';
        recoEl.textContent = '';
      }, 3000);
    });
  }

  function cleanTextForSpeech(text) {
    if (!text) return '';
    
    let cleaned = text;
    
    // CRÍTICO: Eliminar markdown de forma más agresiva
    // Primero eliminar ** (negrita)
    cleaned = cleaned.replace(/\*\*/g, '');
    
    // Luego eliminar * (cursiva) - pero evitar multiplicaciones
    cleaned = cleaned.replace(/\*([^*\n]+)\*/g, '$1');
    cleaned = cleaned.replace(/\*/g, '');  // Eliminar asteriscos sueltos
    
    // Eliminar otros formatos
    cleaned = cleaned.replace(/_([^_\n]+)_/g, '$1');  // _subrayado_
    cleaned = cleaned.replace(/`([^`]+)`/g, '$1');     // `código`
    cleaned = cleaned.replace(/~~([^~]+)~~/g, '$1');   // ~~tachado~~
    cleaned = cleaned.replace(/#+ /g, '');             // ### headers
    
    // Eliminar enlaces [texto](url)
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // Eliminar listas
    cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, '');   // - item
    cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, '');   // 1. item
    
    // Eliminar emojis y símbolos especiales
    cleaned = cleaned.replace(/[🎬🎭🎪🎨🎯🎵🎤🎧🎸🎹🎺🎻🎼📺💵🛒🔗⚠️✅❌]/g, '');
    cleaned = cleaned.replace(/[#@$%^&{}[\]<>]/g, '');
    
    // Mejorar puntuación para pausas naturales
    cleaned = cleaned.replace(/\n\n+/g, '. ');         // Párrafos
    cleaned = cleaned.replace(/\n/g, ', ');            // Líneas
    cleaned = cleaned.replace(/\s+/g, ' ');            // Espacios
    
    // Expandir abreviaciones comunes
    cleaned = cleaned.replace(/\bej\./gi, 'ejemplo');
    cleaned = cleaned.replace(/\betc\./gi, 'etcétera');
    cleaned = cleaned.replace(/\bdr\./gi, 'doctor');
    cleaned = cleaned.replace(/\bdra\./gi, 'doctora');
    cleaned = cleaned.replace(/\bsra\./gi, 'señora');
    cleaned = cleaned.replace(/\bsr\./gi, 'señor');
    cleaned = cleaned.replace(/\bvs\./gi, 'versus');
    cleaned = cleaned.replace(/\bp\.ej\./gi, 'por ejemplo');
    
    // Números ordinales
    cleaned = cleaned.replace(/\b1º/g, 'primero');
    cleaned = cleaned.replace(/\b2º/g, 'segundo');
    cleaned = cleaned.replace(/\b3º/g, 'tercero');
    cleaned = cleaned.replace(/\b(\d+)º/g, '$1');
    
    // Mejorar lectura de rangos
    cleaned = cleaned.replace(/(\d+)\s*-\s*(\d+)/g, '$1 a $2');
    
    // Limpiar puntos suspensivos
    cleaned = cleaned.replace(/\.{4,}/g, '...');
    
    // Limpiar dos puntos seguidos de espacio
    cleaned = cleaned.replace(/:\s+/g, ': ');
    
    return cleaned.trim();
  }

  function speak(text){
    if(!synth){ 
      status.textContent = 'TTS no disponible'; 
      return; 
    }
    
    // Limpiar texto antes de hablar
    const cleanText = cleanTextForSpeech(text);
    
    // OPCIÓN: Mostrar texto completo con scroll
    recoEl.textContent = cleanText;
    
    status.textContent = '🔊 Hablando...';
    visualizer.classList.add('speaking');
    startBarsAnimation();
    
    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.lang = 'es-ES';
    utter.rate = 0.95;  // Ligeramente más lento para mejor comprensión
    utter.pitch = 1.0;
    utter.volume = 1.0;
    
    // Usar la voz seleccionada si está disponible
    if (selectedVoice) {
      utter.voice = selectedVoice;
    }
    
    // Dividir textos largos en fragmentos para mejor fluidez
    if (cleanText.length > 300) {
      utter.rate = 0.90; // Más lento para textos largos
    }
    
    utter.onend = ()=> {
      status.textContent = 'Presiona y mantén para hablar';
      recoEl.textContent = '';
      visualizer.classList.remove('speaking');
      stopBarsAnimation();
    };
    
    utter.onerror = (e)=>{
      console.error('Error TTS:', e);
      status.textContent = 'Error al hablar';
      visualizer.classList.remove('speaking');
      stopBarsAnimation();
    };
    
    synth.cancel();
    synth.speak(utter);
  }
  
  status.textContent = 'Presiona y mantén para hablar';
}