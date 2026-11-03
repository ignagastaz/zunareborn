# ZUNAREBORN Web 2.6 — Movimiento y auditoría

Basada en la versión 2.5 enviada y validada por el usuario. Todos los archivos se colocan **en la raíz del repositorio** para GitHub Pages.

## Funciones nuevas
- Apartado Movimiento accesible desde Inicio y Perfil.
- Elección de deporte: running, fútbol, gimnasio, ciclismo, básquet, natación y otro.
- Objetivo semanal de sesiones.
- Registro de entrenamientos por fecha, deporte, minutos, intensidad y notas.
- Historial de sesiones, eliminación confirmada y resumen semanal.
- Consejos generales de técnica por disciplina (orientativos, no personalizados por IA).
- Exportación e importación de sesiones como parte del respaldo existente.
- PWA cache versionado 2.6.

## Limitaciones
- NO cuenta pasos automáticamente ni sincroniza Apple Health / Health Connect: la PWA no dispone de esos permisos de sensor en segundo plano. Esa integración exige una capa móvil nativa y autorizaciones.
- NO envía push con la app cerrada. Los recordatorios anteriores siguen funcionando solo dentro de la aplicación.
- Entrenamientos no generan XP todavía, para no duplicar recompensas con las misiones.
- Los datos siguen siendo locales; exportar respaldo antes de actualizar.

## Revisión técnica
- Fechas locales previamente corregidas en 2.1.
- XP histórico por misión presente desde 2.2.
- Recompensas por objetivos con bandera `awarded`, se entregan una sola vez.
- Datos deportivos separados de `completions` y `xp`.
- Validaciones y escape de notas de entrenamiento al renderizar.

## Pendientes para versión futura
- Snapshots históricos de planificación de hábitos (hoy una frecuencia editada puede afectar estadísticas retrospectivas).
- Notificaciones push reales con servicio backend.
- Autenticación y sincronización cifrada entre dispositivos.
- Exportación de archivos de historial de entrenamiento en formatos abiertos.
- App nativa para acceso autorizado a Apple Health y Health Connect.

## Actualización
1. Exportar una copia desde Perfil.
2. Descomprimir ZUNAREBORN26.zip.
3. Subir los archivos individuales en la raíz de GitHub (`main`).
4. Esperar el despliegue de Pages y comprobar XP, hábitos, objetivos y sesiones.
