# ZUNAREBORN 2.2 — Gestión de hábitos

Basada en ZUNAREBORN 2.1; mantiene la clave local `zunareborn.v2` para conservar datos existentes.

## Nuevo
- Editar hábitos existentes: nombre, área, dificultad, frecuencia y objetivo semanal.
- Días de la semana seleccionables manualmente.
- Pausar y reanudar hábitos sin borrar datos.
- Archivar y restaurar hábitos, con historial intacto.
- Panel de gestión de hábitos y metas semanales.
- Registro del XP de cada completación para no reinterpretar premios antiguos cuando cambiás la dificultad.
- Caché PWA versionada a 2.2.

## Actualización
Antes de subir a GitHub, exportá la copia de seguridad desde Perfil. Subí el contenido de esta carpeta a la raíz del repositorio, reemplazando los archivos existentes con el mismo nombre; la rama `main` y GitHub Pages quedan iguales.

## Limitaciones
Las metas semanales cuentan días completados, no repeticiones ni magnitudes. No hay sincronización entre dispositivos ni notificaciones push todavía. El calendario previo a crear o editar un hábito no se recalcula retrospectivamente como programa histórico.
