/**
 * WORKER SANTIAGO IMAGINARIO — formato módulo.
 *
 * Es el worker de francocitera.com adaptado a este sitio. Lo que cambió y por qué:
 *
 *   - El bucket de B2 es santiago-imaginario.
 *   - ROUTE_MAP y NO_INDEXAR quedan vacíos: hoy hay una sola página, el index.
 *     Se dejan puestos porque el día que haya una segunda (/archivo, /textos)
 *     alcanza con agregar la línea; el camino ya está escrito y probado.
 *   - La CSP deja entrar a fonts.googleapis.com (la hoja de estilos de Inter) y
 *     a fonts.gstatic.com (los archivos de la fuente). Sin esas dos líneas el
 *     navegador bloquea la tipografía y el sitio sale en la fuente del sistema.
 *   - El apex redirige a www, que es la dirección canónica del sitio.
 *   - No hay Google Analytics todavía. Está permitido Cloudflare Web Analytics,
 *     que es el que se activa con un botón desde el panel de Pages.
 *
 * CÓMO SE LLEGA A UNA CANCIÓN
 *
 * Igual que en francocitera.com: la dirección pública de un tema es su nombre en
 * la raíz del dominio, sin carpetas y sin la dirección larga de Backblaze.
 *
 *   https://www.santiagoimaginario.com/miles-de-cables.mp3
 *   https://www.santiagoimaginario.com/ocurre-aqui.mp3
 *
 * y adentro del HTML, más corto todavía:  href="/miles-de-cables.mp3"
 *
 * Eso lo resuelve el catch-all del final: si la ruta no es una página, ni un
 * estático del repo, ni robots/sitemap, se la pide a B2 tal cual, o sea
 * ${b2Base}/miles-de-cables.mp3. No hay lista de canciones en ningún lado: subir
 * el mp3 al bucket con ese nombre alcanza para que la dirección exista. Por eso
 * el nombre del archivo importa — es la URL, y además es el ancla que usa el
 * reproductor (/#miles-de-cables) para saber qué tema cargar.
 *
 * Los seis de ¡lluvia!:
 *   miles-de-cables.mp3   yee-haw.mp3      ocurre-aqui.mp3
 *   pesadilla-disney.mp3  buses.mp3        mundo-nuevo.mp3
 *
 * Lo demás es igual que en francocitera.com, y las razones también:
 *
 * Al pedirle un archivo a Pages hay TRES respuestas posibles y las tres importan:
 *   200 + content-type real  -> el archivo existe, se sirve
 *   304                      -> el navegador ya lo tiene y sigue vigente, se pasa tal cual
 *   200 + text/html          -> Pages no lo tiene y devolvió index.html (no manda 404 nunca)
 * Tratar el 304 como fallo hace que el CSS y el JS caigan al spinner en cada
 * revalidación, o sea cada vez que vence el max-age del navegador.
 *
 * Al pedirle un archivo a B2 se reenvían los headers condicionales y el Range del
 * cliente. Sin eso no hay seek: pedir un tramo de un audio devuelve el archivo entero.
 *
 * Caché de los estáticos: lo que viene con ?v= en la URL se sirve inmutable y por
 * un año. La versión la ponen index.html (main.css?v=1, script.js?v=1) y la
 * constante VERSION de sw.js. Si el archivo cambia, cambia el número, cambia la
 * URL, y el navegador la pide de nuevo. Lo que NO lleva ?v= sigue revalidando, y
 * eso es a propósito, porque sw.js se registra en una ruta fija y no puede llevar
 * versión.
 *
 * En la media de B2 el ?v= no sirve y no se usa: el parámetro no llega al bucket,
 * y como el edge cachea por la URL de B2, todas las versiones de un mismo archivo
 * comparten entrada. Para reemplazar algo del bucket, renombrarlo.
 */

// Se puede sobrescribir con la variable B2_BUCKET_URL en el panel o en wrangler.toml.
const B2_POR_DEFECTO = 'https://f004.backblazeb2.com/file/santiago-imaginario';

// El dominio canónico. El apex (sin www) redirige acá.
const HOST_CANONICO = 'www.santiagoimaginario.com';

