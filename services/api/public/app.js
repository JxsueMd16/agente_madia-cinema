const app = document.getElementById('app');

// Carga una vista HTML y su JS asociado
async function loadView(name) {
  const res = await fetch(`/views/${name}.html`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`No se pudo cargar ${name}.html`);
  app.innerHTML = await res.text();

  // Inicializa lógica de cada vista
  if (name === 'chat') {
    const { initChat } = await import('/js/chat.js');
    initChat();
  }
  if (name === 'voice') {
    const { initVoice } = await import('/js/voice.js');
    initVoice();
  }
  if (name === 'cartelera') {
    const { initCatalog } = await import('/js/catalog.js').catch(() => ({ initCatalog: null }));
    if (initCatalog) initCatalog();
  }

  // Modal cierre (si existe en DOM)
  const modal = document.getElementById('modal');
  const close = document.getElementById('modal-close');
  if (modal && close) {
    close.onclick = () => modal.close();
    modal.addEventListener('click', (e)=>{ if(e.target === modal) modal.close(); });
  }
}

// Navegación lateral
document.querySelectorAll('[data-view]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('[data-view]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    loadView(btn.dataset.view).catch(console.error);
  });
});

// Vista inicial
loadView('chat').catch(console.error);
