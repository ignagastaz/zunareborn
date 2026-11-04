# ZUNAREBORN 2.19 — ZUNA CORE Cinematográfico

Actualización acumulativa de ZUNAREBORN 2.18.

## Novedades
- Se reemplazó el avatar vectorial provisional por **retratos cinematográficos originales** masculinos y femeninos.
- Previsualización interactiva de las cinco etapas, con etiquetas claras de etapas bloqueadas. **Previsualizar no desbloquea ni suma XP**.
- Retratos distintos para las etapas 1, 3 y 5; las etapas 2 y 4 usan la imagen base anterior con un efecto luminoso adicional.
- La evolución real sigue dependiendo de los XP actuales: 0, 500, 1500, 3000 y 6000 XP.
- El estado de energía sigue reflejando la actividad reciente; no se pierden etapas ni XP por inactividad.
- Los seis retratos están comprimidos y embebidos en CSS: el ZIP mantiene **los mismos 10 archivos** y funciona sin conexión después de cargar.
- Conserva `localStorage` con clave `zunareborn.v2`, los datos existentes, respaldos y selección de personaje.

## Cómo actualizar en iPhone
1. Exportá una copia de seguridad desde Perfil.
2. Descomprimí el ZIP y subí los 10 archivos a la raíz de GitHub, reemplazando los anteriores.
3. Esperá a que GitHub Pages publique los cambios.
4. Si la PWA instalada no actualiza inmediatamente, abrí la web en Safari y luego volvé a abrir la app. No borres datos ni desinstales sin respaldo.

## Nota visual
Este es el primer paso de la versión cinematográfica: ilustraciones estáticas con iluminación y efectos sutiles, no animación 3D. Las etapas 2 y 4 comparten retrato con la etapa anterior, diferenciándose mediante efectos. Próximas iteraciones podrán sumar ilustraciones exclusivas para cada nivel.
