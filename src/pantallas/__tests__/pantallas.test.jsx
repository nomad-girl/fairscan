// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { iniciarIdiomas } from "../../idiomas/index.js";
import { SistemaProvider } from "../../sistema/SistemaProvider.jsx";
import { Visor } from "../Visor.jsx";
import { CerrarStand } from "../CerrarStand.jsx";

vi.mock("../../sistema/vibrar.js", () => ({ vibrarSeleccion: vi.fn(), vibrarExito: vi.fn(), vibrarError: vi.fn(), vibrarObturador: vi.fn(), vibrarAviso: vi.fn() }));

beforeAll(() => { iniciarIdiomas("es-AR"); });
afterEach(cleanup);

const con = (ui) => render(<SistemaProvider modo="claro">{ui}</SistemaProvider>);
const FOTO = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

describe("Visor", () => {
  it("sin saldo ni nube a la vista, sin botón a la derecha; el contador del stand; el obturador mide 72", () => {
    const onDisparar = vi.fn(), onCerrarStand = vi.fn();
    con(<Visor videoRef={{ current: null }} modo="product" feria="🇨🇳 Cantón" itemsCount={3} saldo={12} estadoSync="sincronizando" pendientesSync={2} onDisparar={onDisparar} onStand={onCerrarStand} />);
    // El saldo y la nube ya no se muestran en la cámara (Nati, 22/09: distraen); el saldo vuelve solo cuando está por acabarse
    expect(screen.queryByText("12 de 15 escaneos de prueba")).toBeNull();
    expect(screen.queryByText("Sincronizando 2")).toBeNull();
    expect(screen.getByLabelText("3 en este stand")).toBeTruthy();
    const obturador = screen.getByRole("button", { name: "Sacar foto" });
    expect(obturador.style.width).toBe("72px");
    fireEvent.click(obturador);
    expect(onDisparar).toHaveBeenCalled();
    expect(screen.queryByText("Terminar")).toBeNull(); // sin botón a la derecha: la pastilla de arriba es el stand
  });
  it("en cero muestra cuántas fotos esperan y en naranja", () => {
    con(<Visor videoRef={{ current: null }} saldo={0} esperando={2} />);
    expect(screen.getByText("0 escaneos · 2 esperando")).toBeTruthy();
  });
  it("con la última captura ofrece otra foto del mismo producto; la miniatura abre Este stand y desde ahí el catálogo (22/10)", () => {
    const onAgregarAngulo = vi.fn(), onCatalogo = vi.fn();
    con(<Visor videoRef={{ current: null }} itemsCount={1} ultimaCaptura={FOTO} ultimas={[{ id: 7, foto: FOTO }]} puedeAgregarAngulo onAgregarAngulo={onAgregarAngulo} onCatalogo={onCatalogo} />);
    fireEvent.click(screen.getByRole("button", { name: "Otra foto del mismo producto" }));
    expect(onAgregarAngulo).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Este stand" }));
    fireEvent.click(screen.getByRole("button", { name: "Ir al catálogo" }));
    expect(onCatalogo).toHaveBeenCalled();
  });
  it("un solo obturador con el selector PRODUCTO · TARJETA: elegir TARJETA abre la cámara de tarjeta y el obturador dice qué hace", () => {
    const onTarjeta = vi.fn(), onVolver = vi.fn();
    const { unmount } = con(<Visor videoRef={{ current: null }} modo="product" onTarjeta={onTarjeta} onVolverAProductos={onVolver} />);
    expect(screen.getByText("Sacá la primera foto")).toBeTruthy(); // la línea de abajo dice el próximo paso, corto y en letra grande (28/10)
    fireEvent.click(screen.getByRole("tab", { name: "TARJETA" }));
    expect(onTarjeta).toHaveBeenCalled();
    unmount();
    con(<Visor videoRef={{ current: null }} modo="card" onVolverAProductos={onVolver} />);
    expect(screen.getByText("Encuadrá la tarjeta")).toBeTruthy();
    expect(screen.getByText("Después seguís sacando productos")).toBeTruthy();
    expect(screen.getByText("Escaneá una tarjeta")).toBeTruthy();
    expect(screen.queryByText("Sin tarjeta")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "PRODUCTO" }));
    expect(onVolver).toHaveBeenCalled();
  });
  it("el teclado propio (28/10): número grande, teclas de la app sin teclado del sistema, Listo guarda y cierra; la cámara también cierra", () => {
    const onConsejoVisto = vi.fn(), onTecla = vi.fn(), onConfirmar = vi.fn(), onCampo = vi.fn(), onFavorito = vi.fn();
    const { rerender } = con(<Visor videoRef={{ current: null }} consejoVisible onConsejoVisto={onConsejoVisto} datos={{ id: 1, campo: "price", valores: {}, moqBase: null, favorito: false, tocado: false, listos: {} }} onTeclaPrecio={onTecla} onConfirmarPrecio={onConfirmar} onCampo={onCampo} onFavorito={onFavorito} />);
    fireEvent.click(screen.getByRole("status", { name: "" }));
    expect(onConsejoVisto).toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).toBeNull(); // nunca el teclado del teléfono
    expect(screen.getByText("¿A cuánto estaba?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
    expect(onTecla).toHaveBeenNthCalledWith(1, "3");
    expect(onTecla).toHaveBeenNthCalledWith(2, "⌫");
    expect(screen.getByRole("tab", { name: "MOQ" })).toBeTruthy(); // las pestañas siempre a la vista; precio por defecto
    fireEvent.click(screen.getByRole("button", { name: "Marcar como favorito" }));
    expect(onFavorito).toHaveBeenCalled();
    rerender(<SistemaProvider modo="claro"><Visor videoRef={{ current: null }} datos={{ id: 1, campo: "price", valores: { price: "0.85" }, moqBase: null, favorito: false, tocado: true, listos: {} }} onTeclaPrecio={onTecla} onConfirmarPrecio={onConfirmar} onCampo={onCampo} /></SistemaProvider>);
    expect(screen.getByRole("status", { name: "USD 0.85" })).toBeTruthy(); // el número grande
    fireEvent.click(screen.getByLabelText("Listo")); // la tilde redonda (v2)
    expect(onConfirmar).toHaveBeenCalledTimes(2); // una por tocar afuera (el consejo, más arriba) y otra por la tilde
    expect(screen.queryByRole("button", { name: "Cerrar" })).toBeNull(); // sin equis: un solo botón que cierra
    fireEvent.click(screen.getByRole("tab", { name: "MOQ" }));
    expect(onCampo).toHaveBeenCalledWith("price".replace("price", "moq"));
  });
  it("la pestaña Proveedor pregunta de quién es si el stand no tiene tarjeta, y muestra el nombre cuando ya la tiene", () => {
    const onTarjeta = vi.fn(), onConfirmar = vi.fn(), onElegir = vi.fn(), onEscribir = vi.fn();
    const datos = { id: 1, campo: "proveedor", valores: {}, moqBase: null, favorito: false, tocado: true, listos: {} };
    const { unmount } = con(<Visor videoRef={{ current: null }} datos={datos} standAbierto={{ nombre: "", fotos: 1, tieneTarjeta: false, leyendo: false }} onTarjeta={onTarjeta} onConfirmarPrecio={onConfirmar} onElegirProveedor={onElegir} onEscribirProveedor={onEscribir} />);
    expect(screen.getByText("¿De quién es este producto?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Elegir uno cargado" }));
    expect(onElegir).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Escribir el nombre" }));
    expect(onEscribir).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Escanear tarjeta" }));
    expect(onConfirmar).toHaveBeenCalled(); // el teclado se cierra y se abre la cámara de tarjeta
    expect(onTarjeta).toHaveBeenCalled();
    unmount();
    con(<Visor videoRef={{ current: null }} datos={datos} standAbierto={{ nombre: "Nancy Ceramic", fotos: 1, tieneTarjeta: true, leyendo: false }} />);
    expect(screen.getByText("Nancy Ceramic")).toBeTruthy();
    expect(screen.queryByText("¿De quién es este producto?")).toBeNull();
  });
  it("la línea de abajo guía según el stand, y la sugerencia de la tarjeta al principio no bloquea", () => {
    const onEscanear = vi.fn(), onDespues = vi.fn();
    const { unmount } = con(<Visor videoRef={{ current: null }} standAbierto={{ nombre: "", fotos: 2, tieneTarjeta: false, leyendo: false }} propuestaInicio={{ onEscanear, onDespues }} />);
    expect(screen.getByText("Al terminar, escaneá la tarjeta")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Después" }));
    expect(onDespues).toHaveBeenCalled();
    unmount();
    const r = con(<Visor videoRef={{ current: null }} standAbierto={{ nombre: "Nancy Ceramic", fotos: 0, tieneTarjeta: true, leyendo: false }} />);
    expect(screen.getByText("Ahora los productos")).toBeTruthy();
    r.unmount();
    con(<Visor videoRef={{ current: null }} standAbierto={{ nombre: "Nancy Ceramic", fotos: 3, tieneTarjeta: true, leyendo: false }} />);
    expect(screen.queryByText(/Sacar otra/)).toBeNull(); // con todo cargado no dice nada (28/10: "nadie lo lee")
    expect(screen.getByRole("button", { name: "Catálogo" })).toBeTruthy(); // "‹ Catálogo" arriba a la izquierda, en vez de la feria
  });
  it("la tarjeta avisa en una franja arriba: guardada al toque, o falló (tocar vuelve a escanear); nunca un cartel en el medio", () => {
    const onReintentar = vi.fn();
    const { unmount } = con(<Visor videoRef={{ current: null }} tarjetaAviso={{ fase: "guardada" }} />);
    expect(screen.getByText("Tarjeta guardada")).toBeTruthy();
    expect(screen.getByText("Seguí sacando productos")).toBeTruthy();
    unmount();
    con(<Visor videoRef={{ current: null }} tarjetaAviso={{ fase: "fallo", onReintentar }} />);
    fireEvent.click(screen.getByText("No pude leer la tarjeta"));
    expect(onReintentar).toHaveBeenCalled();
  });
  it("el teclado es de tres columnas con la tilde redonda al lado del número (v2, como Buddy)", () => {
    const onConfirmar = vi.fn();
    con(<Visor videoRef={{ current: null }} datos={{ id: 1, campo: "price", valores: { price: "3.8" }, moqBase: null, favorito: false, tocado: true, listos: {} }} onConfirmarPrecio={onConfirmar} />);
    expect(screen.getAllByRole("button", { name: /^[0-9.]$/ })).toHaveLength(11); // 1 a 9, el punto y el 0
    fireEvent.click(screen.getByLabelText("Listo"));
    expect(onConfirmar).toHaveBeenCalled();
  });
  it("en MOQ aparece la base por producto / caja / pedido", () => {
    const onMoqBase = vi.fn();
    con(<Visor videoRef={{ current: null }} datos={{ id: 1, campo: "moq", valores: { price: "0.85", moq: "500" }, moqBase: "caja", favorito: true, tocado: true, listos: { price: true } }} onMoqBase={onMoqBase} />);
    expect(screen.getByRole("radio", { name: "por caja", checked: true })).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "por pedido" }));
    expect(onMoqBase).toHaveBeenCalledWith("pedido");
    expect(screen.getByRole("tab", { name: "MOQ", selected: true })).toBeTruthy();
  });
});

