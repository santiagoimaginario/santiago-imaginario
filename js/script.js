/* Santiago Imaginario — un solo archivo para todo el sitio.
   Al tocar este archivo hay que subir el ?v= en index.html y la VERSION de sw.js. */

const ICONOS = {
  play:      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>',
  pausa:     '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
  anterior:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6h2v12H7zM19 6v12l-9-6z"/></svg>',
  siguiente: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6h2v12h-2zM5 6l9 6-9 6z"/></svg>',
  aleatorio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>',
  repetir:   '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>'
};

function formatoTiempo(s) {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const seg = Math.floor(s % 60);
  return `${m}:${seg.toString().padStart(2, '0')}`;
}

/* El slug sale del nombre del archivo, no de un id escrito a mano: así el ancla
   de la URL (#lluvia-1) y el tema que el reproductor busca son la misma cosa y
   no se pueden desincronizar. El id del <li> lo pone este script. */
function slugDe(src) {
  return src.split('/').pop().replace(/\.[^.]+$/, '');
}

/* Las duraciones que quedaron sin escribir a mano (el guioncito) se completan
   pidiéndole al mp3 nada más que su metadata. Si escribís la duración en el
   HTML, esa manda y el archivo no se pide. */
function completarDuraciones(temas) {
  const faltantes = temas.filter(t => t.durEl && !/\d/.test(t.durEl.textContent));
  if (!faltantes.length) return;
  faltantes.forEach(t => {
    const sonda = new Audio();
    sonda.preload = 'metadata';
    sonda.addEventListener('loadedmetadata', () => {
      if (isFinite(sonda.duration) && sonda.duration > 0) {
        t.durEl.textContent = formatoTiempo(sonda.duration);
      }
      sonda.src = '';
    }, { once: true });
    sonda.addEventListener('error', () => { sonda.src = ''; }, { once: true });
    sonda.src = t.src;
  });
}

