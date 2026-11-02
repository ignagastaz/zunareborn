# ZUNAREBORN — versión web 1.0

PWA responsive para iPad y iPhone. Incluye panel de inicio, programa de 66 días y modo permanente, misiones diarias y personalizadas, categorías, XP, niveles, racha, actividad de 14 días, balance por pilares, diario personal, perfil, exportación e importación de datos, manifest y caché offline.

## Importante
Los datos se guardan localmente en el navegador (localStorage). No se sincronizan automáticamente entre iPad y iPhone todavía. Exportá e importá una copia JSON para moverlos entre dispositivos. Esta primera versión no tiene cuentas, backend, sincronización en nube ni notificaciones programadas; son parte de la siguiente fase.

## Publicación e instalación
Para que la PWA se instale y funcione offline, debe publicarse en una URL HTTPS. Subí todos los archivos de esta carpeta a un hosting estático (por ejemplo GitHub Pages, Netlify o Cloudflare Pages), abrí la URL en Safari y elegí Compartir → Añadir a pantalla de inicio.

## Archivos
`index.html` interfaz · `styles.css` diseño · `app.js` lógica y almacenamiento · `manifest.webmanifest` PWA · `sw.js` caché offline · `icon.svg` icono.

## Próximas fases
Onboarding guiado, hábitos con frecuencia semanal, misiones semanales y desafíos, calendario completo, recordatorios, sincronización segura entre dispositivos, pruebas de accesibilidad y posterior migración a app nativa iOS con Mac/Xcode.
