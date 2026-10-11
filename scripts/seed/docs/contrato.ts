import type { DocSeed } from "./render";

export interface DatosContratoDoc {
  clave: string;
  contratoId?: number;
  contratoRef: string;
  tipo: "vivienda_habitual" | "temporada" | "habitacion" | "local";
  fechaFirma: string;
  inicio: string;
  fin: string;
  renta: number;
  fianza: number;
  garantia: number | null;
  indice: "ninguno" | "ipc" | "irav" | "fijo";
  diaPago: number;
  arrendador: { nombre: string; documento: string; sociedad: boolean };
  inquilino: { nombre: string; apellidos: string; documentoTipo: string; documento: string; email?: string; telefono?: string };
  inmueble: {
    direccion: string;
    municipio: string;
    cp: string;
    tipoUnidad: string;
    planta: string;
    puerta: string;
    superficie: number;
    habitaciones: number;
    referenciaCatastral: string;
    certificado: string | null;
    unidadRef: string;
    amueblado: boolean;
  };
  edificioId?: number;
  unidadId?: number;
  clausulas: {
    mascotas: boolean;
    fumar: boolean;
    subarriendo: boolean;
    suministrosInquilino: boolean;
    gastosGestionInquilino: boolean;
    preavisoMeses: number;
    penalizacionMeses: number;
    seguroHogar: boolean;
  };
  motivoTemporada?: string;
  actividadLocal?: string;
  escaneado?: boolean;
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export function fechaLarga(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}
export const euros = (n: number) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" }).format(n) + " euros";

function meses(desde: string, hasta: string) {
  const a = new Date(desde + "T00:00:00Z");
  const b = new Date(hasta + "T00:00:00Z");
  return Math.round((b.getTime() - a.getTime()) / (30.44 * 86_400_000));
}

const TITULOS: Record<DatosContratoDoc["tipo"], string> = {
  vivienda_habitual: "Contrato de arrendamiento de vivienda",
  temporada: "Contrato de arrendamiento de vivienda por temporada",
  habitacion: "Contrato de arrendamiento de habitación",
  local: "Contrato de arrendamiento de local para uso distinto del de vivienda",
};

const INDICES: Record<string, string> = {
  ninguno: "Las partes acuerdan que la renta no será objeto de actualización durante la vigencia del contrato.",
  ipc: "La renta se actualizará cada año, en la fecha de aniversario del contrato, aplicando la variación porcentual anual del Índice de Precios de Consumo (IPC) publicado por el INE.",
  irav: "La renta se actualizará cada año, en la fecha de aniversario del contrato, conforme al Índice de Referencia del Arrendamiento de Vivienda (IRAV) publicado por el INE.",
  fijo: "La renta se actualizará cada año, en la fecha de aniversario del contrato, en un porcentaje fijo del 2 % sobre la renta vigente.",
};

export function construirContrato(d: DatosContratoDoc): DocSeed {
  const c = d.clausulas;
  const inq = `${d.inquilino.nombre} ${d.inquilino.apellidos}`;
  const dir = `${d.inmueble.direccion}, ${d.inmueble.planta} ${d.inmueble.puerta}`.replace(/\s+-$/, "");
  const inmuebleTexto =
    d.tipo === "habitacion"
      ? `la habitación identificada como ${d.inmueble.puerta} del inmueble sito en ${d.inmueble.direccion}, ${d.inmueble.cp} ${d.inmueble.municipio}, con derecho de uso compartido de las zonas comunes de la vivienda`
      : `el inmueble sito en ${dir}, ${d.inmueble.cp} ${d.inmueble.municipio}, tipo ${d.inmueble.tipoUnidad}, con una superficie de ${d.inmueble.superficie} m²${d.inmueble.habitaciones ? ` y ${d.inmueble.habitaciones} habitaciones` : ""}`;
  const duracion = meses(d.inicio, d.fin);
  const documentoArr = d.arrendador.sociedad ? "con CIF" : "con documento de identidad";
  const secciones: DocSeed["secciones"] = [];

  secciones.push({
    encabezado: "REUNIDOS",
    parrafos: [
      `En Madrid, a ${fechaLarga(d.fechaFirma)}.`,
      `De una parte, ${d.arrendador.nombre}, ${documentoArr} ${d.arrendador.documento}, en adelante EL ARRENDADOR.`,
      `De otra parte, ${inq}, con ${d.inquilino.documentoTipo} ${d.inquilino.documento}${d.inquilino.email ? `, correo electrónico ${d.inquilino.email}` : ""}${d.inquilino.telefono ? ` y teléfono ${d.inquilino.telefono}` : ""}, en adelante EL ARRENDATARIO.`,
    ],
  });

  secciones.push({
    encabezado: "EXPONEN",
    parrafos: [
      `I. Que EL ARRENDADOR es titular del inmueble descrito en la cláusula primera, con referencia catastral ${d.inmueble.referenciaCatastral}${d.inmueble.certificado ? ` y certificado de eficiencia energética con calificación ${d.inmueble.certificado}` : ""}.`,
      `II. Que ambas partes, reconociéndose capacidad legal suficiente, acuerdan formalizar el presente contrato con arreglo a las siguientes cláusulas.`,
    ],
  });

  secciones.push({
    encabezado: "PRIMERA.- OBJETO",
    parrafos: [
      `EL ARRENDADOR cede en arrendamiento a EL ARRENDATARIO ${inmuebleTexto}${d.inmueble.amueblado ? ", que se entrega amueblado y con el equipamiento descrito en el inventario anexo" : ""}. Referencia interna de la propiedad: ${d.inmueble.unidadRef}.`,
      d.tipo === "vivienda_habitual"
        ? "El inmueble se destinará exclusivamente a vivienda habitual de EL ARRENDATARIO, quedando prohibido cualquier otro uso, incluido el alquiler turístico."
        : d.tipo === "temporada"
          ? `El arrendamiento se concierta por la siguiente causa de temporalidad: ${d.motivoTemporada ?? "motivos laborales"}. El inmueble no constituye la vivienda habitual de EL ARRENDATARIO.`
          : d.tipo === "habitacion"
            ? "La habitación se destina exclusivamente a residencia de EL ARRENDATARIO. Las zonas comunes se comparten con el resto de arrendatarios de la vivienda."
            : `El local se destinará a la actividad de ${d.actividadLocal ?? "comercio minorista"}, siendo por cuenta de EL ARRENDATARIO la obtención de licencias y permisos.`,
    ],
  });

  secciones.push({
    encabezado: "SEGUNDA.- DURACIÓN",
    parrafos:
      d.tipo === "vivienda_habitual"
        ? [
            `El contrato tendrá una duración de ${duracion} meses, desde el ${fechaLarga(d.inicio)} hasta el ${fechaLarga(d.fin)}.`,
            "Llegado el vencimiento, si la duración pactada fuera inferior a la mínima legal, el contrato se prorrogará obligatoriamente por plazos anuales conforme a los artículos 9 y 10 de la Ley de Arrendamientos Urbanos (LAU), salvo que EL ARRENDATARIO comunique su voluntad de no renovar con al menos treinta días de antelación.",
          ]
        : [`El contrato tendrá una duración de ${duracion} meses, desde el ${fechaLarga(d.inicio)} hasta el ${fechaLarga(d.fin)}, sin prórroga automática. Cualquier ampliación deberá pactarse por escrito.`],
  });

  secciones.push({
    encabezado: "TERCERA.- RENTA",
    parrafos: [
      `La renta mensual se fija en ${euros(d.renta)}, que EL ARRENDATARIO abonará por mensualidades anticipadas dentro de los primeros ${d.diaPago === 1 ? "días" : `${d.diaPago} días`} de cada mes, mediante transferencia bancaria a la cuenta que EL ARRENDADOR designe. El día de vencimiento de cada recibo es el ${d.diaPago} de cada mes.`,
    ],
  });

  secciones.push({ encabezado: "CUARTA.- ACTUALIZACIÓN DE LA RENTA", parrafos: [INDICES[d.indice]] });

  secciones.push({
    encabezado: "QUINTA.- FIANZA",
    parrafos: [
      `A la firma del contrato EL ARRENDATARIO entrega en concepto de fianza la cantidad de ${euros(d.fianza)}, equivalente a ${Math.round((d.fianza / d.renta) * 10) / 10} mensualidad(es) de renta. EL ARRENDADOR se obliga a depositarla en el organismo autonómico competente de la Comunidad de Madrid en el plazo legalmente establecido.`,
    ],
  });

  if (d.garantia) {
    secciones.push({
      encabezado: "SEXTA.- GARANTÍA ADICIONAL",
      parrafos: [
        `Además de la fianza, EL ARRENDATARIO presta una garantía adicional por importe de ${euros(d.garantia)}, equivalente a ${Math.round((d.garantia / d.renta) * 10) / 10} mensualidades de renta, mediante aval bancario o depósito, que responderá del cumplimiento de sus obligaciones.`,
      ],
    });
  }

  const gastos: string[] = [
    c.suministrosInquilino
      ? "Los suministros de agua, electricidad, gas, telecomunicaciones y demás servicios individualizados serán de cuenta de EL ARRENDATARIO, que deberá dar de alta los contratos a su nombre."
      : "Los suministros están incluidos en la renta hasta un límite razonable de consumo; el exceso será repercutido a EL ARRENDATARIO.",
    "Los gastos de comunidad de propietarios y el Impuesto sobre Bienes Inmuebles (IBI) serán de cuenta de EL ARRENDADOR, salvo pacto expreso en contrario.",
  ];
  if (c.gastosGestionInquilino) {
    gastos.push(
      "Los gastos de gestión inmobiliaria y de formalización del presente contrato, por importe equivalente a una mensualidad de renta, serán a cargo de EL ARRENDATARIO, que los abona en este acto."
    );
  } else {
    gastos.push("Los gastos de gestión inmobiliaria y de formalización del contrato serán a cargo de EL ARRENDADOR.");
  }
  secciones.push({ encabezado: "SÉPTIMA.- GASTOS Y SUMINISTROS", parrafos: gastos });

  secciones.push({
    encabezado: "OCTAVA.- USO Y CONSERVACIÓN",
    parrafos: [
      "EL ARRENDATARIO se obliga a usar el inmueble con la diligencia debida, a comunicar a EL ARRENDADOR cualquier avería o desperfecto y a realizar las pequeñas reparaciones que exija el desgaste por el uso ordinario. Las reparaciones necesarias para conservar el inmueble en condiciones de habitabilidad serán de cuenta de EL ARRENDADOR.",
      c.fumar ? "Se permite fumar en el interior del inmueble." : "Queda prohibido fumar en el interior del inmueble.",
    ],
  });

  secciones.push({
    encabezado: "NOVENA.- MASCOTAS",
    parrafos: [
      c.mascotas
        ? "Se autoriza la tenencia de animales de compañía, siendo EL ARRENDATARIO responsable de los daños y molestias que pudieran causar y del cumplimiento de la normativa de la comunidad de propietarios."
        : "No se permite la tenencia de animales de compañía en el inmueble sin la autorización previa y por escrito de EL ARRENDADOR.",
    ],
  });

  secciones.push({
    encabezado: "DÉCIMA.- SUBARRIENDO Y CESIÓN",
    parrafos: [
      c.subarriendo
        ? "EL ARRENDATARIO podrá subarrendar parcialmente el inmueble con el consentimiento escrito de EL ARRENDADOR."
        : "Queda prohibido el subarriendo, total o parcial, y la cesión del contrato sin el consentimiento expreso y por escrito de EL ARRENDADOR.",
    ],
  });

  secciones.push({
    encabezado: "UNDÉCIMA.- OBRAS",
    parrafos: ["EL ARRENDATARIO no podrá realizar obras que modifiquen la configuración del inmueble sin el consentimiento escrito de EL ARRENDADOR. EL ARRENDATARIO deberá soportar las obras de conservación necesarias."],
  });

  secciones.push({
    encabezado: "DUODÉCIMA.- DESISTIMIENTO",
    parrafos: [
      `Transcurridos al menos seis meses, EL ARRENDATARIO podrá desistir del contrato comunicándolo con ${c.preavisoMeses} mes(es) de antelación. ${c.penalizacionMeses ? `Si desiste antes del vencimiento pactado, indemnizará a EL ARRENDADOR con ${c.penalizacionMeses} mensualidad(es) de renta.` : "No se pacta indemnización por desistimiento."}`,
    ],
  });

  secciones.push({
    encabezado: "DECIMOTERCERA.- COMUNIDAD DE PROPIETARIOS",
    parrafos: [
      "EL ARRENDATARIO declara conocer y se obliga a cumplir las normas de convivencia y el reglamento de régimen interior de la comunidad de propietarios del edificio, que prevalecen en lo relativo al uso de elementos comunes, horarios de silencio y régimen de obras.",
      c.seguroHogar ? "EL ARRENDATARIO deberá contratar y mantener durante la vigencia del contrato un seguro de responsabilidad civil del hogar." : "",
    ].filter(Boolean),
  });

  secciones.push({
    encabezado: "DECIMOCUARTA.- PROTECCIÓN DE DATOS",
    parrafos: ["Los datos personales de las partes se tratarán conforme al Reglamento General de Protección de Datos para la gestión del presente contrato. Podrán ejercerse los derechos de acceso, rectificación y supresión ante EL ARRENDADOR o la agencia gestora."],
  });

  secciones.push({
    encabezado: "DECIMOQUINTA.- JURISDICCIÓN",
    parrafos: ["Para cuantas cuestiones se deriven del presente contrato, las partes se someten a los Juzgados y Tribunales de Madrid, y firman por duplicado en el lugar y fecha indicados. Referencia del contrato: " + d.contratoRef + "."],
  });

  return {
    clave: d.clave,
    titulo: `${TITULOS[d.tipo]} · ${d.contratoRef} · ${d.inmueble.direccion}`,
    tipo: "contrato",
    contrato_id: d.contratoId,
    unidad_id: d.unidadId,
    fecha: d.fechaFirma,
    secciones,
    firmas: [
      ["EL ARRENDADOR", d.arrendador.nombre],
      ["EL ARRENDATARIO", inq],
    ],
    escaneado: d.escaneado,
  };
}