describe("Visor · otra foto del mismo producto", () => {
  it("el + va sobre la miniatura y, en modo otra foto, el cartel lo dice", () => {
    const onAgregarAngulo = vi.fn();
    const { unmount } = con(<Visor videoRef={{ current: null }} itemsCount={1} ultimaCaptura={FOTO} ultimas={[{ id: 7, foto: FOTO }]} puedeAgregarAngulo onAgregarAngulo={onAgregarAngulo} />);
    fireEvent.click(screen.getByRole("button", { name: "Otra foto del mismo producto" }));
    expect(onAgregarAngulo).toHaveBeenCalled();
    unmount();
    con(<Visor videoRef={{ current: null }} itemsCount={1} ultimaCaptura={FOTO} ultimas={[{ id: 7, foto: FOTO }]} modoAngulo standAbierto={{ nombre: "", fotos: 1, tieneTarjeta: false, leyendo: false }} />);
    expect(screen.getByText("Otra foto del mismo producto: encuadrá y dispará")).toBeTruthy();
  });
});

describe("Visor · stand abierto", () => {
  it("sin fotos ni tarjeta no hay pastilla de stand; la tarjeta es un modo del obturador, no un botón aparte", () => {
    con(<Visor videoRef={{ current: null }} modo="product" itemsCount={0} standAbierto={{ nombre: "", fotos: 0, tieneTarjeta: false, leyendo: false }} />);
    expect(screen.queryByText("Escanear tarjeta del proveedor")).toBeNull();
    expect(screen.queryByRole("button", { name: "Abrir el stand" })).toBeNull();
    expect(screen.queryByText("Terminar")).toBeNull();
  });
  it("con fotos cuenta las fotos arriba a la derecha; con la tarjeta leída muestra la empresa; tocarla abre el stand", () => {
    const onStand = vi.fn();
    const { unmount } = con(<Visor videoRef={{ current: null }} modo="product" itemsCount={3} standAbierto={{ nombre: "", fotos: 3, tieneTarjeta: false, leyendo: false }} onStand={onStand} />);
    fireEvent.click(screen.getByText("Stand · 3 fotos")); // 28/10: la pastilla no habla de la tarjeta
    expect(onStand).toHaveBeenCalledTimes(1);
    unmount();
    con(<Visor videoRef={{ current: null }} modo="product" itemsCount={3} standAbierto={{ nombre: "Yiwu Best Toys", fotos: 3, tieneTarjeta: true, leyendo: false }} onStand={onStand} />);
    fireEvent.click(screen.getByText("Yiwu Best Toys · 3 fotos"));
    expect(onStand).toHaveBeenCalledTimes(2);
  });
  it("mientras lee la tarjeta la pastilla no lo dice (28/10); el aviso de stand retomado ofrece empezar otro", () => {
    const { unmount } = con(<Visor videoRef={{ current: null }} modo="product" itemsCount={1} standAbierto={{ nombre: "", fotos: 1, tieneTarjeta: true, leyendo: true }} />);
    expect(screen.getByText("Stand · 1 foto")).toBeTruthy();
    unmount();
    const r = con(<Visor videoRef={{ current: null }} modo="product" itemsCount={1} standAbierto={{ nombre: "", fotos: 1, tieneTarjeta: true, leyendo: false }} />);
    expect(screen.getByText("Stand · 1 foto")).toBeTruthy();
    r.unmount();
    const onStand = vi.fn();
    con(<Visor videoRef={{ current: null }} modo="product" avisoRetomado="Seguís en el stand de hace 2 horas" onStand={onStand} />);
    fireEvent.click(screen.getByText("Empezar otro"));
    expect(onStand).toHaveBeenCalled();
  });
});

