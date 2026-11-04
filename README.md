# ZUNAREBORN 2.18 — ZUNA CORE

Primera implementación funcional del avatar evolutivo. Se conserva toda la funcionalidad de 2.17.

- Dos estilos iniciales de personaje: masculino y femenino, seleccionables desde Evolución.
- Avatar SVG integrado en la app, con núcleo dorado animado.
- Cinco etapas por XP acumulados: Despertar (0), Enfoque (500), Constancia (1500), Disciplina (3000), Maestría (6000).
- El núcleo cambia de intensidad según los días desde la última actividad registrada. Nunca se restan XP ni se revocan etapas por inactividad.
- Efectos de alas a partir de la etapa 3 y corona en etapa 5.
- Selección guardada en `localStorage` bajo la misma clave `zunareborn.v2` e incluida en las exportaciones.
- Migración segura de perfiles antiguos, con personaje masculino como valor inicial. Se puede cambiar libremente.

## Actualización
1. Exportá respaldo desde Perfil.
2. Descomprimí el ZIP y subí los 10 archivos a la raíz del repositorio GitHub.
3. Esperá la publicación y comprobá Evolución > ZUNA CORE. En iPhone puede tardar en refrescarse la PWA; no borres la app ni su almacenamiento.

**Nota:** este es un primer avatar vectorial animado, no todavía la ilustración cinematográfica final. La evolución es recreativa y motivacional.
