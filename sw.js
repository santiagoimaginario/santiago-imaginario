/* Sirve el sitio aunque no haya internet. La VERSION tiene que ir junto con el
   ?v= de index.html: si cambia el CSS o el JS y este número no se mueve, el
   navegador de quien ya visitó el sitio sigue mostrando lo viejo. */
const VERSION = '2';
const CACHE = `santiago-imaginario-v${VERSION}`;

const PRECACHE = [
  '/',
  `/css/main.css?v=${VERSION}`,
  `/js/script.js?v=${VERSION}`,
  '/manifest.json'
];

const ESTATICO = /\.(css|js|mjs|woff2?|ttf|otf|webp|png|jpe?g|svg|ico|json)$/;
const MEDIOS = /\.(mp3|m4a|wav|ogg|mp4|webm)$/;

// Que el content-type coincida con la extensión. Sin esto, el HTML del error
// 404 se guardaba bajo el nombre del CSS y la página quedaba sin estilos.
const TIPOS = [
  [/\.css$/, /^text\/css/],
  [/\.m?js$/, /javascript/],
  [/\.json$/, /json/],
  [/\.woff2?$/, /^font\//],
  [/\.(webp|png|svg|ico|jpe?g|gif|avif)$/, /^image\//]
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => Promise.all(PRECACHE.map(url => precachear(cache, url))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(nombres => Promise.all(nombres.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.registration.navigationPreload && self.registration.navigationPreload.enable())
      .then(() => self.clients.claim())
  );
});

function coherente(request, res) {
  const tipo = res.headers.get('content-type') || '';
  const ruta = new URL(request.url).pathname;
  const regla = TIPOS.find(([ext]) => ext.test(ruta));
  return regla ? regla[1].test(tipo) : /^text\/html/.test(tipo);
}

function guardable(request, res) {
  return res && res.ok && res.type === 'basic' && coherente(request, res);
}

function precachear(cache, url) {
  const pedido = new Request(url, { cache: 'reload' });
  return fetch(pedido)
    .then(res => {
      if (!guardable(pedido, res)) throw new Error(`${res.status}`);
      return cache.put(url, res);
    })
    .catch(() => {});
}

function cachePrimero(event) {
  return caches.open(CACHE).then(cache =>
    cache.match(event.request).then(guardado => {
      const red = fetch(event.request)
        .then(res => {
          if (guardable(event.request, res)) cache.put(event.request, res.clone());
          return res;
        })
        .catch(() => guardado);
      if (guardado) event.waitUntil(red);
      return guardado || red;
    })
  );
}

function redPrimero(event) {
  return fetch(event.request)
    .then(res => {
      if (guardable(event.request, res)) {
        const copia = res.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copia)));
      }
      return res;
    })
    .catch(() => caches.match(event.request));
}

/* Las páginas van a la red primero, siempre.

   Antes iban al revés: se servía la copia guardada al instante y se actualizaba
   por atrás. Rapidísimo, pero el cambio recién se veía en la visita SIGUIENTE.
   Para un sitio que se edita desde el navegador eso es inaceptable: Santiago
   escribe, publica, recarga, y sigue viendo lo de antes.

   La copia guardada queda solo para cuando no hay internet, que es para lo que
   sirve de verdad. El HTML son 11 KB, así que la espera no se nota. */
function navegacion(event) {
  return Promise.resolve(event.preloadResponse)
    .then(precargada => precargada || fetch(event.request))
    .then(res => {
      if (guardable(event.request, res)) {
        const copia = res.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copia)));
      }
      return res;
    })
    .catch(() => caches.match(event.request).then(g => g || caches.match('/')));
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Las fuentes de Google son de otro dominio: las maneja el navegador solo.
  if (url.origin !== self.location.origin) return;

  // El audio se pide por tramos (Range) y guardarlo entero rompe el seek.
  if (MEDIOS.test(url.pathname)) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(navegacion(event));
    return;
  }
  event.respondWith(ESTATICO.test(url.pathname) ? cachePrimero(event) : redPrimero(event));
});