function configurarReproductor() {
  const filas = Array.from(document.querySelectorAll('.tema-fila'));
  if (!filas.length) return;

  // La página entera es una sola lista de reproducción, en el orden en que están
  // los temas en el HTML, sin importar de qué entrada sean.
  const temas = filas.map(a => {
    const li = a.closest('.tema');
    const entrada = a.closest('.entrada');
    const src = a.getAttribute('href');
    const slug = slugDe(src);
    if (li && !li.id) li.id = slug;
    return {
      a, li, src, slug,
      titulo: a.querySelector('.tema-nombre')?.textContent.trim() || '',
      album: entrada?.querySelector('.entrada-titulo')?.textContent.trim() || '',
      portada: entrada?.querySelector('.entrada-portada')?.getAttribute('src') || '',
      durEl: a.querySelector('.tema-dur')
    };
  });

  const audio = document.createElement('audio');
  audio.preload = 'metadata';
  audio.setAttribute('playsinline', '');
  audio.setAttribute('webkit-playsinline', '');
  document.body.appendChild(audio);

  const rep = document.createElement('div');
  rep.id = 'reproductor';
  rep.innerHTML = `
    <div class="rep-progreso-caja">
      <input type="range" class="rep-progreso" id="rep-progreso" min="0" max="100" value="0" step="0.1" aria-label="Progreso">
    </div>
    <button class="rep-play" id="rep-play" aria-label="Reproducir">${ICONOS.play}</button>
    <div class="rep-info" id="rep-info">
      <div class="rep-titulo-caja"><span class="rep-titulo" id="rep-titulo"></span></div>
      <span class="rep-sub" id="rep-sub"></span>
    </div>
    <div class="rep-controles">
      <button class="rep-btn rep-btn-aleatorio" id="rep-aleatorio" aria-label="Aleatorio">${ICONOS.aleatorio}</button>
      <button class="rep-btn" id="rep-anterior" aria-label="Anterior">${ICONOS.anterior}</button>
      <button class="rep-btn" id="rep-siguiente" aria-label="Siguiente">${ICONOS.siguiente}</button>
      <button class="rep-btn rep-btn-repetir" id="rep-repetir" aria-label="Repetir">${ICONOS.repetir}</button>
    </div>
  `;
  document.body.appendChild(rep);
  rep.classList.add('visible');
  document.body.classList.add('con-reproductor');

  const btnPlay = rep.querySelector('#rep-play');
  const btnAnterior = rep.querySelector('#rep-anterior');
  const btnSiguiente = rep.querySelector('#rep-siguiente');
  const btnAleatorio = rep.querySelector('#rep-aleatorio');
  const btnRepetir = rep.querySelector('#rep-repetir');
  const barra = rep.querySelector('#rep-progreso');
  const tituloEl = rep.querySelector('#rep-titulo');
  const subEl = rep.querySelector('#rep-sub');

  let actual = -1;
  let ultimaMetadata = -1;
  let aleatorio = false;
  let repetir = false;
  let yaSonaron = [];
  let historial = [];
  let posHistorial = -1;

  function indiceAleatorio() {
    if (temas.length <= 1) return 0;
    let libres = temas.map((_, i) => i).filter(i => !yaSonaron.includes(i));
    if (!libres.length) {
      yaSonaron = [actual];
      libres = temas.map((_, i) => i).filter(i => i !== actual);
    }
    const i = libres[Math.floor(Math.random() * libres.length)];
    yaSonaron.push(i);
    return i;
  }

  function actualizarPosicion() {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
    if (!isFinite(audio.duration) || audio.duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate || 1,
        position: Math.min(Math.max(audio.currentTime, 0), audio.duration)
      });
    } catch (e) {}
  }

  function pintarTiempos() {
    const total = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    subEl.textContent = `${formatoTiempo(audio.currentTime)} / ${formatoTiempo(total)}`;
  }

  function pintarProgreso() {
    if (!isFinite(audio.duration) || audio.duration <= 0) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    barra.value = pct;
    barra.style.setProperty('--pct', pct + '%');
    pintarTiempos();
  }

  // Si el título no entra, se desliza. La distancia y la duración se calculan
  // acá porque dependen de cuánto sobra, que cambia con el ancho de la pantalla.
  function actualizarDesliz() {
    tituloEl.classList.remove('corriendo');
    tituloEl.style.removeProperty('--rep-dist');
    tituloEl.style.removeProperty('--rep-dur');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const caja = rep.querySelector('.rep-titulo-caja');
      const sobra = tituloEl.scrollWidth - caja.clientWidth;
      if (sobra > 2) {
        tituloEl.style.setProperty('--rep-dist', `-${sobra}px`);
        tituloEl.style.setProperty('--rep-dur', `${Math.max(2.5, sobra / 60)}s`);
        tituloEl.classList.add('corriendo');
      }
    }));
  }

  function actualizarBotones() {
    btnAnterior.disabled = aleatorio ? posHistorial <= 0 : actual <= 0;
    btnSiguiente.disabled = aleatorio || repetir ? false : actual >= temas.length - 1;
  }

  function actualizarPlay() {
    btnPlay.innerHTML = audio.paused ? ICONOS.play : ICONOS.pausa;
    btnPlay.setAttribute('aria-label', audio.paused ? 'Reproducir' : 'Pausar');
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
    }
  }

  function pintarInfo(i) {
    const t = temas[i];
    tituloEl.textContent = t.titulo;
    pintarTiempos();
    actualizarDesliz();
    temas.forEach(x => x.li && x.li.classList.remove('sonando'));
    if (t.li) t.li.classList.add('sonando');

    if ('mediaSession' in navigator && ultimaMetadata !== i) {
      const datos = { title: t.titulo, artist: 'Santiago Imaginario', album: t.album };
      if (t.portada) {
        datos.artwork = [{ src: new URL(t.portada, location.origin).href, type: 'image/webp' }];
      }
      try { navigator.mediaSession.metadata = new MediaMetadata(datos); } catch (e) {}
      ultimaMetadata = i;
      registrarHandlers();
    }
  }

  function cargar(i, arrancar) {
    if (i < 0 || i >= temas.length) return;
    actual = i;
    if (aleatorio && !yaSonaron.includes(i)) yaSonaron.push(i);
    audio.src = temas[i].src;
    audio.load();
    pintarInfo(i);
    barra.value = 0;
    barra.style.setProperty('--pct', '0%');
    actualizarBotones();
    actualizarPlay();
    if (arrancar !== false) {
      history.replaceState(null, '', '#' + temas[i].slug);
      audio.play().catch(() => {});
    }
  }

  function irSiguiente() {
    if (repetir && actual >= 0) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }
    if (!aleatorio && actual >= temas.length - 1) return;
    let proximo;
    if (aleatorio) {
      if (posHistorial < historial.length - 1) {
        posHistorial++;
        proximo = historial[posHistorial];
      } else {
        proximo = indiceAleatorio();
        historial.push(proximo);
        posHistorial = historial.length - 1;
      }
    } else {
      proximo = actual + 1;
    }
    cargar(proximo, true);
  }

  function irAnterior() {
    if (actual < 0) return;
    if (aleatorio) {
      if (posHistorial <= 0) return;
      posHistorial--;
      cargar(historial[posHistorial], true);
      return;
    }
    if (actual <= 0) return;
    cargar(actual - 1, true);
  }

  // El botón de atrás vuelve al principio del tema si ya avanzó; recién si está
  // arrancando salta al anterior. Es lo que hace cualquier reproductor.
  function retroceder() {
    if (actual < 0) return;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      pintarProgreso();
      actualizarPosicion();
      return;
    }
    irAnterior();
  }

  audio.addEventListener('play', actualizarPlay);
  audio.addEventListener('pause', actualizarPlay);
  audio.addEventListener('playing', actualizarPlay);
  audio.addEventListener('loadedmetadata', () => {
    pintarTiempos();
    actualizarPosicion();
  });
  audio.addEventListener('timeupdate', () => {
    pintarProgreso();
    actualizarPosicion();
  });
  audio.addEventListener('seeked', () => {
    pintarProgreso();
    actualizarPosicion();
  });
  audio.addEventListener('ended', () => {
    if (repetir) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }
    if (aleatorio) {
      const proximo = indiceAleatorio();
      historial.push(proximo);
      posHistorial = historial.length - 1;
      cargar(proximo, true);
    } else if (actual < temas.length - 1) {
      cargar(actual + 1, true);
    }
  });

  // Sin JavaScript el enlace baja el mp3 y listo. Con JavaScript, lo reproduce.
  temas.forEach((t, i) => {
    t.a.addEventListener('click', e => {
      e.preventDefault();
      if (actual === i) {
        if (audio.paused) audio.play().catch(() => {});
        else audio.pause();
      } else {
        cargar(i, true);
      }
    });
  });

  btnPlay.addEventListener('click', () => {
    if (actual < 0) { cargar(0, true); return; }
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  });
  btnAnterior.addEventListener('click', retroceder);
  btnSiguiente.addEventListener('click', irSiguiente);

  btnAleatorio.addEventListener('click', () => {
    aleatorio = !aleatorio;
    if (aleatorio && actual >= 0) {
      yaSonaron = [actual];
      historial = [actual];
      posHistorial = 0;
    } else {
      yaSonaron = [];
      historial = [];
      posHistorial = -1;
    }
    btnAleatorio.classList.toggle('activo', aleatorio);
    btnAleatorio.setAttribute('aria-pressed', String(aleatorio));
    actualizarBotones();
  });

  btnRepetir.addEventListener('click', () => {
    repetir = !repetir;
    btnRepetir.classList.toggle('activo', repetir);
    btnRepetir.setAttribute('aria-pressed', String(repetir));
    actualizarBotones();
  });

  rep.querySelector('#rep-info').addEventListener('click', () => {
    if (actual >= 0 && temas[actual].li) {
      temas[actual].li.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  barra.addEventListener('input', e => {
    if (actual < 0 || !isFinite(audio.duration)) return;
    audio.currentTime = (e.target.value / 100) * audio.duration;
    e.target.style.setProperty('--pct', e.target.value + '%');
  });

  function registrarHandlers() {
    if (!('mediaSession' in navigator)) return;
    const poner = (accion, fn) => {
      try { navigator.mediaSession.setActionHandler(accion, fn); } catch (e) {}
    };
    poner('seekbackward', null);
    poner('seekforward', null);
    poner('seekto', d => {
      if (actual < 0 || !isFinite(audio.duration) || audio.duration <= 0) return;
      if (!d || typeof d.seekTime !== 'number') return;
      const t = Math.min(Math.max(d.seekTime, 0), audio.duration);
      if (d.fastSeek && typeof audio.fastSeek === 'function') audio.fastSeek(t);
      else audio.currentTime = t;
      pintarProgreso();
      actualizarPosicion();
    });
    poner('play', () => { audio.play().catch(() => {}); });
    poner('pause', () => audio.pause());
    poner('previoustrack', retroceder);
    poner('nexttrack', irSiguiente);
  }
  registrarHandlers();

  window.addEventListener('resize', actualizarDesliz);

  function indiceDelHash() {
    let slug = location.hash.slice(1);
    if (!slug) return -1;
    try { slug = decodeURIComponent(slug); } catch (e) {}
    return temas.findIndex(t => t.slug === slug);
  }

  // Con #tema en la URL arranca sonando ese; sin hash, deja el primero cargado
  // y en pausa, para que la barra ya muestre algo.
  const desdeHash = indiceDelHash();
  cargar(desdeHash >= 0 ? desdeHash : 0, desdeHash >= 0);
  if (desdeHash >= 0 && temas[desdeHash].li) {
    temas[desdeHash].li.scrollIntoView({ block: 'center' });
  }
  window.addEventListener('hashchange', () => {
    const i = indiceDelHash();
    if (i >= 0 && i !== actual) cargar(i, true);
  });

  if (window.requestIdleCallback) requestIdleCallback(() => completarDuraciones(temas), { timeout: 3000 });
  else setTimeout(() => completarDuraciones(temas), 1200);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', configurarReproductor);
} else {
  configurarReproductor();
}
