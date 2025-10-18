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
  rec.continuous = false;

  let finalText = '';

  rec.onstart = ()=>{
    status.textContent = 'escuchando…';
    recoEl.textContent = '';
    finalText = '';
    btn.setAttribute('aria-pressed','true');
  };

  rec.onend = ()=>{
    if (!finalText) status.textContent = 'listo';
    btn.setAttribute('aria-pressed','false');
  };

  rec.onerror = (e)=>{ status.textContent = `error: ${e.error}`; };

  rec.onresult = (e)=>{
    let interim = '';
    for(let i=e.resultIndex; i<e.results.length; i++){
      const t = e.results[i][0].transcript;
      if(e.results[i].isFinal){ finalText += t; } else { interim += t; }
    }
    recoEl.textContent = finalText || interim;

    if(finalText){
      status.textContent = 'procesando…';
      fetch('/agent', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        // 👇 FIX: el backend espera { question }
        body: JSON.stringify({ question: finalText })
      })
      .then(r=>r.json())
      .then(data=>{
        const out = data?.answer || data?.message || 'Sin respuesta';
        speak(out);
      })
      .catch(err=>{
        status.textContent='error de red';
        console.error(err);
      })
      .finally(()=>{ finalText=''; });
    }
  };

  btn.addEventListener('click', ()=>{
    if(btn.getAttribute('aria-pressed') === 'true'){ rec.abort(); return; }
    try{ rec.start(); }catch{}
  });

  function speak(text){
    if(!synth){ status.textContent='TTS no disponible'; return; }
    status.textContent = 'hablando…';
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'es-ES';
    utter.onend = ()=> status.textContent = 'listo';
    synth.cancel();
    synth.speak(utter);
  }
}