describe("CerrarStand", () => {
  it("es la tarjeta a pantalla entera: la flecha vuelve a la cámara, el rail corrige y va al catálogo, un solo Listo cierra", () => {
    const onVolverAlVisor = vi.fn(), onListo = vi.fn();
    const proveedor = { name: "Yiwu Best Toys", contact: "", phone: "", email: "", wechat: "", whatsapp: "", website: "", address: "", products: "", notes: "", favorito: false, minimoDeCompra: null };
    const onEditar = vi.fn(), onCatalogo = vi.fn(), onResumen = vi.fn();
    const r = con(<CerrarStand itemsCount={2} items={[{ id: 1, photos: [FOTO] }, { id: 2, photos: [FOTO] }]} cardPhoto={FOTO} proveedor={proveedor} onCambiarProveedor={vi.fn()} onVolverAlVisor={onVolverAlVisor} onListo={onListo} onEditar={onEditar} onCatalogo={onCatalogo} />);
    expect(screen.getByText("Stand · 2 productos")).toBeTruthy();
    expect(screen.getByText("Yiwu Best Toys")).toBeTruthy(); // la empresa, grande, sobre la tarjeta
    fireEvent.click(screen.getByRole("button", { name: "Catálogo" }));
    expect(onCatalogo).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Agregar o corregir datos" }));
    expect(screen.getByText("Comentarios")).toBeTruthy(); // la hoja de datos, no la pantalla vieja
    expect(onEditar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Seguir sacando fotos" }));
    expect(onVolverAlVisor).toHaveBeenCalled();
    expect(onListo).not.toHaveBeenCalled();
    expect(screen.getAllByRole("button", { name: /Listo/ }).length).toBe(1); // un solo botón grande
    fireEvent.click(screen.getByRole("button", { name: /Listo/ }));
    expect(onListo).toHaveBeenCalled();
    r.unmount();
    // Sin tarjeta, el stand ofrece escanearla; el editor completo vuelve al stand
    const onSacarTarjeta = vi.fn();
    const r2 = con(<CerrarStand itemsCount={0} items={[]} proveedor={{ ...proveedor, name: "" }} onCambiarProveedor={vi.fn()} onSacarTarjeta={onSacarTarjeta} />);
    fireEvent.click(screen.getByText("Escanear tarjeta del proveedor"));
    expect(onSacarTarjeta).toHaveBeenCalled();
    r2.unmount();
    // Un stand que quedó sin cerrar: retomar o descartar; en modo solo proveedor, Guardar proveedor
    const onRetomar = vi.fn();
    const r3 = con(<CerrarStand itemsCount={0} items={[]} proveedor={proveedor} onCambiarProveedor={vi.fn()} borrador={{}} descripcionBorrador={{ que: "3 productos", hace: "hace 2 horas" }} onRetomar={onRetomar} />);
    fireEvent.click(screen.getByText("Retomar"));
    expect(onRetomar).toHaveBeenCalled();
    r3.unmount();
    con(<CerrarStand soloProveedor proveedor={proveedor} onCambiarProveedor={vi.fn()} />);
    expect(screen.getByText("Guardar proveedor")).toBeTruthy();
    expect(onResumen).not.toHaveBeenCalled();
  });
});
