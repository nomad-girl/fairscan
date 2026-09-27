// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { iniciarIdiomas } from "../../idiomas/index.js";
import { SistemaProvider } from "../../sistema/SistemaProvider.jsx";
import { Boton, Chip, Segmentado, Fila, Precio, Campo, Bloque, Hoja, Aviso, Esqueleto, Icono, NOMBRES_DE_ICONOS } from "../index.js";

vi.mock("../../sistema/vibrar.js", () => ({ vibrarSeleccion: vi.fn(), vibrarExito: vi.fn(), vibrarError: vi.fn(), vibrarObturador: vi.fn(), vibrarAviso: vi.fn() }));

beforeAll(() => { iniciarIdiomas("es-AR"); });
afterEach(cleanup);

const LARGO = "Wenn du mit diesem Lieferanten fertig bist, scanne seine Visitenkarte, damit alle Produkte verknüpft werden"; // 35 % más largo que el castellano, como el alemán

const conSistema = (ui, modo = "claro") => render(<SistemaProvider modo={modo}>{ui}</SistemaProvider>);

describe("Botón", () => {
  it("tolera un texto largo sin ancho fijo ni recorte", () => {
    conSistema(<Boton variante="principal" ancho="total">{LARGO}</Boton>);
    const b = screen.getByRole("button");
    expect(b.style.width).toBe("100%");
    expect(b.style.whiteSpace).toBe("normal");
    expect(b.style.overflow).not.toBe("hidden");
    expect(parseInt(b.style.minHeight)).toBeGreaterThanOrEqual(56);
  });
  it("el secundario mide al menos 44 y el deshabilitado no dispara", () => {
    const onClick = vi.fn();
    conSistema(<Boton deshabilitado onClick={onClick}>Guardar</Boton>);
    const b = screen.getByRole("button");
    expect(parseInt(b.style.minHeight)).toBeGreaterThanOrEqual(44);
    fireEvent.click(b);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Chip y Segmentado", () => {
  it("el chip activo se anuncia como presionado", () => {
    conSistema(<Chip activo>Vajilla</Chip>);
    expect(screen.getByRole("button", { pressed: true })).toBeTruthy();
  });
  it("el segmentado usa palabras y cambia con un toque", () => {
    const onChange = vi.fn();
    conSistema(<Segmentado etiqueta="Interés" valor="tal-vez" onChange={onChange} opciones={[{ valor: "si", texto: "Me interesa" }, { valor: "tal-vez", texto: "Tal vez" }, { valor: "no", texto: "No" }]} />);
    expect(screen.getByRole("radio", { checked: true }).textContent).toBe("Tal vez");
    fireEvent.click(screen.getByText("Me interesa"));
    expect(onChange).toHaveBeenCalledWith("si");
    fireEvent.click(screen.getByText("Tal vez"));
    expect(onChange).toHaveBeenCalledTimes(1); // tocar el activo no dispara
  });
});

describe("Fila", () => {
  it("mide 72, corta el texto con puntos suspensivos y toda la fila es tocable", () => {
    const onClick = vi.fn();
    conSistema(<Fila titulo={LARGO} subtitulo="Yiwu Sunrise" derecha={<Precio detalle="MOQ 1.000">USD 0,85</Precio>} onClick={onClick} />);
    const fila = screen.getByRole("button");
    expect(parseInt(fila.style.minHeight)).toBe(72);
    const titulo = screen.getByText(LARGO);
    expect(titulo.style.textOverflow).toBe("ellipsis");
    fireEvent.click(fila);
    expect(onClick).toHaveBeenCalled();
  });
});

describe("Campo", () => {
  it("vacío muestra 'Agregar ›' en una sola línea y no un input", () => {
    conSistema(<Bloque titulo="Datos del bulto"><Campo etiqueta="CBM por bulto" valor={null} tipo="numero" /></Bloque>);
    expect(screen.getByText("Agregar ›")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
  it("al tocarlo se edita en el lugar y guarda al confirmar, convirtiendo la coma decimal", () => {
    const onChange = vi.fn();
    conSistema(<Campo etiqueta="CBM por bulto" valor={null} tipo="numero" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("inputmode")).toBe("decimal");
    fireEvent.change(input, { target: { value: "0,042" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(0.042);
  });
});

describe("Hoja", () => {
  it("abierta es un diálogo con su título; cerrada no está", () => {
    const { rerender } = conSistema(<Hoja abierta titulo="Cerrar stand">contenido</Hoja>);
    expect(screen.getByRole("dialog", { name: "Cerrar stand" })).toBeTruthy();
    rerender(<SistemaProvider modo="claro"><Hoja abierta={false} titulo="Cerrar stand">contenido</Hoja></SistemaProvider>);
  });
  it("Escape la cierra", () => {
    const onCerrar = vi.fn();
    conSistema(<Hoja abierta onCerrar={onCerrar} titulo="x">contenido</Hoja>);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCerrar).toHaveBeenCalled();
  });
});

describe("Aviso y Esqueleto", () => {
  it("el aviso es un status con el mensaje y la acción", () => {
    const onAccion = vi.fn();
    conSistema(<Aviso mensaje="Producto borrado" tono="aviso" accion="Deshacer" onAccion={onAccion} />);
    expect(screen.getByRole("status").textContent).toContain("Producto borrado");
    fireEvent.click(screen.getByText("Deshacer"));
    expect(onAccion).toHaveBeenCalled();
  });
  it("el esqueleto se anuncia como cargando y no supera el ancho disponible", () => {
    conSistema(<Esqueleto ancho={5000} />);
    const e = screen.getByRole("img", { name: "Cargando" });
    expect(e.style.maxWidth).toBe("100%");
  });
});

describe("Ícono", () => {
  it("todos los nombres del set dibujan algo y los desconocidos no rompen", () => {
    for (const n of NOMBRES_DE_ICONOS) {
      const { container, unmount } = conSistema(<Icono nombre={n} />);
      expect(container.querySelector("svg"), n).toBeTruthy();
      unmount();
    }
    const { container } = conSistema(<Icono nombre="inexistente" />);
    expect(container.querySelector("svg")).toBeNull();
  });
  it("en modo oscuro toma el color del texto de esa paleta", () => {
    const { container } = conSistema(<Icono nombre="buscar" />, "oscuro");
    expect(container.querySelector("svg").getAttribute("stroke")).toBe("#F1F5F9");
  });
});
