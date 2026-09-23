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
  it("sin saldo ni nube a la vista; el contador del stand y Terminar; el obturador mide 72", () => {
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
    fireEvent.click(screen.getByText("Terminar"));
    expect(onCerrarStand).toHaveBeenCalled();
  });
  it("en cero muestra cuántas fotos esperan y en naranja", () => {
    con(<Visor videoRef={{ current: null }} saldo={0} esperando={2} />);
    expect(screen.getByText("0 escaneos · 2 esperando")).toBeTruthy();
  });
  it("con la última captura ofrece otra foto del mismo producto y abre las últimas fotos para borrar", () => {
    const onAgregarAngulo = vi.fn(), onBorrarFoto = vi.fn();
    con(<Visor videoRef={{ current: null }} itemsCount={1} ultimaCaptura={FOTO} ultimas={[{ id: 7, foto: FOTO }]} puedeAgregarAngulo onAgregarAngulo={onAgregarAngulo} onBorrarFoto={onBorrarFoto} />);
    fireEvent.click(screen.getByRole("button", { name: "Otra foto del mismo producto" }));
    expect(onAgregarAngulo).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Últimas fotos" }));
    fireEvent.click(screen.getByText("Borrar"));
    expect(onBorrarFoto).toHaveBeenCalledWith(7);
  });
  it("en modo tarjeta guía el encuadre y vuelve a productos; ya no hay 'Sin tarjeta' (la tarjeta se saca cuando aparece)", () => {
    const onVolver = vi.fn();
    con(<Visor videoRef={{ current: null }} modo="card" onVolverAProductos={onVolver} />);
    expect(screen.getByText("Encuadrá la tarjeta y tocá el obturador")).toBeTruthy();
    expect(screen.queryByText("Sin tarjeta")).toBeNull();
    fireEvent.click(screen.getByText("Productos"));
    expect(onVolver).toHaveBeenCalled();
  });
  it("la barra del pulgar: chips a la vista, se escribe con el teclado del sistema y se guarda solo; se cierra con la X, un gesto o la cámara", () => {
    const onConsejoVisto = vi.fn(), onEscribir = vi.fn(), onListo = vi.fn(), onConfirmar = vi.fn(), onCampo = vi.fn(), onFavorito = vi.fn();
    const { rerender } = con(<Visor videoRef={{ current: null }} consejoVisible onConsejoVisto={onConsejoVisto} datos={{ id: 1, campo: "price", valores: {}, moqBase: null, favorito: false, tocado: false, listos: {} }} onEscribirDato={onEscribir} onListoDato={onListo} onConfirmarPrecio={onConfirmar} onCampo={onCampo} onFavorito={onFavorito} />);
    fireEvent.click(screen.getByRole("status"));
    expect(onConsejoVisto).toHaveBeenCalled();
    const campo = screen.getByRole("textbox", { name: "¿A cuánto estaba?" });
    expect(campo.getAttribute("inputmode")).toBe("decimal"); // el teclado del iPhone, no uno propio
    fireEvent.change(campo, { target: { value: "0,85" } });
    expect(onEscribir).toHaveBeenCalledWith("price", "0.85");
    expect(screen.getByRole("tab", { name: "MOQ" })).toBeTruthy(); // los chips siempre a la vista; precio por defecto
    fireEvent.click(screen.getByRole("button", { name: "Marcar como favorito" }));
    expect(onFavorito).toHaveBeenCalled();
    rerender(<SistemaProvider modo="claro"><Visor videoRef={{ current: null }} datos={{ id: 1, campo: "moq", valores: { price: "0.85" }, moqBase: null, favorito: false, tocado: true, listos: {}, pista: true }} onEscribirDato={onEscribir} onListoDato={onListo} onConfirmarPrecio={onConfirmar} onCampo={onCampo} /></SistemaProvider>);
    expect(screen.queryByRole("button", { name: "Listo" })).toBeNull(); // no existe el botón Guardar: se guarda al escribir
    expect(screen.getByRole("tab", { name: "Precio" })).toBeTruthy(); // sin valores ni tildes, solo un puntito
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onConfirmar).toHaveBeenCalledTimes(2); // una por tocar afuera (el consejo, más arriba) y otra por la X
    fireEvent.click(screen.getByRole("tab", { name: "MOQ" }));
    expect(onCampo).toHaveBeenCalledWith("moq");
    expect(screen.queryByText("Cerrar sin cargar nada")).toBeNull(); // sin segundo "cerrar"
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
  it("sin tarjeta la pastilla invita a escanearla y abre la cámara de tarjeta; Terminar abre el stand", () => {
    const onStand = vi.fn(), onTarjeta = vi.fn(), onCerrarStand = vi.fn();
    con(<Visor videoRef={{ current: null }} modo="product" itemsCount={0} standAbierto={{ nombre: "", fotos: 0, tieneTarjeta: false, leyendo: false }} onStand={onStand} onTarjeta={onTarjeta} onCerrarStand={onCerrarStand} />);
    fireEvent.click(screen.getByText("Escanear tarjeta del proveedor"));
    expect(onTarjeta).toHaveBeenCalled();
    expect(screen.queryByText("Tarjeta")).toBeNull();
    fireEvent.click(screen.getByText("Terminar"));
    expect(onStand).toHaveBeenCalled();
    expect(onCerrarStand).not.toHaveBeenCalled();
  });
  it("con fotos y sin tarjeta cuenta las fotos; con la tarjeta leída muestra la empresa y abre el stand", () => {
    const onStand = vi.fn(), onTarjeta = vi.fn();
    const { unmount } = con(<Visor videoRef={{ current: null }} modo="product" itemsCount={3} standAbierto={{ nombre: "", fotos: 3, tieneTarjeta: false, leyendo: false }} onTarjeta={onTarjeta} />);
    fireEvent.click(screen.getByText("Escanear tarjeta · 3 fotos"));
    expect(onTarjeta).toHaveBeenCalled();
    unmount();
    con(<Visor videoRef={{ current: null }} modo="product" itemsCount={3} standAbierto={{ nombre: "Yiwu Best Toys", fotos: 3, tieneTarjeta: true, leyendo: false }} onStand={onStand} />);
    fireEvent.click(screen.getByText("Yiwu Best Toys · 3 fotos"));
    expect(onStand).toHaveBeenCalled();
  });
  it("mientras lee la tarjeta lo dice; si la tarjeta no se leyó lo avisa; en modo tarjeta no ofrece 'Sin tarjeta'", () => {
    const { unmount } = con(<Visor videoRef={{ current: null }} modo="product" itemsCount={1} standAbierto={{ nombre: "", fotos: 1, tieneTarjeta: true, leyendo: true }} />);
    expect(screen.getByText("Leyendo la tarjeta · seguí sacando · 1 foto")).toBeTruthy();
    unmount();
    const r = con(<Visor videoRef={{ current: null }} modo="product" itemsCount={1} standAbierto={{ nombre: "", fotos: 1, tieneTarjeta: true, leyendo: false }} />);
    expect(screen.getByText("Tarjeta sin leer · 1 foto")).toBeTruthy();
    r.unmount();
    con(<Visor videoRef={{ current: null }} modo="card" standAbierto={{ nombre: "", fotos: 1, tieneTarjeta: false, leyendo: false }} />);
    expect(screen.getByText("Encuadrá la tarjeta y tocá el obturador")).toBeTruthy();
    expect(screen.queryByText("Sin tarjeta")).toBeNull();
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
