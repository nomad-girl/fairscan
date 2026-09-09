/**
 * Presets por rubro: las etiquetas (categorías, materiales, packaging, variantes)
 * que ve la usuaria según su negocio. Se eligen una sola vez al crear la cuenta
 * (pieza 4.7, decisión 11) y se pueden cambiar en Configuración.
 */
export const PRESETS = {
  vajilla: { name:"Vajilla / Cristalería", icon:"🍽", categories:["Vajilla","Cristalería","Té / Café","Cubiertos","Deco / Hogar"], materials:["Porcelana","Bone China","Vidrio","Borosilicato","Cristal","Cerámica","Melamina","Acero Inox"], packagingTypes:["Standard","Gift box","Premium / Display","Bulk","Color box"], variantTypes:["Individual","Set x2","Set x4","Set x6","Set x12","Variante color","Variante tamaño"] },
  electronica: { name:"Electrónica", icon:"📱", categories:["Cargadores","Audio","Cables","Power banks","Accesorios"], materials:["ABS","Policarbonato","Aluminio","Silicona","Metal"], packagingTypes:["Blister","Color box","White box","Gift box"], variantTypes:["Individual","Kit / Combo","Variante color","Variante capacidad"] },
  textil: { name:"Textil", icon:"👕", categories:["Remeras","Pantalones","Camperas","Deportivo","Accesorios"], materials:["Algodón","Poliéster","Nylon","Spandex","Lino","Denim"], packagingTypes:["Bolsa OPP","Caja cartón","Bolsa ziplock","Percha + bolsa"], variantTypes:["Talle S-XL","Talle único","Variante color","Pack x3","Pack x6"] },
  general: { name:"General", icon:"📦", categories:["Cat 1","Cat 2","Cat 3"], materials:["Mat 1","Mat 2"], packagingTypes:["Standard","Premium","Bulk"], variantTypes:["Individual","Set / Pack","Variante color","Variante tamaño"] },
};

export const RUBRO_POR_DEFECTO = "vajilla";
export const listaDeRubros = () => Object.entries(PRESETS).map(([clave, p]) => ({ clave, nombre: p.name, icono: p.icon }));
