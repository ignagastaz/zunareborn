# ZUNAREBORN Web v2.0

Versión mejorada de la PWA, pensada para iPhone/iPad y GitHub Pages.

## Mejoras principales
- Onboarding inicial.
- Misiones/hábitos con frecuencia: diaria, lunes-viernes, fines de semana o 3 veces por semana.
- Misiones personalizadas eliminables.
- XP, niveles, rangos, racha actual y mejor racha.
- Desafío semanal con recompensa automática de XP.
- Calendario de actividad de 30 días.
- Sistema de logros/insignias.
- Balance semanal por pilares.
- Diario con estado de ánimo.
- Modo 66 días + modo permanente.
- Exportación/importación de respaldo.
- PWA con iconos PNG para iOS y service worker actualizado.
- Migración automática de datos de la versión v1 cuando sea posible.

## Limitación actual importante
Los datos siguen guardándose localmente en el navegador (`localStorage`). No existe todavía una cuenta ni sincronización en nube. Esto evita necesitar backend, claves o servicios externos en esta etapa, pero significa que iPhone e iPad no se sincronizan automáticamente.

## Cómo actualizar GitHub Pages
Reemplazá los archivos del repositorio por los de esta carpeta, manteniéndolos en la raíz del repositorio. GitHub Pages volverá a desplegar automáticamente.

Archivos a subir:
- index.html
- styles.css
- app.js
- manifest.webmanifest
- sw.js
- icon-180.png
- icon-192.png
- icon-512.png
- README.md

Si Safari conserva la versión anterior, cerrá la PWA/Safari, volvé a abrir y recargá. Si la instalaste en inicio y persiste el caché, puede ser necesario quitar el acceso directo y añadirlo nuevamente.
