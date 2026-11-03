# ZUNAREBORN 2.9 — Seguimiento deportivo y edición de sesiones

Actualización incremental compatible con los datos de ZUNAREBORN 2.8.

## Novedades
- Comparación de cuatro semanas calendario con minutos y cantidad de entrenamientos registrados.
- Gráfico de minutos por semana, diferencia porcentual contra la semana anterior cuando existan datos.
- Observaciones orientativas que no equiparan más minutos con mejor rendimiento ni reemplazan a un entrenador.
- Edición de una sesión deportiva ya registrada (fecha, disciplina, duración, esfuerzo, nota).
- No permite marcar prácticas del plan anteriores a la fecha en que se creó el plan.
- Nuevo cache PWA `zunareborn-v2.9.0` para facilitar actualización de archivos.

## Compatibilidad y seguridad
- Se mantiene la clave local `zunareborn.v2`: hábitos, XP, objetivos, recordatorios y planes existentes no se migran a otra base.
- No se conceden XP por editar entrenamientos ni por los gráficos.
- No se implementan pasos automáticos ni notificaciones push: siguen requiriendo integración adicional.
- Se recomienda hacer una copia de seguridad desde Perfil antes de cargar estos archivos en GitHub Pages.

## Publicación
Descomprimir el ZIP, subir los diez archivos de la carpeta a la **raíz** de `ignagastaz/zunareborn` y confirmar en `main`. GitHub Pages actualiza el sitio. Revisar en iPhone que siga guardado el progreso y que aparezca el gráfico nuevo en Movimiento.

## Nota
Los números representan sesiones anotadas, no datos verificados automáticamente por sensores. Las estadísticas de cuatro semanas incluyen la semana actual incompleta; interpretar las comparaciones con cuidado.
