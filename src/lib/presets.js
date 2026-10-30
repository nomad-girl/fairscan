/**
 * Presets por rubro: las etiquetas (categorías, materiales, packaging, variantes)
 * que ve la usuaria según su negocio. Se eligen una sola vez al crear la cuenta
 * (pieza 4.7, decisión 11) y se pueden cambiar en Configuración.
 *
 * 30/10/2026 (E25, la app en portugués): las etiquetas salen en el idioma de la app. Antes estaban solo en
 * castellano, así que en inglés la IA elegía "Vajilla" o "Cristalería" aunque el resto saliera en inglés. Se
 * aplican al crear la cuenta o al elegir el rubro en Configuración; lo que ya tiene guardado cada cuenta no cambia.
 */
const ICONOS = { vajilla: "🍽", electronica: "📱", textil: "👕", general: "📦" };

const POR_IDIOMA = {
  "es-AR": {
    vajilla: { name:"Vajilla / Cristalería", categories:["Vajilla","Cristalería","Té / Café","Cubiertos","Deco / Hogar"], materials:["Porcelana","Bone China","Vidrio","Borosilicato","Cristal","Cerámica","Melamina","Acero Inox"], packagingTypes:["Standard","Gift box","Premium / Display","Bulk","Color box"], variantTypes:["Individual","Set x2","Set x4","Set x6","Set x12","Variante color","Variante tamaño"] },
    electronica: { name:"Electrónica", categories:["Cargadores","Audio","Cables","Power banks","Accesorios"], materials:["ABS","Policarbonato","Aluminio","Silicona","Metal"], packagingTypes:["Blister","Color box","White box","Gift box"], variantTypes:["Individual","Kit / Combo","Variante color","Variante capacidad"] },
    textil: { name:"Textil", categories:["Remeras","Pantalones","Camperas","Deportivo","Accesorios"], materials:["Algodón","Poliéster","Nylon","Spandex","Lino","Denim"], packagingTypes:["Bolsa OPP","Caja cartón","Bolsa ziplock","Percha + bolsa"], variantTypes:["Talle S-XL","Talle único","Variante color","Pack x3","Pack x6"] },
    general: { name:"General", categories:["Cat 1","Cat 2","Cat 3"], materials:["Mat 1","Mat 2"], packagingTypes:["Standard","Premium","Bulk"], variantTypes:["Individual","Set / Pack","Variante color","Variante tamaño"] },
  },
  en: {
    vajilla: { name:"Tableware / Glassware", categories:["Tableware","Glassware","Tea / Coffee","Cutlery","Home decor"], materials:["Porcelain","Bone China","Glass","Borosilicate","Crystal","Ceramic","Melamine","Stainless steel"], packagingTypes:["Standard","Gift box","Premium / Display","Bulk","Color box"], variantTypes:["Single","Set x2","Set x4","Set x6","Set x12","Color variant","Size variant"] },
    electronica: { name:"Electronics", categories:["Chargers","Audio","Cables","Power banks","Accessories"], materials:["ABS","Polycarbonate","Aluminum","Silicone","Metal"], packagingTypes:["Blister","Color box","White box","Gift box"], variantTypes:["Single","Kit / Combo","Color variant","Capacity variant"] },
    textil: { name:"Apparel / Textiles", categories:["T-shirts","Pants","Jackets","Sportswear","Accessories"], materials:["Cotton","Polyester","Nylon","Spandex","Linen","Denim"], packagingTypes:["OPP bag","Carton box","Ziplock bag","Hanger + bag"], variantTypes:["Size S-XL","One size","Color variant","Pack x3","Pack x6"] },
    general: { name:"General", categories:["Cat 1","Cat 2","Cat 3"], materials:["Mat 1","Mat 2"], packagingTypes:["Standard","Premium","Bulk"], variantTypes:["Single","Set / Pack","Color variant","Size variant"] },
  },
  "pt-BR": {
    vajilla: { name:"Louças / Cristais", categories:["Louças","Cristais","Chá / Café","Talheres","Decoração / Casa"], materials:["Porcelana","Bone China","Vidro","Borossilicato","Cristal","Cerâmica","Melamina","Aço inox"], packagingTypes:["Standard","Caixa de presente","Premium / Display","Granel","Caixa colorida"], variantTypes:["Unitário","Jogo x2","Jogo x4","Jogo x6","Jogo x12","Variação de cor","Variação de tamanho"] },
    electronica: { name:"Eletrônicos", categories:["Carregadores","Áudio","Cabos","Power banks","Acessórios"], materials:["ABS","Policarbonato","Alumínio","Silicone","Metal"], packagingTypes:["Blister","Caixa colorida","Caixa branca","Caixa de presente"], variantTypes:["Unitário","Kit / Combo","Variação de cor","Variação de capacidade"] },
    textil: { name:"Têxtil / Moda", categories:["Camisetas","Calças","Jaquetas","Esportivo","Acessórios"], materials:["Algodão","Poliéster","Náilon","Elastano","Linho","Jeans"], packagingTypes:["Saco OPP","Caixa de papelão","Saco zip","Cabide + saco"], variantTypes:["Tamanho P-GG","Tamanho único","Variação de cor","Pacote x3","Pacote x6"] },
    general: { name:"Geral", categories:["Cat 1","Cat 2","Cat 3"], materials:["Mat 1","Mat 2"], packagingTypes:["Standard","Premium","Granel"], variantTypes:["Unitário","Jogo / Pacote","Variação de cor","Variação de tamanho"] },
  },
};

const conIconos = (tabla) => Object.fromEntries(Object.entries(tabla).map(([k, p]) => [k, { ...p, icon: ICONOS[k] }]));

/** Los presets en el idioma pedido (es-AR, en, pt-BR); cualquier otro cae en castellano. */
export function presetsDe(idioma = "es-AR") {
  const clave = /^pt/i.test(idioma || "") ? "pt-BR" : /^en/i.test(idioma || "") ? "en" : "es-AR";
  return conIconos(POR_IDIOMA[clave]);
}

/** Compatibilidad: los presets en castellano, como antes. */
export const PRESETS = presetsDe("es-AR");

export const RUBRO_POR_DEFECTO = "vajilla";
export const listaDeRubros = (idioma) => Object.entries(presetsDe(idioma)).map(([clave, p]) => ({ clave, nombre: p.name, icono: p.icon }));
