import PDFDocument from "pdfkit";

/** Documento sintético: texto estructurado que se renderiza a PDF (con capa de texto) o a un escaneo sin texto. */
export interface DocSeed {
  clave: string;
  titulo: string;
  tipo: "contrato" | "normas_comunidad" | "acta_junta" | "estatutos" | "inventario" | "certificado_energetico" | "legal" | "procedimiento_interno" | "general";
  edificio_id?: number;
  unidad_id?: number;
  contrato_id?: number;
  /** ISO yyyy-mm-dd */
  fecha: string;
  vigente?: boolean;
  /** Clave del documento al que sustituye */
  sustituye?: string;
  secciones: { encabezado?: string; parrafos: string[] }[];
  /** Si es true, el PDF se genera como imagen (sin capa de texto) para probar el OCR. */
  escaneado?: boolean;
  /** Firma final: [ [rol, nombre], … ] */
  firmas?: [string, string][];
}

const MARGEN = 62;

function nuevoPdf(titulo: string) {
  const doc = new PDFDocument({ size: "A4", margin: MARGEN, bufferPages: true, info: { Title: titulo, Author: "Datos ficticios · rag-simple" } });
  const trozos: Buffer[] = [];
  doc.on("data", (t: Buffer) => trozos.push(t));
  const fin = new Promise<Uint8Array>((resolve) => doc.on("end", () => resolve(new Uint8Array(Buffer.concat(trozos)))));
  return { doc, fin };
}

function pieDePagina(doc: PDFKit.PDFDocument, titulo: string) {
  const { count } = doc.bufferedPageRange();
  for (let i = 0; i < count; i++) {
    doc.switchToPage(i);
    const inferior = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // evita que escribir en el pie provoque una página nueva
    doc.font("Helvetica").fontSize(8).fillColor("#666666");
    doc.text(`${titulo}  ·  Página ${i + 1} de ${count}`, MARGEN, doc.page.height - 42, {
      width: doc.page.width - MARGEN * 2,
      align: "center",
      lineBreak: false,
    });
    doc.page.margins.bottom = inferior;
  }
}

export async function renderPdf(d: DocSeed): Promise<Uint8Array> {
  if (d.escaneado) return renderEscaneado(d);

  const { doc, fin } = nuevoPdf(d.titulo);
  doc.font("Helvetica-Bold").fontSize(15).fillColor("#111111").text(d.titulo.toUpperCase(), { align: "center" });
  doc.moveDown(1);

  for (const s of d.secciones) {
    if (s.encabezado) {
      doc.moveDown(0.4).font("Helvetica-Bold").fontSize(11).fillColor("#111111").text(s.encabezado, { align: "left" });
      doc.moveDown(0.25);
    }
    for (const p of s.parrafos) {
      doc.font("Helvetica").fontSize(10).fillColor("#111111").text(p, { align: "justify", lineGap: 2.5 });
      doc.moveDown(0.5);
    }
  }

  if (d.firmas?.length) {
    doc.moveDown(2);
    const y = doc.y;
    const ancho = (doc.page.width - MARGEN * 2) / d.firmas.length;
    d.firmas.forEach(([rol, nombre], i) => {
      doc.font("Helvetica-Bold").fontSize(9).text(rol, MARGEN + i * ancho, y, { width: ancho - 12, align: "center" });
      doc.font("Helvetica").fontSize(9).text("\n\n\n______________________", MARGEN + i * ancho, y + 12, { width: ancho - 12, align: "center" });
      doc.text(nombre, MARGEN + i * ancho, y + 62, { width: ancho - 12, align: "center" });
    });
  }

  pieDePagina(doc, d.titulo);
  doc.end();
  return fin;
}

/** Escaneo simulado: cada página es una imagen (sin texto seleccionable), ligeramente girada y con ruido. */
async function renderEscaneado(d: DocSeed): Promise<Uint8Array> {
  const { createCanvas } = await import("@napi-rs/canvas");
  const W = 1240;
  const H = 1754;
  const paginas: Buffer[] = [];

  const lineas: { texto: string; negrita?: boolean }[] = [{ texto: d.titulo.toUpperCase(), negrita: true }, { texto: "" }];
  for (const s of d.secciones) {
    if (s.encabezado) lineas.push({ texto: s.encabezado, negrita: true });
    for (const p of s.parrafos) {
      lineas.push({ texto: p }, { texto: "" });
    }
  }

  const medida = createCanvas(10, 10).getContext("2d");
  medida.font = "24px Arial";
  const ancho = W - 200;
  const envueltas: { texto: string; negrita?: boolean }[] = [];
  for (const l of lineas) {
    if (!l.texto) {
      envueltas.push(l);
      continue;
    }
    let actual = "";
    for (const palabra of l.texto.split(/\s+/)) {
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (medida.measureText(prueba).width > ancho) {
        envueltas.push({ texto: actual, negrita: l.negrita });
        actual = palabra;
      } else {
        actual = prueba;
      }
    }
    if (actual) envueltas.push({ texto: actual, negrita: l.negrita });
  }

  const porPagina = Math.floor((H - 240) / 36);
  for (let i = 0; i < envueltas.length; i += porPagina) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(((i / porPagina) % 2 === 0 ? 0.35 : -0.25) * (Math.PI / 180)); // escaneo ligeramente torcido
    ctx.translate(-W / 2, -H / 2);
    ctx.fillStyle = "#1c1c1c";
    envueltas.slice(i, i + porPagina).forEach((l, n) => {
      ctx.font = `${l.negrita ? "bold " : ""}24px Arial`;
      ctx.fillText(l.texto, 100, 130 + n * 36);
    });
    ctx.restore();
    // Ruido de escaneo
    for (let k = 0; k < 2500; k++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`;
      ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    }
    paginas.push(canvas.toBuffer("image/jpeg", 70));
  }

  const { doc, fin } = nuevoPdf(d.titulo);
  paginas.forEach((img, i) => {
    if (i > 0) doc.addPage();
    doc.image(img, 0, 0, { width: doc.page.width, height: doc.page.height });
  });
  doc.end();
  return fin;
}

export function renderMarkdown(d: DocSeed): Uint8Array {
  const partes = [`# ${d.titulo}\n`];
  for (const s of d.secciones) {
    if (s.encabezado) partes.push(`\n## ${s.encabezado}\n`);
    partes.push(...s.parrafos.map((p) => `${p}\n`));
  }
  return new TextEncoder().encode(partes.join("\n"));
}