// Rutas amigables. Vacío mientras el sitio sea una sola página. Para agregar una:
//   '/archivo': 'archivo.html',
const ROUTE_MAP = {};

// Refuerzo por header del meta noindex de las páginas que no van a Google.
// Vacío hoy: la única página del sitio sí se indexa.
const NO_INDEXAR = {};

// Extensiones que se buscan primero en el repo. Al sumar un tipo de archivo
// nuevo al repo hay que agregarlo acá o se va a seguir pidiendo a B2.
const RE_ESTATICOS = /\.(css|js|mjs|json|woff2|woff|ttf|otf)$/;

// Headers del cliente que sí o sí tienen que llegar a B2.
// Range/If-Range habilitan el seek en el audio; los otros dos, el 304.
const HEADERS_AL_ORIGEN = ['range', 'if-range', 'if-none-match', 'if-modified-since'];

// CSP, una sola para todo el sitio.
//
// El Worker proxea B2 con fetch y devuelve el cuerpo, nunca redirige, así que el
// navegador nunca le habla a backblazeb2.com y no hace falta permitirlo. Si algún
// día algo se sirve directo desde B2 sin pasar por acá, hay que agregarlo.
//
// media-src 'self' es redundante con default-src 'self', pero se deja explícito:
// el sitio sirve audio y conviene que la política lo diga.
const CSP =
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' data: https://fonts.gstatic.com; " +
    "img-src 'self' data:; " +
    "media-src 'self'; " +
    "connect-src 'self' https://cloudflareinsights.com; " +
    "frame-ancestors 'self';";

// Configuración de caché por tipo de archivo.
const CACHE_CONFIG = {
    html: { ttl: 60, browser: 'public, max-age=60' },
    css: { ttl: 86400, browser: 'public, max-age=3600' },
    js: { ttl: 86400, browser: 'public, max-age=3600' },
    json: { ttl: 86400, browser: 'public, max-age=3600' },
    fonts: { ttl: 2592000, browser: 'public, max-age=31536000, immutable' },
    images: { ttl: 604800, browser: 'public, max-age=604800' },
    media: { ttl: 604800, browser: 'public, max-age=604800' },
    // Para lo que llega con ?v=: la URL ya identifica la versión del archivo.
    versionado: { ttl: 2592000, browser: 'public, max-age=31536000, immutable' },
    default: { ttl: 86400, browser: 'public, max-age=86400' }
};

export default {
    async fetch(request, env) {
        return handleRequest(request, env);
    }
};

