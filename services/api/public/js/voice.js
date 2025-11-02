export function initVoice(){
  const btn = document.getElementById('btn-voice');
  const status = document.getElementById('voice-status');
  const recoEl = document.getElementById('voice-reco');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;

  if(!SpeechRecognition){
    status.textContent = 'STT no disponible en este navegador';
    btn.disabled = true;
    return;
  }

  const rec = new SpeechRecognition();
  rec.lang = 'es-ES';
  rec.interimResults = true;
  rec.continuous = true;
  rec.maxAlternatives = 1;

  let isListening = false;
  let fullTranscript = '';
  let shouldRestart = false; // Flag para reiniciar automáticamente

  rec.onstart = ()=>{
    status.textContent = '🎤 Escuchando... (mantén presionado)';
    status.style.color = '#c71e2f';
    btn.setAttribute('aria-pressed','true');
    isListening = true;
  };

  rec.onend = ()=>{
    isListening = false;
    
    // Si debemos reiniciar (porque aún mantienen el botón)
    if(shouldRestart && btn.getAttribute('aria-pressed') === 'true'){
      try{ rec.start(); }catch(e){ console.log('No se pudo reiniciar:', e); }
      return;
    }
    
    // Si hay texto acumulado, procesarlo
    if(fullTranscript.trim()){
      processTranscript(fullTranscript.trim());
      fullTranscript = '';
    } else {
      status.textContent = 'Listo (presiona para hablar)';
      status.style.color = '';
    }
    
    btn.setAttribute('aria-pressed','false');
  };

  rec.onerror = (e)=>{ 
    console.error('Error de reconocimiento:', e.error);
    
    // Errores que no son críticos
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
    
    // Acumular texto final
    if(newFinal) fullTranscript += newFinal;
    
    // Mostrar lo que llevamos + lo provisional
    const display = (fullTranscript + interim).trim();
    recoEl.textContent = display || 'Hablando...';
    
    // Actualizar status con indicador de actividad
    if(display){
      status.textContent = '🎤 Te escucho... (mantén presionado)';
    }
  };

  // ===== EVENTOS DE MOUSE/TOUCH =====
  
  // Presionar botón
  btn.addEventListener('mousedown', startListening);
  btn.addEventListener('touchstart', startListening);
  
  // Soltar botón
  btn.addEventListener('mouseup', stopListening);
  btn.addEventListener('touchend', stopListening);
  btn.addEventListener('mouseleave', stopListening); // Si sale del botón
  
  // Click (modo toggle para móviles que lo prefieran)
  btn.addEventListener('click', (e)=>{
    e.preventDefault();
  });

  function startListening(e){
    e.preventDefault();
    
    if(isListening) return; // Ya está escuchando
    
    recoEl.textContent = '';
    fullTranscript = '';
    shouldRestart = true;
    
    try{ 
      rec.start(); 
    } catch(err) { 
      // Si ya está activo, ignorar
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
    status.style.color = '#f6c300';
    recoEl.textContent = `"${text}"`;
    
    fetch('/agent', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ question: text })
    })
    .then(r=>r.json())
    .then(data=>{
      const answer = data?.answer || data?.message || 'Sin respuesta';
      speak(answer);
    })
    .catch(err=>{
      status.textContent = '❌ Error de red';
      status.style.color = '#c71e2f';
      console.error(err);
      
      // Volver a estado listo después de 3 segundos
      setTimeout(()=>{
        status.textContent = 'Listo (presiona para hablar)';
        status.style.color = '';
        recoEl.textContent = '';
      }, 3000);
    });
  }

  function speak(text){
    if(!synth){ 
      status.textContent = 'TTS no disponible'; 
      return; 
    }
    
    status.textContent = '🔊 Hablando...';
    status.style.color = '#4a9eff';
    
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'es-ES';
    utter.rate = 1.0;
    utter.pitch = 1.0;
    utter.volume = 1.0;
    
    utter.onend = ()=> {
      status.textContent = 'Listo (presiona para hablar)';
      status.style.color = '';
      recoEl.textContent = '';
    };
    
    utter.onerror = (e)=>{
      console.error('Error TTS:', e);
      status.textContent = 'Error al hablar';
    };
    
    synth.cancel(); // Cancelar cualquier habla anterior
    synth.speak(utter);
  }
  
  // Mensaje inicial
  status.textContent = 'Listo (presiona y mantén para hablar)';
}