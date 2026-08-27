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

# Publicar la primera versión

El código ya está commiteado en `main`. Falta engancharlo a las cuentas. El orden
importa: cada paso necesita el anterior.

## A · El repositorio (lo hace Santiago, en el navegador)

1. Entrar a **github.com/new**.
2. Nombre: `santiago-imaginario`. Puede ser público o privado.
3. **No** tildar README, .gitignore ni licencia: el repositorio tiene que quedar
   vacío, porque el contenido ya está armado acá y se sube entero.
4. Create repository.
5. Adentro del repositorio nuevo: **Settings → Collaborators → Add people** y
   agregar a `FrancoCitera`.

Franco acepta la invitación que le llega por correo, y desde acá se sube todo:

    git remote add origin https://github.com/USUARIO/santiago-imaginario.git
    git push -u origin main

## B · Cloudflare Pages (lo hace Santiago, en el panel)

**Esto hay que hacerlo bien de una.** La conexión con GitHub solo se puede
configurar en el momento de crear el proyecto: si queda mal, no se corrige
después, hay que borrar el proyecto y empezarlo de nuevo.

**Y ojo con la pestaña.** Cloudflare empuja Workers, así que el camino por
defecto lleva ahí. Si en algún momento la pantalla dice *Create a Worker*, o
aparece un campo **Deploy command** con `npx wrangler deploy`, estás en el flujo
equivocado: volvé atrás. En el de Pages ese campo no existe.

1. Ir a **Workers & Pages**: https://dash.cloudflare.com/?to=/:account/workers-and-pages
2. **Create application.**
3. Ir a la pestaña **Pages**. La que abre por defecto es la de Workers.
4. **Import an existing Git repository** (en algunos paneles dice *Connect to Git*).
5. Autorizar GitHub y elegir `santiagoimaginario/santiago-imaginario`. **Begin setup.**
6. En **Set up builds and deployments**:

   | Campo | Valor |
   |---|---|
   | Project name | `santiago-imaginario` |
   | Production branch | `main` |
   | Framework preset | **None** |
   | Build command | **vacío** |
   | Build output directory | `/` |

   El sitio no se compila: los archivos se publican tal como están.
7. **Save and Deploy.**

Si el nombre `santiago-imaginario` aparece ocupado, es porque quedó un Worker a
medio crear con ese nombre. Hay que borrarlo desde Workers & Pages y volver.

Al terminar, Pages da una dirección tipo `santiago-imaginario.pages.dev`. Ahí ya
se puede ver el sitio andando, antes de tocar el dominio.

## C · El dominio

En el proyecto de Pages, **Custom domains**, agregar las dos:

- `www.santiagoimaginario.com`
- `santiagoimaginario.com`

Las dos hacen falta: el Worker manda la segunda a la primera, pero para eso
tiene que existir.

## D · El Worker

Este sí sale del flujo de Workers, el mismo que aparece por defecto en el paso B.
Acá es el correcto, y se hace todo desde el navegador, sin bajar nada.

1. **Workers & Pages → Create application → Import a repository.**
2. Elegir `santiagoimaginario/santiago-imaginario`.
3. **Project name: `santiago-imaginario-worker`.** Tiene que decir exactamente eso:
   es el nombre que está en `worker/wrangler.toml` y si no coinciden, el build falla.
   Tampoco puede llamarse `santiago-imaginario` a secas, porque ese nombre ya se lo
   quedó el proyecto de Pages.
4. **Advanced settings → Root directory: `worker`.** Sin esto, `wrangler` busca la
   configuración en la raíz del repositorio, donde no está, y falla.
5. Build command: **vacío**. Deploy command: `npx wrangler deploy`.
6. **Deploy.**

Las rutas **no** hay que agregarlas a mano: están declaradas en
`worker/wrangler.toml` y se crean solas en cada deploy. Son `routes` y no
`custom_domain` a propósito — con `custom_domain` el Worker pasa a ser el origen
y Cloudflare le reapunta el DNS, y entonces el `fetch(request)` de adentro se
llamaría a sí mismo en vez de llegar a Pages.

Es el mismo enganche que tiene francocitera.com: el Worker adelante y Pages como
origen. Como queda conectado al repositorio, cada push que toque `worker/` lo
vuelve a desplegar solo.

### Las tres trampas de este paso

Las tres nos pasaron el 27 de agosto de 2026 y ninguna avisa con un error claro.