async function handleRequest(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const b2Base = (env && env.B2_BUCKET_URL) || B2_POR_DEFECTO;

    // El sitio es de solo lectura. Sin esto, un POST a /lluvia-1.mp3 devuelve
    // el mp3 entero: el worker convierte cualquier método en un GET a B2.
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response('Method Not Allowed', {
            status: 405,
            headers: { 'Allow': 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' }
        });
    }

    // Forzar HTTPS.
    if (url.protocol === 'http:') {
        url.protocol = 'https:';
        return Response.redirect(url.toString(), 301);
    }

    // santiagoimaginario.com y www.santiagoimaginario.com devolviendo las dos el
    // mismo HTML es contenido duplicado. La canónica es la de www, que es la que
    // declara el <link rel="canonical"> de index.html.
    if (url.hostname === HOST_CANONICO.replace(/^www\./, '')) {
        url.hostname = HOST_CANONICO;
        return Response.redirect(url.toString(), 301);
    }

    let rutaDecodificada = pathname;
    try { rutaDecodificada = decodeURIComponent(pathname); } catch (e) {}
    if (rutaDecodificada.split('/').some(seg => seg.startsWith('.') && seg !== '.well-known')) {
        return serveSpinner(request, 404);
    }

    // Pages publica el repo entero. Esta guarda deja el worker fuera del alcance
    // de cualquiera aunque worker/ esté commiteado.
    if (pathname === '/worker' || pathname.startsWith('/worker/')) {
        return serveSpinner(request, 404);
    }

    // Barra final: /algo/ no matchea en ROUTE_MAP, cae al catch-all y termina en
    // el spinner. Además rompe los href relativos de la página (css/main.css
    // resuelve a /algo/css/main.css). Se normaliza antes de mirar las rutas.
    if (pathname.length > 1 && pathname.endsWith('/')) {
        url.pathname = pathname.replace(/\/+$/, '');
        return Response.redirect(url.toString(), 301);
    }

    // /index.html y / devuelven los dos un 200 con el mismo HTML, o sea contenido
    // duplicado para los crawlers. La canónica es /.
    if (pathname === '/index.html') {
        url.pathname = '/';
        return Response.redirect(url.toString(), 301);
    }

    // Robots.txt
    if (pathname === '/robots.txt') {
        const local = await pedirAPages(request);
        if (local) {
            if (local.status === 304) return local;
            const headers = new Headers(local.headers);
            headers.set('Content-Type', 'text/plain; charset=utf-8');
            headers.set('Cache-Control', 'public, max-age=86400');
            headers.set('X-Content-Type-Options', 'nosniff');
            return new Response(local.body, { status: 200, headers });
        }
        return fetchFromB2(request, b2Base, pathname);
    }

    // Sitemap: vive en el repo. B2 queda de respaldo.
    if (pathname === '/sitemap.xml') {
        const local = await pedirAPages(request);
        if (local) {
            if (local.status === 304) return local;
            const headers = new Headers(local.headers);
            headers.set('Content-Type', 'application/xml; charset=utf-8');
            headers.set('Cache-Control', 'public, max-age=3600');
            headers.set('Access-Control-Allow-Origin', '*');
            headers.set('X-Content-Type-Options', 'nosniff');
            return new Response(local.body, { status: 200, headers });
        }
        return fetchFromB2(request, b2Base, pathname);
    }

    // Bluesky verifica el handle del dominio leyendo esta ruta, que tiene que
    // contestar el DID en texto plano. Como el archivo no tiene extensión,
    // getContentType no lo reconoce y el Content-Type se fuerza acá.
    if (pathname === '/.well-known/atproto-did') {
        const local = await pedirAPages(request);
        const res = local || await pedirAB2(request, b2Base, pathname, CACHE_CONFIG.json.ttl);
        if (res.status === 304) return res;
        if (!res.ok) return serveSpinner(request, 404);
        const headers = new Headers(res.headers);
        headers.set('Content-Type', 'text/plain; charset=utf-8');
        headers.set('Cache-Control', 'public, max-age=3600');
        headers.set('X-Content-Type-Options', 'nosniff');
        return new Response(request.method === 'HEAD' ? null : res.body, { status: 200, headers });
    }

    // Rutas amigables: las páginas las sirve Pages. B2 queda de respaldo y solo
    // corre si Pages devuelve un error propio.
    // OJO: para HTML no hay manera de distinguir la página real del index.html de
    // fallback de Pages, así que si el archivo desaparece de un deploy se sirve el
    // home bajo esa ruta.
    if (ROUTE_MAP[pathname]) {
        const nombreArchivo = ROUTE_MAP[pathname];
        const local = await pedirAPages(request, true);
        if (local) {
            if (local.status === 304) return local;
            return addHtmlHeaders(local, nombreArchivo, request);
        }
        return fetchArchivoEspecifico(request, b2Base, nombreArchivo);
    }

    // Home. /index.html ya redirigió más arriba, así que acá solo llega /.
    if (pathname === '/') {
        const local = await fetch(request);
        if (local.status === 304) return local;
        if (local.status !== 404) return addSecurityHeaders(local);
    }

    // Archivos estáticos locales (CSS, JS, manifest, fuentes).
    if (RE_ESTATICOS.test(pathname)) {
        const local = await pedirAPages(request);
        if (local) {
            if (local.status === 304) return local;
            return addCacheHeaders(local, pathname, url.search);
        }
    }

    // Todo lo demás → B2. Acá caen las canciones (/miles-de-cables.mp3), la tapa
    // (/lluvia.webp) y los íconos. La ruta se le pasa al bucket sin tocar, así
    // que /miles-de-cables.mp3 es el archivo miles-de-cables.mp3 en la raíz de
    // santiago-imaginario. Si el mp3 no está subido todavía, B2 contesta 404 y
    // sale el spinner; el 404 se cachea un segundo, así que apenas se sube el
    // archivo la dirección empieza a andar sola.
    return fetchFromB2(request, b2Base, pathname);
}

