# Momentos

Web personal para crear videos de fechas especiales con las fotos de tus personas favoritas, tomadas de **Google Drive** o subidas desde tu computador.

- **Ocasiones**: cumpleaños, aniversario mensual y anual, Día de la Madre/Padre, San Valentín, Amor y Amistad, Navidad, Año Nuevo, graduación y fechas personalizadas (una vez, cada mes o cada año).
- **Estilos**: Clásica, Romántica (corazones), Fiesta (confeti) y **Copiar un reel**: subes un video o pegas el link de un reel y la app detecta sus cortes, su ritmo (BPM), flashes y fundidos para recrearlo con tus fotos.
- **Vista previa en vivo** en el navegador y exportación a **MP4** (vertical, cuadrado u horizontal), con opción de guardarlo en tu Drive.

Todo corre en tu computador y es gratis para uso personal.

---

## Requisitos

| Programa | Para qué | Instalación |
|---|---|---|
| Node.js 20+ | Ejecutar la app | https://nodejs.org |
| ffmpeg | Analizar videos de referencia | Windows: `winget install ffmpeg` · Mac: `brew install ffmpeg` · Linux: `sudo apt install ffmpeg` |
| yt-dlp (opcional) | Descargar reels desde un link | `pip install yt-dlp` o `brew install yt-dlp` |

Remotion descarga su propio Chrome la primera vez que generas un MP4.

## Instalación

```bash
npm install
```

```bash
cp .env.example .env.local
```

Edita `.env.local` (mínimo `NEXTAUTH_SECRET`; genera uno con `openssl rand -base64 32`) y arranca:

```bash
npm run dev
```

Abre http://localhost:3000.

Sin configurar Google ya puedes usar la app subiendo fotos desde tu computador.

## Conectar Google Drive (gratis)

1. Entra a https://console.cloud.google.com y crea un proyecto (por ejemplo "Momentos").
2. **APIs y servicios → Biblioteca**: habilita **Google Drive API** y **Google Picker API**.
3. **Pantalla de consentimiento OAuth** (Google Auth Platform):
   - Tipo de usuario: **Externo**.
   - Deja la app en modo **Prueba (Testing)** y agrega tu correo en **Usuarios de prueba**. Para uso personal no necesitas publicarla ni verificarla.
4. **Credenciales → Crear credenciales → ID de cliente OAuth**:
   - Tipo: **Aplicación web**.
   - Orígenes autorizados de JavaScript: `http://localhost:3000`
   - URI de redirección autorizados: `http://localhost:3000/api/auth/callback/google`
   - Copia el ID y el secreto en `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
5. **Credenciales → Crear credenciales → Clave de API**:
   - Restríngela a **Google Picker API** y a sitios web `http://localhost:3000/*`.
   - Cópiala en `NEXT_PUBLIC_GOOGLE_API_KEY`.
6. En **Configuración del proyecto** copia el **Número de proyecto** en `NEXT_PUBLIC_GOOGLE_APP_ID`.
7. Reinicia `npm run dev` y pulsa **Conectar Google Drive**.

### Permisos

| Modo | Variable | Qué ve la app |
|---|---|---|
| Recomendado | `GOOGLE_DRIVE_FULL_READ=false` | Solo las fotos que eliges en el selector de Google y los videos que la app crea |
| Carpetas completas | `GOOGLE_DRIVE_FULL_READ=true` | Lectura de todo tu Drive; permite "Usar una carpeta" y "Buscar fotos nuevas en la carpeta" |

Si cambias este valor, sal y vuelve a conectar Google para que pida el nuevo permiso.

## Cómo se usa

1. **Personas**: agrega a tu mamá, pareja, etc., con su cumpleaños. Para la pareja, pon la fecha de inicio y la app calcula los aniversarios mensuales y anuales.
2. Abre la persona y agrega fotos (desde Drive o desde el computador).
3. **Inicio** muestra las próximas fechas; pulsa **Crear video**.
4. En **Crear video** eliges ocasión, estilo, fotos y su orden, textos, colores y música. La vista previa se actualiza al instante.
5. **Generar MP4**: tarda entre 30 segundos y unos minutos. Luego puedes descargarlo o guardarlo en Drive.

### Copiar un reel

1. Ve a **Plantillas de reels** y sube el video o pega el link (requiere yt-dlp).
2. La app detecta las escenas y crea una plantilla editable: transición, movimiento y texto por escena.
3. Pulsa **Usar con mis fotos**. Cada escena toma una foto en orden (si hay menos fotos que escenas, se repiten) y por defecto suena el audio del reel.
4. Opcional: **Afinar con IA** envía hasta 12 fotogramas a la API de Claude para mejorar las transiciones. Requiere `ANTHROPIC_API_KEY` y **tiene costo por uso** (la suscripción de Claude no incluye la API).

El video original no se guarda; solo fotogramas de muestra, el audio y la línea de tiempo.
Descargar contenido de Instagram/TikTok puede ir contra sus términos: úsalo solo para fines personales y respeta los derechos de autor (sobre todo de la música) si publicas el resultado.

### Música

- Pon pistas libres de derechos (Pixabay Music, YouTube Audio Library) en `public/music/`.
- O usa **Subir canción** en el asistente.

## Costos

| Pieza | Costo |
|---|---|
| Google Drive API / Picker | Gratis |
| Remotion | Gratis para personas y equipos de hasta 3 ([licencia](https://www.remotion.dev/license)) |
| Render, ffmpeg, yt-dlp | Gratis (corren en tu computador) |
| Afinar con IA | Opcional, pago por uso en la API de Claude |

## Privacidad

- Tus datos quedan en la carpeta `data/` de tu computador (personas, fotos en caché, plantillas y videos). Está en `.gitignore`.
- El token de Google se queda en el servidor y nunca se envía al navegador, salvo para abrir el selector de Google.
- Quitar una foto o persona en la app **no** borra nada de tu Google Drive.
- Las fotos se sirven con nombres aleatorios no adivinables; la app está pensada para correr en `localhost`, no la publiques en internet sin agregar autenticación.

## Estructura

```
app/                  Páginas (Next.js) y rutas /api
components/           UI compartida (vista previa, selector de Google, formularios)
lib/occasions.ts      Ocasiones y cálculo de fechas (país en NEXT_PUBLIC_COUNTRY)
lib/reference/        Análisis de reels: escenas, ritmo, flashes → plantilla
lib/google/drive.ts   Lectura de fotos y subida de videos a Drive
remotion/             Plantillas de video (Remotion + React)
scripts/render.mjs    Render a MP4 en un proceso aparte
data/                 Datos locales (no se sube a git)
```

## Comandos

- `npm run dev`: modo desarrollo.
- `npm run build` y luego `npm start`: modo producción.
- `npm run typecheck`: revisión de tipos.
- `npm run studio`: abre Remotion Studio para editar las plantillas con fotos de ejemplo.

## Problemas comunes

- **"No se encontró ffmpeg"**: instálalo o define `FFMPEG_PATH` y `FFPROBE_PATH` en `.env.local`.
- **El link del reel falla**: el reel puede ser privado o Instagram puede bloquear la descarga. Descárgalo y súbelo como archivo.
- **Error 403 de Google**: revisa que tu correo esté en "Usuarios de prueba" y que las dos APIs estén habilitadas.
- **Fotos HEIC del iPhone**: se importan desde Drive como JPG automáticamente. Si las subes desde el computador, conviértelas a JPG antes.
- **Ya tienes Chrome y no quieres que Remotion descargue otro**: define `REMOTION_BROWSER_EXECUTABLE`.
