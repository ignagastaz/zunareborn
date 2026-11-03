# ZUNAREBORN Web 2.5 — Recordatorios dentro de la aplicación

Actualización incremental de la versión 2.4, con la misma clave de almacenamiento `zunareborn.v2`.

## Novedades
- Configuración de avisos en Perfil: activar/desactivar, apertura y cierre del día, avisos de objetivos, horario individual de cada hábito.
- Campana con contador y bandeja de avisos.
- Alertas de hábitos pendientes según los días programados.
- Deduplicación diaria de avisos y límite de historial.
- Los ajustes y la bandeja se incluyen en el respaldo JSON.
- Revisión de avisos al abrir, volver a la app o mientras permanece activa.

## Límites **muy importantes**
Estos son **avisos dentro de la aplicación**, no notificaciones push del sistema. **No llegan con la app cerrada**; para que aparezcan hay que abrir ZUNAREBORN o mantenerla activa. No se utilizan permisos del sistema ni servicios externos. Para push verdaderas en iOS/Android necesitaremos infraestructura (servicio de envío, suscripciones push y pruebas en dispositivos).

## Actualización desde GitHub Pages
1. En la versión 2.4, Perfil → Exportar copia de seguridad.
2. Descomprimí este ZIP y subí el contenido de la carpeta a la raíz del repositorio, sustituyendo los archivos del mismo nombre.
3. Confirmá el commit en `main` y abrí la PWA. La información existente debería permanecer en el mismo navegador/origen.
4. Probá activando los avisos y configurando un horario previo a la hora actual para un hábito pendiente. Revisá la campana.
5. Verificá que sigan presentes hábitos, XP, objetivos, rachas y diario.

No se toca la web publicada automáticamente.
