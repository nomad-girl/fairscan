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
  it("en modo tarjeta guía el encuadre y ofrece Cancelar", () => {
    const onCancelar = vi.fn();
    con(<Visor videoRef={{ current: null }} modo="card" onCancelar={onCancelar} />);
    expect(screen.getByText("Encuadrá la tarjeta y tocá el obturador")).toBeTruthy();
    fireEvent.click(screen.getByText("Cancelar"));
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
    expect(screen.getByText("2 productos · la tarjeta va al final")).toBeTruthy();
    expect(screen.getByText("Yiwu Sunrise")).toBeTruthy();
    expect(screen.getAllByText("Agregar ›").length).toBeGreaterThan(3);
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