/**
 * Le pide un archivo a Pages y devuelve la respuesta solo si el archivo existe
 * de verdad: 200 con su content-type propio, o 304. Devuelve null cuando Pages
 * contestó con su index.html de fallback, que es su manera de decir "no lo tengo".
 * Para HTML esa distinción no se puede hacer, de ahí el parámetro esperaHtml.
 */
async function pedirAPages(request, esperaHtml = false) {
    const res = await fetch(request);
    if (res.status === 304) return res;
    if (res.status !== 200) return null;
    if (esperaHtml) return res;
    const contentType = res.headers.get('content-type') || '';
    return contentType.includes('text/html') ? null : res;
}

/**
 * Subpetición a B2 reenviando lo que el cliente necesita.
 * cacheTtlByStatus en lugar de cacheTtl: así los 404 se cachean 1 segundo en vez
 * de una semana. Ese es el motivo por el que pedir un archivo antes de subirlo
 * deja la ruta muerta durante días y hay que renombrarlo.
 */
function pedirAB2(request, b2Base, rutaEnBucket, ttl) {
    const headers = new Headers();
    for (const nombre of HEADERS_AL_ORIGEN) {
        const valor = request.headers.get(nombre);
        if (valor) headers.set(nombre, valor);
    }
    return fetch(`${b2Base}${rutaEnBucket}`, {
        method: request.method,
        headers,
        cf: {
            cacheEverything: true,
            cacheTtlByStatus: { '200-299': ttl, '404': 1, '500-599': 0 }
        }
    });
}

async function fetchArchivoEspecifico(request, b2Base, nombreArchivo) {
    try {
        const res = await pedirAB2(request, b2Base, `/${nombreArchivo}`, CACHE_CONFIG.html.ttl);
        if (res.status === 404) return serveSpinner(request, 404);
        if (res.status >= 500) return serveSpinner(request, 503);

        // El 304 va sin cuerpo y con su propio status. Pasarlo por addHtmlHeaders,
        // que fuerza 200, devuelve una página en blanco.
        if (res.status === 304) {
            const headers = new Headers(res.headers);
            headers.set('Cache-Control', CACHE_CONFIG.html.browser);
            return new Response(null, { status: 304, headers });
        }
        if (!res.ok) return serveSpinner(request, 404);
        return addHtmlHeaders(res, nombreArchivo, request);
    } catch (error) {
        console.error('B2 no responde:', nombreArchivo, error);
        return serveSpinner(request, 503);
    }
}

async function fetchFromB2(request, b2Base, pathname) {
    const cacheConfig = getCacheConfig(pathname);
    try {
        const res = await pedirAB2(request, b2Base, pathname, cacheConfig.ttl);

        // Un 404 de B2 es un 404. Un 5xx o un timeout es un problema pasajero:
        // devolver 404 ahí le dice a Google que el recurso no existe cada vez que
        // B2 tose.
        if (res.status === 404) return serveSpinner(request, 404);
        if (res.status >= 500) return serveSpinner(request, 503);
        if (!res.ok && res.status !== 304) return serveSpinner(request, 404);

        const headers = new Headers(res.headers);
        const contentType = getContentType(pathname);
        if (contentType) headers.set('Content-Type', contentType);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Cache-Control', cacheConfig.browser);
        headers.set('X-Content-Type-Options', 'nosniff');

        // El 206 pasa con su Content-Range intacto; el 304 va sin cuerpo.
        const body = res.status === 304 ? null : res.body;
        return new Response(body, { status: res.status, headers });
    } catch (error) {
        console.error('B2 no responde:', pathname, error);
        return serveSpinner(request, 503);
    }
}

/**
 * Headers de las páginas internas: los mismos vengan del repo o de B2.
 */
function addHtmlHeaders(response, nombreArchivo, request) {
    const headers = new Headers(response.headers);
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.set('Cache-Control', CACHE_CONFIG.html.browser);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Content-Security-Policy', CSP);
    const robots = NO_INDEXAR[nombreArchivo];
    if (robots) headers.set('X-Robots-Tag', robots);
    const body = (request && request.method === 'HEAD') ? null : response.body;
    return new Response(body, { status: 200, headers });
}

