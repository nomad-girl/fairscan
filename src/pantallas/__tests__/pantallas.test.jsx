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
  it("muestra el saldo, el estado, el contador del stand y Cerrar stand; el obturador mide 72", () => {
    const onDisparar = vi.fn(), onCerrarStand = vi.fn();
    con(<Visor videoRef={{ current: null }} modo="product" feria="🇨🇳 Cantón" itemsCount={3} saldo={12} estadoSync="sincronizando" pendientesSync={2} onDisparar={onDisparar} onCerrarStand={onCerrarStand} />);
    expect(screen.getByText("12 de 15 escaneos de prueba")).toBeTruthy();
    expect(screen.getByText("Sincronizando 2")).toBeTruthy();
    expect(screen.getByLabelText("3 en este stand")).toBeTruthy();
    const obturador = screen.getByRole("button", { name: "Sacar foto" });
    expect(obturador.style.width).toBe("72px");
    fireEvent.click(obturador);
    expect(onDisparar).toHaveBeenCalled();
    fireEvent.click(screen.getByText("Cerrar stand"));
    expect(onCerrarStand).toHaveBeenCalled();
  });
  it("en cero muestra cuántas fotos esperan y en naranja", () => {
    con(<Visor videoRef={{ current: null }} saldo={0} esperando={2} />);
    expect(screen.getByText("0 escaneos · 2 esperando")).toBeTruthy();
  });
  it("con la última captura ofrece '+ ángulo' y abre las últimas fotos para borrar", () => {
    const onAgregarAngulo = vi.fn(), onBorrarFoto = vi.fn();
    con(<Visor videoRef={{ current: null }} itemsCount={1} ultimaCaptura={FOTO} ultimas={[{ id: 7, foto: FOTO }]} puedeAgregarAngulo onAgregarAngulo={onAgregarAngulo} onBorrarFoto={onBorrarFoto} />);
    fireEvent.click(screen.getByText("+ ángulo"));
    expect(onAgregarAngulo).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Últimas fotos" }));
    fireEvent.click(screen.getByText("Borrar"));
    expect(onBorrarFoto).toHaveBeenCalledWith(7);
  });
  it("en modo tarjeta guía el encuadre y ofrece Sin tarjeta", () => {
    const onCancelar = vi.fn();
    con(<Visor videoRef={{ current: null }} modo="card" onCancelar={onCancelar} />);
    expect(screen.getByText("Encuadrá la tarjeta y tocá el obturador")).toBeTruthy();
    fireEvent.click(screen.getByText("Sin tarjeta"));
    expect(onCancelar).toHaveBeenCalled();
  });
  it("el consejo aparece una vez y se marca visto al tocarlo; el teclado ampliado tiene los cuatro datos y la estrella", () => {
    const onConsejoVisto = vi.fn(), onTecla = vi.fn(), onConfirmar = vi.fn(), onCampo = vi.fn(), onFavorito = vi.fn();
    con(<Visor videoRef={{ current: null }} consejoVisible onConsejoVisto={onConsejoVisto} datos={{ id: 1, campo: "price", valores: { price: "0.85" }, moqBase: null, favorito: false, tocado: false }} onTeclaPrecio={onTecla} onConfirmarPrecio={onConfirmar} onCampo={onCampo} onFavorito={onFavorito} />);
    fireEvent.click(screen.getByRole("status"));
    expect(onConsejoVisto).toHaveBeenCalled();
    expect(screen.getByText("USD 0.85")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "5" }));
    expect(onTecla).toHaveBeenCalledWith("5");
    fireEvent.click(screen.getByRole("tab", { name: "MOQ" }));
    expect(onCampo).toHaveBeenCalledWith("moq");
    fireEvent.click(screen.getByRole("button", { name: "Marcar como favorito" }));
    expect(onFavorito).toHaveBeenCalled();
    expect(screen.getByText("¿A cuánto estaba?")).toBeTruthy(); // dice qué pide
    fireEvent.click(screen.getByText("Guardar")); // hay un precio cargado: el botón grande guarda y cierra
    expect(onConfirmar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Cerrar" })).toBeNull(); // sin equis
  });
  it("en MOQ aparece la base por producto / caja / pedido y los datos cargados se ven con tilde", () => {
    const onMoqBase = vi.fn();
    con(<Visor videoRef={{ current: null }} datos={{ id: 1, campo: "moq", valores: { price: "0.85", moq: "500" }, moqBase: "caja", favorito: true, tocado: true }} onMoqBase={onMoqBase} />);
    expect(screen.getByRole("radio", { name: "por caja", checked: true })).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "por pedido" }));
    expect(onMoqBase).toHaveBeenCalledWith("pedido");
    expect(screen.getByRole("tab", { name: "✓ Precio" })).toBeTruthy(); // lo cargado se ve con tilde
    expect(screen.getByRole("tab", { name: "MOQ", selected: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Quitar de favoritos" })).toBeTruthy();
  });
});

