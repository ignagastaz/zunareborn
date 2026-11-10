# ZUNAREBORN 2.28.1 — reparación de accesibilidad

Auditoría de la 2.28: los módulos ZUNA CORE (personaje y etapas), ZUNA STATS, ZUNA LAB (reacción y memoria), COLLECTION, SEASONS, entrenamiento deportivo y gimnasio seguían presentes en el HTML y JavaScript, pero varias funciones quedaron escondidas tras una navegación demasiado profunda.

Esta versión añade accesos visibles desde Hoy, un menú de salto dentro de Evolución y otro dentro de Entrenar. El personaje vuelve a aparecer al comienzo de Evolución, antes de Temporadas. Se conserva el registro interactivo de series de la 2.28.

No cambia las claves de almacenamiento ni borra datos. Se conserva `zunareborn.v2`, el historial de gimnasio y las funciones existentes. No hay migración ni reinicio.

Instalación: exportar respaldo desde Perfil, extraer los 10 archivos y reemplazarlos en GitHub. Esperar la actualización del caché PWA en iPhone.

Validaciones automáticas: sintaxis JS, IDs, integridad ZIP. Prueba real en iPhone pendiente.
