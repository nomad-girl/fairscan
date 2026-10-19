# Blog de FairScan · cómo se escribe una nota

Una nota = un archivo `.md` en `blog/<idioma>/` (`es`, `en`, `pt`). El nombre del archivo es la dirección: `blog/es/la-noche-de-las-tarjetas.md` → `fairscan.app/blog/es/la-noche-de-las-tarjetas/`.

Arriba del archivo, entre dos líneas `---`, los datos:

```
---
titulo: La noche de las tarjetas
descripcion: Por qué la feria termina a las seis y tu trabajo a las dos de la mañana. (≤160 caracteres, para Google)
fecha: 2026-10-20
borrador: false
---
```

Después, el texto en Markdown: `## Subtítulo`, párrafos, `**negrita**`, `*cursiva*`, listas con `- `, links `[texto](https://…)`, imágenes `![alt](/blog/img/archivo.jpg)` (las imágenes van en `public/blog/img/`). Con `borrador: true` la nota no se publica.

Las páginas se generan solas al compilar (`npm run build` corre `scripts/blog.mjs`): índice por idioma en `/blog/<idioma>/`, cada nota en su carpeta, y `sitemap.xml` + `robots.txt` con la landing, soporte y todas las notas. No hace falta tocar nada más.
