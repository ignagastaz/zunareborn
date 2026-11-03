# ZUNAREBORN — actualización de estabilidad v2.1

Esta actualización parte del ZIP original del repositorio `zunareborn-main.zip`. No cambia el nombre del almacenamiento: mantiene `zunareborn.v2` para reutilizar los datos locales.

## Cambios

- Fechas del calendario local (Argentina, iPhone/Android) en vez de usar fechas UTC.
- Cálculo de días independiente de cambios de horario de verano.
- Mejor manejo de rachas, semanas y los 30 días de actividad.
- Las misiones personalizadas ahora se **archivan** en vez de borrar sus completados históricos y XP.
- Se evita que una recompensa semanal se otorgue dos veces al desmarcar o remarcar misiones.
- Validación adicional de archivos de copia de seguridad.
- Actualización del panel al regresar a la app tras cambiar el día.
- Renovación de caché PWA a v2.1.

## Cómo publicar

1. **Primero exportá un respaldo** desde Perfil → Exportar copia de seguridad en cada dispositivo donde uses la aplicación.
2. Descargá el ZIP original del repositorio de GitHub como segundo respaldo.
3. Subí los archivos de esta carpeta a la **raíz** del repositorio `ignagastaz/zunareborn` en la rama `main`, reemplazando los existentes.
4. En GitHub Pages esperá a que termine la publicación, abrí la app en Safari y revisá XP, misiones, rachas y diario.
5. Si no ves los cambios inmediatamente, cerrá/reabrí la pestaña o la app instalada y recargá.

## Límites conocidos

- Los datos siguen guardados únicamente en el dispositivo; no hay sincronización automática.
- La recompensa semanal se conserva aunque después se desmarque una misión; esto es intencional para evitar duplicados.
- Los hábitos `3× semana` siguen programados los lunes/miércoles/viernes, no son tres días a elección.
- Los XP antiguos no se recalculan retrospectivamente porque no existe un registro histórico inmutable de recompensas.
- Falta probar todas las funciones en Safari real e iPhone/Android antes de llamar esta versión estable.

## Próxima etapa

Separar lógica de fechas/hábitos en módulos probables, añadir edición segura de hábitos, calendarios completos, e integración progresiva de notificaciones. El podómetro automático requiere una app nativa con HealthKit / Health Connect, no puede implementarse de modo fiable solo en GitHub Pages.