/**
 * Headers de la home. Lleva el mismo Cache-Control que las páginas internas: sin
 * esa línea sale con el max-age=0, must-revalidate que manda Pages y revalida en
 * cada visita.
 */
function addSecurityHeaders(response) {
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', CACHE_CONFIG.html.browser);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Content-Security-Policy', CSP);
    return new Response(response.body, { status: response.status, headers });
}

function addCacheHeaders(response, pathname, search = '') {
    const headers = new Headers(response.headers);
    const cacheConfig = getCacheConfig(pathname, search);
    headers.set('Cache-Control', cacheConfig.browser);
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(response.body, { status: response.status, headers });
}

function getCacheConfig(pathname, search = '') {
    // El ?v= manda sobre la extensión: esa URL identifica una versión concreta del
    // archivo, así que el navegador puede quedársela un año sin preguntar. Ojo,
    // esto es lo que deja a sw.js afuera: se registra en una ruta fija, no puede
    // llevar versión, y con caché de un año quedaría congelado.
    if (/[?&]v=/.test(search)) return CACHE_CONFIG.versionado;

    if (pathname.match(/\.(html|htm)$/)) return CACHE_CONFIG.html;
    if (pathname.match(/\.(css)$/)) return CACHE_CONFIG.css;
    if (pathname.match(/\.(m?js)$/)) return CACHE_CONFIG.js;
    if (pathname.match(/\.(json)$/)) return CACHE_CONFIG.json;
    if (pathname.match(/\.(woff2|woff|ttf|otf)$/)) return CACHE_CONFIG.fonts;
    if (pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|svg|ico)$/)) return CACHE_CONFIG.images;
    if (pathname.match(/\.(mp3|mp4|webm|ogg|m4a|wav|mov)$/)) return CACHE_CONFIG.media;
    return CACHE_CONFIG.default;
}

function getContentType(pathname) {
    const ext = pathname.split('.').pop().toLowerCase();
    const types = {
        'html': 'text/html; charset=utf-8',
        'css': 'text/css; charset=utf-8',
        'js': 'text/javascript; charset=utf-8',
        'mjs': 'text/javascript; charset=utf-8',
        'json': 'application/json; charset=utf-8',
        'xml': 'application/xml; charset=utf-8',
        'txt': 'text/plain; charset=utf-8',
        'woff2': 'font/woff2',
        'woff': 'font/woff',
        'ttf': 'font/ttf',
        'otf': 'font/otf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'avif': 'image/avif',
        'svg': 'image/svg+xml',
        'ico': 'image/x-icon',
        'mp3': 'audio/mpeg',
        'm4a': 'audio/mp4',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mov': 'video/quicktime'
    };
    return types[ext] || null;
}

/**
 * Fallback visual. 404 cuando el archivo no está, 503 cuando B2 no contesta.
 * No emite el redirect a / si ya estamos en /, para no armar un loop.
 */
function serveSpinner(request, status = 404) {
    const pathname = request ? new URL(request.url).pathname : '/';
    const redirige = pathname !== '/' && pathname !== '/index.html';
    const script = redirige
        ? `<script>setTimeout(() => { window.location.href = '/'; }, 3000);</script>`
        : '';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex">
  <title>Santiago Imaginario</title>
  <style>
    html, body { height: 100%; margin: 0; overflow: hidden; user-select: none; -webkit-user-select: none; }
    html { color-scheme: light dark; }
    body { display: flex; justify-content: center; align-items: center; background-color: #ffffff; color: #141414; font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif; }
    @media (prefers-color-scheme: dark) { body { background-color: #101010; color: #ededed; } }
    @keyframes girar { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .senal { font-size: 72px; animation: girar 2s linear infinite; cursor: default; line-height: 1; }
  </style>
  ${script}
</head>
<body>
  <div class="senal">?</div>
</body>
</html>`;

    const headers = {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff'
    };
    if (status === 503) headers['Retry-After'] = '30';

    const body = (request && request.method === 'HEAD') ? null : html;
    return new Response(body, { status, headers });
}
