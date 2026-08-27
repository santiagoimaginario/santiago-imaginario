# santiagoimaginario.com

Una sola página. El texto, la música y los enlaces viven en `index.html`; los
archivos pesados (mp3, imágenes) viven en Backblaze B2; Cloudflare pone las dos
cosas juntas y las sirve.

Es el mismo armado de francocitera.com, más chico porque acá hay una sola página.

## Los archivos

| Archivo | Qué es |
|---|---|
| `index.html` | **Lo único que se edita para publicar.** Cabecera, entradas del blog, contacto. |
| `css/main.css` | Cómo se ve. Modo día y noche, el reproductor. |
| `js/script.js` | El reproductor: reproducir, pasar de tema, la barra de progreso. |
| `sw.js` | Hace que el sitio abra aunque no haya internet. |
| `manifest.json` | Para poder "instalar" el sitio como app en el teléfono. |
| `robots.txt` | Buscadores sí, bots de IA no. |
| `sitemap.xml` | La lista de páginas para Google. |
| `worker/index.js` | El que decide, para cada pedido, si el archivo sale del repositorio o de B2. |
| `contenido/obras.json` | Catálogo de lo publicado. Hoy no genera nada: es el índice para más adelante. |

---

# Las cuentas que hay que crear

En este orden. Ninguna de estas las puedo crear yo: hay que poner contraseñas y
datos personales, y eso lo hace Santiago. Yo te acompaño en cada paso y después
me encargo de todo lo demás.

## 1. Un correo

El que ya use está bien. Es el que va a quedar atado a todas las cuentas de
abajo, así que conviene que sea uno al que entre siempre y no uno viejo.

## 2. GitHub — github.com

**Gratis.** Es donde vive el texto del sitio y donde queda guardada la historia
de todos los cambios.

- Crear cuenta con ese correo.
- Elegir un nombre de usuario (por ejemplo `santiagoimaginario`).
- Activar la verificación en dos pasos cuando la ofrezca.

Después de esto avisame y creo el repositorio con todo lo que ya está hecho.

## 3. Cloudflare — cloudflare.com

**Gratis** para lo que necesitamos. Hace tres cosas: publica el sitio (Pages),
maneja el dominio (DNS) y corre el Worker.

- Crear cuenta con el mismo correo.
- Elegir el plan Free.

## 4. El dominio santiagoimaginario.com

Conviene comprarlo **desde Cloudflare** (Domain Registration → Register Domain),
porque ahí queda el dominio y el sitio en el mismo lugar y no hay que configurar
DNS a mano en ningún lado. Es un `.com`, cuesta más o menos diez dólares por año
y se paga con tarjeta.

Esa compra la tiene que hacer Santiago (o vos): yo no puedo poner datos de
tarjeta en ningún formulario.

Si preferís comprarlo en otro lado, también funciona, pero después hay que
apuntar los nameservers a Cloudflare y es un paso más.

## 5. Backblaze B2 — backblaze.com/cloud-storage

**Gratis hasta 10 GB**, que para un EP y unas fotos sobra. Es donde van los mp3
y las imágenes, porque en el repositorio de GitHub no conviene meter archivos
pesados.

- Crear cuenta con el mismo correo.
- Crear un bucket llamado `santiago-imaginario`.
- Ponerlo **público** (Public). Si queda privado, el sitio no puede leer los mp3.
- Anotar la dirección que te muestra el bucket. Va a ser algo como
  `https://f004.backblazeb2.com/file/santiago-imaginario` — **ojo con el número**:
  el de Franco es `f004` pero el nuevo puede ser otro, y si no coincide no anda nada.

Cuando tengas ese dato me lo pasás y lo pongo en el Worker.

---

# Después de las cuentas (esto lo hago yo)

1. Creo el repositorio en GitHub y subo todo lo que ya está armado.
2. Conecto Cloudflare Pages a ese repositorio.
3. Engancho el dominio y el Worker.
4. Cargo la dirección real del bucket de B2.
5. Subo los mp3 de *¡lluvia!* y la tapa.

Para lo de Cloudflare voy a necesitar que me des acceso desde una terminal
interactiva: en esta sesión las conexiones a Cloudflare están sin autorizar y no
puedo hacer el login yo solo. Cuando llegue el momento te digo exactamente qué
correr.

---

# Cómo edita Santiago, desde el navegador y sin instalar nada

Sin programas, sin archivos en la computadora. Dos formas:

**La rápida.** Entrar al repositorio en github.com, abrir `index.html`, tocar el
lápiz, escribir, y abajo "Commit changes". A los dos minutos el sitio ya cambió.

**La cómoda.** Entrar al repositorio y apretar la tecla `.` (el punto). Se abre
un editor completo dentro del navegador, igual al de escritorio. Se escribe, y
en el panel de la izquierda se manda el cambio.

**La más fácil de todas.** Escribirme a mí lo que quiere cambiar y lo hago yo.

## Volver atrás

Todo cambio queda guardado y se puede deshacer, en dos lugares:

- **GitHub** guarda cada versión del texto. Se ve en "History" arriba del archivo,
  y desde ahí se vuelve a cualquier versión anterior.
- **Cloudflare Pages** guarda cada publicación. En Workers & Pages → el proyecto →
  Deployments está la lista, y cada una tiene "Rollback to this deployment". Eso
  devuelve el sitio a como estaba, al instante.

O sea que no hay manera de romper nada de forma definitiva.

---

# Los archivos que van a B2

Se suben arrastrándolos a la web de Backblaze, a la raíz del bucket. En el HTML
se escriben con barra adelante y nada más: `href="/lluvia-1.mp3"`.

Falta subir:

- [ ] Los seis mp3 de *¡lluvia!*, con estos nombres exactos:
      `miles-de-cables.mp3`, `yee-haw.mp3`, `ocurre-aqui.mp3`,
      `pesadilla-disney.mp3`, `buses.mp3`, `mundo-nuevo.mp3`
- [ ] La tapa del EP: `lluvia.webp`
- [ ] `favicon.ico` — el iconito de la pestaña
- [ ] `apple-touch-icon.png` — 180×180
- [ ] `icon-192.png` y `icon-512.png` — para instalarlo como app
- [ ] `santiago-imaginario-preview.webp` — 1200×630, la imagen que se ve al
      compartir el link en WhatsApp o Instagram

Hasta que estén, el sitio anda igual: solo faltan esas imágenes.

**Para reemplazar algo que ya está en B2, hay que cambiarle el nombre.** Si subís
un `lluvia-1.mp3` nuevo con el mismo nombre, durante una semana se va a seguir
escuchando el viejo, porque queda guardado en el camino.

---

# La regla del `?v=`

En `index.html` el CSS y el JS se piden así:

    css/main.css?v=1
    js/script.js?v=1

Ese número existe para que, cuando cambie el diseño, a la gente que ya visitó el
sitio le llegue lo nuevo en vez de quedarse con lo viejo guardado.

**Si se toca `css/main.css` o `js/script.js`, hay que subir el número en tres
lugares y que queden iguales:** las dos líneas de `index.html` y la constante
`VERSION` de `sw.js`.

Si se toca solo el texto de `index.html`, no hay que tocar nada de esto.
