export function initChat(){
  const area = document.getElementById('chat-area');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const sugg = document.getElementById('chat-suggestions');

  // MEMORIA CONVERSACIONAL - almacena el historial de la conversacion actual
  let conversationHistory = [];

  // Preguntas de ejemplo
  const examples = [
    'Ejecuta la función para contar exactamente cuántas películas de acción hay en la base de datos',
    'Usa la herramienta de estadísticas para obtener información completa del catálogo',
    'Quiero ver algo sobre viajes en el tiempo',
    '¿Tienes algo familiar y emotivo?',
    'Dame un resumen de avengers endgame',
  ];
  
  if (sugg) {
    sugg.innerHTML = '';
    examples.forEach(txt=>{
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = txt;
      b.onclick = ()=> { input.value = txt; form.requestSubmit(); };
      sugg.appendChild(b);
    });
  }

  // BOTON DE REINICIAR CONVERSACION
  function createResetButton() {
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'reset-conversation-btn';
    resetBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
        <path d="M3 21v-5h5"/>
      </svg>
      <span>Nueva conversación</span>
    `;
    resetBtn.onclick = resetConversation;
    
    // Insertar el boton antes del formulario
    form.parentNode.insertBefore(resetBtn, form);
  }

  function resetConversation() {
    if (conversationHistory.length === 0) return;
    
    if (confirm('¿Quieres iniciar una nueva conversación? Se perderá el contexto actual.')) {
      conversationHistory = [];
      area.innerHTML = '';
      addMsg('Conversación reiniciada. ¿En qué puedo ayudarte?', 'bot');
    }
  }

  function addMsg(content, who='bot'){
    const el = document.createElement('div');
    el.className = `msg ${who}`;
    
    if (typeof content === 'string') {
      el.innerHTML = `<div>${escapeHtml(content)}</div>`;
    } else {
      el.appendChild(content);
    }
    
    area.appendChild(el);
    area.scrollTop = area.scrollHeight;
    return el;
  }

  function addLoading(){
    const el = document.createElement('div');
    el.className = 'msg bot loading';
    el.innerHTML = '<div></div>';
    area.appendChild(el);
    area.scrollTop = area.scrollHeight;
    return el;
  }

  function createMovieCard(pelicula) {
    const card = document.createElement('div');
    card.className = 'movie-mini-card';

    const localFallback = 'data:image/svg+xml;utf8,' +
      encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="50" height="75">
        <rect width="100%" height="100%" fill="#e5e7eb"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#6b7280">?</text>
      </svg>`);

    const poster = pelicula.poster_url || pelicula.poster || localFallback;
    const titulo = pelicula.titulo || pelicula.title || 'Sin título';
    const anio = pelicula.anio || pelicula.year || '';
    const generos = pelicula.generos || pelicula.genres || '';
    const rating = pelicula.calificacion || pelicula.rating || '';

    card.innerHTML = `
      <img class="poster-mini" src="${poster}" alt="${titulo}">
      <div class="info-mini">
        <h5>${escapeHtml(titulo)}</h5>
        <p>${[anio, generos].filter(Boolean).join(' • ')}</p>
      </div>
      ${rating ? `<div class="rating-mini">★ ${rating}</div>` : ''}
    `;

    const img = card.querySelector('.poster-mini');
    img.onerror = function () { this.onerror = null; this.src = localFallback; };

    card.onclick = () => { if (pelicula.id) console.log('Click en película:', pelicula); };
    return card;
  }

  async function send(text){
    addMsg(text, 'user');
    const loading = addLoading();
    
    // Agregar mensaje del usuario al historial
    conversationHistory.push({
      role: 'user',
      content: text
    });
    
    try{
      const r = await fetch('/agent', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ 
          question: text,
          history: conversationHistory.slice(0, -1) // Enviar historial previo (sin el ultimo mensaje que acabamos de agregar)
        })
      });
      
      const data = await r.json();
      loading.remove();
      
      // Extraer la respuesta
      const answer = data?.answer || data?.message || data?.text || 'Sin respuesta';
      
      // Agregar respuesta del bot al historial
      conversationHistory.push({
        role: 'assistant',
        content: answer
      });
      
      // Crear contenedor de respuesta
      const responseContainer = document.createElement('div');
      
      // Agregar texto de respuesta
      const textDiv = document.createElement('div');
      textDiv.innerHTML = escapeHtml(answer)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      responseContainer.appendChild(textDiv);
      
      // Si hay películas, mostrarlas en tarjetas
      if (data.peliculas && Array.isArray(data.peliculas) && data.peliculas.length > 0) {
        const moviesDiv = document.createElement('div');
        moviesDiv.style.marginTop = '12px';
        
        const header = document.createElement('div');
        header.style.fontSize = '12px';
        header.style.fontWeight = '600';
        header.style.color = 'var(--muted)';
        header.style.marginBottom = '8px';
        header.textContent = `🎬 ${data.peliculas.length} película${data.peliculas.length > 1 ? 's' : ''} encontrada${data.peliculas.length > 1 ? 's' : ''}:`;
        moviesDiv.appendChild(header);
        
        data.peliculas.forEach(pelicula => {
          const card = createMovieCard(pelicula);
          moviesDiv.appendChild(card);
        });
        
        responseContainer.appendChild(moviesDiv);
      }
      
      // Mostrar herramientas usadas (opcional)
      if (data.usedTools && data.usedTools.length > 0) {
        const toolsDiv = document.createElement('div');
        toolsDiv.style.marginTop = '8px';
        toolsDiv.style.fontSize = '11px';
        toolsDiv.style.color = 'var(--muted)';
        toolsDiv.innerHTML = `<em>🔧 Herramientas: ${data.usedTools.join(', ')}</em>`;
        responseContainer.appendChild(toolsDiv);
      }
      
      addMsg(responseContainer, 'bot');
      
    } catch(e) {
      loading.remove();
      addMsg('Error de red o del servidor', 'bot');
      console.error(e);
      
      // Remover el ultimo mensaje del historial si hubo error
      conversationHistory.pop();
    }
  }

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const text = input.value.trim();
    if(!text) return;
    input.value = '';
    send(text);
  });

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, s =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])
    );
  }

  // Inicializar boton de reset
  createResetButton();
  
  // Mensaje inicial
  addMsg('Hola, soy tu asistente de cine. ¿En qué puedo ayudarte?', 'bot');
}