describe("Visor · teclado vacío", () => {
  it("sin nada cargado el botón grande dice que cierra, y es lo último de la tarjeta", () => {
    const onConfirmar = vi.fn();
    con(<Visor videoRef={{ current: null }} datos={{ id: 1, campo: "price", valores: {}, moqBase: null, favorito: false, tocado: false }} onConfirmarPrecio={onConfirmar} />);
    const boton = screen.getByText("Cerrar sin cargar nada");
    expect(boton.closest("[role=dialog]").lastElementChild).toBe(boton.closest("button"));
    fireEvent.click(boton);
    expect(onConfirmar).toHaveBeenCalled();
  });
});

describe("CerrarStand", () => {
  const proveedor = { name: "Yiwu Sunrise", contact: "Lily Chen", phone: "", email: "", wechat: "sunrise_lily", whatsapp: "", website: "", address: "", products: "", notes: "", favorito: false };
  it("muestra la tarjeta, los campos con dato y 'Agregar ›' en los vacíos, el favorito y Listo", () => {
    const onListo = vi.fn(), onCambiar = vi.fn();
    con(<CerrarStand itemsCount={2} items={[{ id: 1, photos: [FOTO], price: "0.85" }, { id: 2, photos: [FOTO, FOTO] }]} cardPhoto={FOTO} proveedor={proveedor} onCambiarProveedor={onCambiar} onListo={onListo} />);
    expect(screen.getByText("2 productos en este stand")).toBeTruthy();
    expect(screen.getByText("Yiwu Sunrise")).toBeTruthy(); // el nombre, grande y arriba
    expect(screen.getByText("Lily Chen")).toBeTruthy();    // el vendedor, debajo
    expect(screen.getByText("sunrise_lily")).toBeTruthy(); // el único dato de contacto con valor
    expect(screen.queryByText("Web")).toBeNull();          // lo vacío no ocupa lugar…
    fireEvent.click(screen.getByText("Agregar un dato"));  // …hasta que se pide
    expect(screen.getByText("Web")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Marcar como favorito" }));
    expect(onCambiar).toHaveBeenCalledWith({ favorito: true });
    fireEvent.click(screen.getByText("Listo"));
    expect(onListo).toHaveBeenCalled();
  });
  it("sin tarjeta ofrece sacarla; los productos se pueden sacar del stand", () => {
    const onSacarTarjeta = vi.fn(), onSacarProducto = vi.fn();
    con(<CerrarStand itemsCount={1} items={[{ id: 9, photos: [FOTO] }]} proveedor={proveedor} onSacarTarjeta={onSacarTarjeta} onSacarProducto={onSacarProducto} />);
    fireEvent.click(screen.getByText("Sacar la tarjeta"));
    expect(onSacarTarjeta).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Sacar del stand" }));
    expect(onSacarProducto).toHaveBeenCalledWith(9);
  });
  it("tras la tarjeta: una sola pantalla con lo leído, favorito, mínimo, comentarios, Editar y Listo (wireframe)", () => {
    const onListo = vi.fn(), onEditar = vi.fn(), onCambiar = vi.fn();
    con(<CerrarStand modo="resumen" itemsCount={1} items={[{ id: 1, photos: [FOTO] }]} cardPhoto={FOTO} proveedor={proveedor} stand="10.2 F21" onCambiarProveedor={onCambiar} onListo={onListo} onEditar={onEditar} />);
    expect(screen.getByText("Yiwu Sunrise")).toBeTruthy();
    expect(screen.getByText("Lily Chen")).toBeTruthy(); // el vendedor, grande
    expect(screen.getByText("sunrise_lily")).toBeTruthy();
    expect(screen.getByText("10.2 F21")).toBeTruthy();
    expect(screen.queryByText("Agregar un dato")).toBeNull(); // nada de formulario
    fireEvent.click(screen.getByRole("button", { name: "Marcar como favorito" }));
    expect(onCambiar).toHaveBeenCalledWith({ favorito: true });
    fireEvent.click(screen.getByText("Editar"));
    expect(onEditar).toHaveBeenCalled();
    fireEvent.click(screen.getByText("Listo"));
    expect(onListo).toHaveBeenCalled();
  });
  it("con un borrador pendiente ofrece retomar o descartar", () => {
    const onRetomar = vi.fn();
    con(<CerrarStand proveedor={proveedor} borrador={{}} descripcionBorrador={{ que: "3 productos", hace: "hace 2 horas" }} onRetomar={onRetomar} />);
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByText("Quedó 3 productos, hace 2 horas. La app se cerró antes de cerrar el stand.")).toBeTruthy();
    fireEvent.click(screen.getByText("Retomar"));
    expect(onRetomar).toHaveBeenCalled();
  });
  it("en modo solo proveedor el botón dice Guardar proveedor y no muestra productos", () => {
    con(<CerrarStand soloProveedor proveedor={proveedor} />);
    expect(screen.getByText("Guardar proveedor")).toBeTruthy();
    expect(screen.queryByText(/de este stand/)).toBeNull();
  });
});

