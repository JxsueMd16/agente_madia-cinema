export function initCatalog(){
  const grid = document.getElementById('grid-cartelera');
  const empty = document.getElementById('grid-empty');
  const modal = document.getElementById('modal');
  const mPoster = document.getElementById('m-poster');
  const mTitle = document.getElementById('m-title');
  const mMeta = document.getElementById('m-meta');
  const mOverview = document.getElementById('m-overview');

  load().catch(console.error);

  async function load(){
    grid.innerHTML = '';
    empty.classList.add('hidden');
    try{
      const r = await fetch('/productos');
      if(!r.ok) throw new Error('Error de red');
      const items = await r.json();
      if(!items || !items.length){ empty.classList.remove('hidden'); return; }

      items.forEach(p=>{
        const card = document.createElement('div');
        card.className = 'movie-card';
        const poster = p.poster_url || p.poster || '';
        const title  = p.titulo || p.title || 'Sin título';
        const anio   = p.anio || p.year || '';
        const generos= p.generos || p.generos_join || '';
        const rate   = p.calificacion || p.rating || '';

        card.innerHTML = `
          <img src="${poster}" alt="Poster"
               onerror="this.src='https://via.placeholder.com/300x400?text=Poster'">
          <div class="info">
            <h4 title="${title}">${title}</h4>
            <p>${[anio, generos].filter(Boolean).join(' • ')}</p>
            ${rate ? `<span class="rate">★ ${rate}</span>` : ''}
          </div>`;
        card.addEventListener('click', ()=>openDetail(p.id));
        grid.appendChild(card);
      });
    }catch(e){
      empty.textContent = 'No se pudo cargar el catálogo.';
      empty.classList.remove('hidden');
    }
  }

  async function openDetail(id){
    try{
      const r = await fetch(`/productos/${id}`);
      if(!r.ok) throw new Error('No encontrado');
      const p = await r.json();
      const poster = p.poster_url || p.poster || '';
      const title  = p.titulo || p.title || 'Sin título';
      const anio   = p.anio || '';
      const gen    = p.generos || p.generos_join || '';
      const dur    = p.duracion || p.runtime || '';
      const lang   = p.idioma || p.lang || '';
      const desc   = p.descripcion || p.overview || p.sinopsis || '—';

      mPoster.src = poster || 'https://via.placeholder.com/300x400?text=Poster';
      mTitle.textContent = title;
      const meta = [];
      if(anio) meta.push(anio);
      if(gen) meta.push(gen);
      if(dur) meta.push(`${dur} min`);
      if(lang) meta.push(lang.toUpperCase());
      mMeta.textContent = meta.join(' • ');
      mOverview.textContent = desc;

      modal.showModal();
    }catch(e){ console.error(e); }
  }
}