**1. Root directory.** Si queda en `/`, wrangler no encuentra el `wrangler.toml`
—que está en `worker/`— y Cloudflare, en vez de fallar, entra en su modo de
configuración automática y **despliega un Worker de ejemplo que dice "Hello
world"**. El build sale en verde, no hay ningún error en ningún log, y el Worker
existe pero no hace nada de lo nuestro. Tiene que decir `/worker`.

**2. El token del build.** En **Settings → Builds**, abajo de todo, está el API
token con el que el build se autentica para subir el Worker. Si dice *"Configured
API token unavailable"*, ningún build posterior puede desplegar: queda para
siempre lo que se subió la primera vez. Se arregla creando uno nuevo desde ese
mismo desplegable.

**3. Add Domain vs Add Route.** El botón grande y azul es *Add Domain* y es el
equivocado. Da el error *"already has externally managed DNS records"* y sugiere
borrar esos registros — **no hay que borrarlos**, son los que Pages creó en el
paso C y son los que hacen que el sitio exista.

## E · La dirección de B2

En el Worker, **Settings → Variables**, poner `B2_BUCKET_URL` con la dirección
real del bucket. **Ojo con el número**: el de Franco es `f004` y el de Santiago
puede ser otro. Si no coincide, no carga ningún mp3.

## F · El correo

En el pie del sitio va **`santiagoimaginario@gmail.com`**, directo. Sin
intermediarios, sin configuración y sin nada que se pueda romper.

Se probó el camino largo y no valió la pena. Queda anotado por si algún día se
retoma:

**Recibir en una dirección del dominio ya funciona.** Email Routing está activo y
`hola@santiagoimaginario.com` reenvía a `santiagopintosmartins@gmail.com`. Se deja
prendido: no molesta, no cuesta nada, y si alguna vez se quiere usar esa dirección
ya está lista.

**Enviar desde una dirección del dominio es lo que no salió gratis.** Para que una
respuesta salga *desde* `hola@santiagoimaginario.com` hace falta un SMTP, porque
Email Routing solo recibe. Las tres opciones que hay:

- **Cloudflare Email Sending** — el más prolijo, todo en el mismo lugar
  (`smtp.mx.cloudflare.net:465`, usuario literal `api_token`, contraseña un token
  con permiso *Email Sending: Edit*). Pide el plan **Workers Paid**, unos 5 USD al
  mes, y está en Beta.
- **Un SMTP de otro proveedor** con capa gratis, tipo Brevo: 300 correos por día,
  para siempre y sin tarjeta, pero **aprueban las cuentas a mano** antes de
  habilitar el envío. Se engancha al *Enviar como* de Gmail.
- **Nada.** Que sea un Gmail y listo, que es lo que se eligió.

Si algún día se hace la segunda, la trampa está en el SPF: hoy el dominio tiene
**un solo** registro y dice
`v=spf1 include:_spf.mx.cloudflare.net ~all`. Hay que **editarlo** para que quede
`v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com ~all`. Si en vez de
editarlo se agrega un TXT nuevo, el dominio queda con dos SPF y eso invalida los
dos: los correos salen, pero caen en spam.

## G · Subir los archivos

Los de la lista de abajo, arrastrándolos a la web de Backblaze.

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

# Cómo llega un cambio al visitante

**Si tocás solo el texto de `index.html`, no hay que hacer nada.** Se publica solo
y se ve en la recarga siguiente. Sin modo incógnito, sin borrar caché.

Eso funciona porque hay dos piezas puestas a propósito, y conviene no deshacerlas:

- El HTML sale con `no-cache`, o sea que el navegador lo pide de nuevo en cada
  visita. Se probó y Pages no manda `ETag` ni `Last-Modified`, así que no hay
  manera de contestar "no cambió": la página baja entera. Son **2,8 KB
  comprimidos**, y es el precio de que una edición se vea al recargar.
- El service worker pide las páginas **a la red primero**. Antes hacía lo
  contrario —servía la copia guardada y actualizaba por atrás— y eso hacía que un
  cambio se viera recién en la visita siguiente. La copia guardada quedó solo para
  cuando no hay internet.

## La regla del `?v=`, que sigue viva para el diseño

En `index.html` el CSS y el JS se piden así:

    css/main.css?v=2
    js/script.js?v=2

Esos dos sí se guardan por un año, porque el número en la URL identifica la
versión. **Si se toca `css/main.css` o `js/script.js`, hay que subir el número en
tres lugares y que queden iguales:** las dos líneas de `index.html` y la constante
`VERSION` de `sw.js`. Si no, el cambio de diseño no le llega a quien ya visitó.

Para el texto de las entradas esto no aplica. Es solo para el diseño y el
reproductor, que los toca Franco y no Santiago.