// Stand abierto (decisión de Nati, 21/09): la cámara es la casa; el stand vive arriba como pastilla.
describe("Visor · stand abierto", () => {
  it("sin nada dice 'Stand nuevo', ofrece Tarjeta y Nuevo stand; la pastilla abre el stand", () => {
    const onStand = vi.fn(), onTarjeta = vi.fn(), onNuevoStand = vi.fn(), onCerrarStand = vi.fn();
    con(<Visor videoRef={{ current: null }} modo="product" itemsCount={0} standAbierto={{ nombre: "", fotos: 0, tieneTarjeta: false, leyendo: false }} onStand={onStand} onTarjeta={onTarjeta} onNuevoStand={onNuevoStand} onCerrarStand={onCerrarStand} />);
    fireEvent.click(screen.getByText("Stand nuevo"));
    expect(onStand).toHaveBeenCalled();
    fireEvent.click(screen.getByText("Tarjeta"));
    expect(onTarjeta).toHaveBeenCalled();
    expect(screen.queryByText("Cerrar stand")).toBeNull();
    fireEvent.click(screen.getByText("Nuevo stand"));
    expect(onNuevoStand).toHaveBeenCalled();
    expect(onCerrarStand).not.toHaveBeenCalled();
  });
  it("con fotos y sin tarjeta cuenta; con la tarjeta leída muestra la empresa y 'Tarjeta lista'", () => {
    const { unmount } = con(<Visor videoRef={{ current: null }} modo="product" itemsCount={3} standAbierto={{ nombre: "", fotos: 3, tieneTarjeta: false, leyendo: false }} />);
    expect(screen.getByText("Stand sin tarjeta · 3 fotos")).toBeTruthy();
    unmount();
    con(<Visor videoRef={{ current: null }} modo="product" itemsCount={3} standAbierto={{ nombre: "Yiwu Best Toys", fotos: 3, tieneTarjeta: true, leyendo: false }} />);
    expect(screen.getByText("Yiwu Best Toys · 3 fotos")).toBeTruthy();
    expect(screen.getByText("Tarjeta lista")).toBeTruthy();
  });
  it("mientras lee la tarjeta lo dice; en modo tarjeta no ofrece 'Sin tarjeta' (se vuelve con el obturador)", () => {
    const { unmount } = con(<Visor videoRef={{ current: null }} modo="product" itemsCount={1} standAbierto={{ nombre: "", fotos: 1, tieneTarjeta: true, leyendo: true }} />);
    expect(screen.getByText("Leyendo la tarjeta… · 1 foto")).toBeTruthy();
    unmount();
    con(<Visor videoRef={{ current: null }} modo="card" standAbierto={{ nombre: "", fotos: 1, tieneTarjeta: false, leyendo: false }} />);
    expect(screen.getByText("Encuadrá la tarjeta y tocá el obturador")).toBeTruthy();
    expect(screen.queryByText("Sin tarjeta")).toBeNull();
    expect(screen.queryByText("Stand sin tarjeta · 1 foto")).toBeNull();
  });
});

describe("CerrarStand · stand abierto", () => {
  it("se titula Stand, no muestra Listo y vuelve a la cámara con 'Seguir sacando fotos'", () => {
    const onVolverAlVisor = vi.fn(), onListo = vi.fn();
    const proveedor = { name: "Yiwu Best Toys", contact: "", phone: "", email: "", wechat: "", whatsapp: "", website: "", address: "", products: "", notes: "", favorito: false, minimoDeCompra: null };
    con(<CerrarStand abierto modo="resumen" itemsCount={2} items={[{ id: 1, photos: [FOTO] }, { id: 2, photos: [FOTO] }]} cardPhoto={FOTO} proveedor={proveedor} onCambiarProveedor={vi.fn()} onVolverAlVisor={onVolverAlVisor} onListo={onListo} />);
    expect(screen.getByText("Stand")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Listo$/ })).toBeNull();
    fireEvent.click(screen.getByText("Seguir sacando fotos"));
    expect(onVolverAlVisor).toHaveBeenCalled();
    expect(onListo).not.toHaveBeenCalled();
  });
});
