# ZUNAREBORN 2.22 — ZUNA STATS

Actualización acumulativa de 2.21, sin reiniciar datos.

## Novedades
- Panel ZUNA STATS en Progreso, entre Evolución física y ZUNA COLLECTION.
- Gráfico pentagonal original y cinco barras interactivas: Fuerza, Disciplina, Enfoque, Constancia, Conocimiento.
- Índices de actividad de los últimos 30 días, calculados a partir de misiones, sesiones deportivas y desafíos de ZUNA LAB ya registrados.
- Al tocar un atributo se explica el cálculo y se muestra el número de días.
- No se inventan medidas de fuerza, inteligencia ni aptitud física: los valores son indicadores de participación, no pruebas de capacidad.
- No se otorgan XP por abrir el panel; no se modifican recompensas ni logros.
- Mismo almacenamiento `zunareborn.v2`; no hay nuevas migraciones destructivas.

## Cálculo
Cada atributo toma días distintos con actividad en los últimos 30 días, con tope 100: Fuerza (misión Físico o sesión deportiva, referencia 12 días), Disciplina (misión Disciplina, 12 días), Enfoque (ZUNA LAB, 10 días), Constancia (cualquier misión, 20 días), Conocimiento (misión Mentalidad, 12 días). El índice global es la media redondeada de los cinco.

## Instalación
Exportá una copia de seguridad desde Perfil, descomprimí el ZIP y reemplazá los 10 archivos de la raíz del repositorio GitHub. Tras la publicación, revisá Progreso → ZUNA STATS. Si la PWA del iPhone tarda en actualizarse, abrí primero la web en Safari. No borres la app ni sus datos.
