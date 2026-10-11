import { fechaLarga } from "./contrato";
import type { DocSeed } from "./render";

// ── Procedimientos internos de la agencia (ficticios) ─────────────────────────────────────────────
export function procedimientoFianzas(): DocSeed {
  return {
    clave: "proc-fianzas",
    titulo: "Procedimiento interno · Gestión de fianzas y depósitos",
    tipo: "procedimiento_interno",
    fecha: "2025-02-10",
    secciones: [
      {
        encabezado: "1. OBJETO",
        parrafos: ["Este procedimiento describe cómo la agencia recibe, custodia, deposita y devuelve las fianzas de los contratos de arrendamiento que gestiona."],
      },
      {
        encabezado: "2. RECEPCIÓN DE LA FIANZA",
        parrafos: [
          "La fianza se cobra por transferencia a la cuenta de clientes de la agencia antes de la entrega de llaves. No se entregan llaves sin justificante de pago de la fianza y de la primera mensualidad.",
          "La fianza legal es de una mensualidad en vivienda y de dos mensualidades en uso distinto de vivienda. La agencia no formaliza contratos de vivienda habitual con fianzas superiores a una mensualidad ni con garantías adicionales superiores a dos mensualidades.",
        ],
      },
      {
        encabezado: "3. DEPÓSITO EN EL ORGANISMO AUTONÓMICO",
        parrafos: [
          "En el plazo máximo de treinta días desde la firma, el departamento administrativo deposita la fianza en el organismo competente de la Comunidad de Madrid y registra la fecha de depósito en la ficha del contrato. Las fianzas pendientes de depósito aparecen como alerta en el panel de gestión.",
        ],
      },
      {
        encabezado: "4. DEVOLUCIÓN",
        parrafos: [
          "Al finalizar el contrato se realiza la visita de salida y se compara el inventario con el de entrada. La fianza se devuelve en el plazo máximo de un mes desde la entrega de llaves, descontando únicamente los daños acreditados con fotografías y presupuesto, y los suministros pendientes de pago.",
          "El desgaste por el uso ordinario no es descontable de la fianza.",
        ],
      },
    ],
  };
}

export function procedimientoEntradaSalida(): DocSeed {
  return {
    clave: "proc-entrada-salida",
    titulo: "Procedimiento interno · Entrada y salida de inquilinos",
    tipo: "procedimiento_interno",
    fecha: "2025-02-10",
    secciones: [
      {
        encabezado: "1. VISITA DE ENTRADA",
        parrafos: [
          "El día de la entrega de llaves el agente y el inquilino recorren la propiedad con el inventario. Se fotografían el estado de paredes, suelos, electrodomésticos y contadores, y ambos firman el acta de entrada.",
          "Se anotan las lecturas iniciales de agua, luz y gas, y se entrega al inquilino una copia de las normas de convivencia del edificio.",
        ],
      },
      {
        encabezado: "2. ALTA DE SUMINISTROS",
        parrafos: ["Si el contrato pone los suministros a cargo del inquilino, este dispone de cinco días para cambiar la titularidad. La agencia verifica el cambio antes de dar por cerrada la entrada."],
      },
      {
        encabezado: "3. VISITA DE SALIDA",
        parrafos: [
          "El inquilino comunica su salida con el preaviso pactado. Se programa la visita de salida en los últimos días del contrato y se levanta acta comparando con el inventario de entrada.",
          "Si hay daños, el agente emite un informe con fotografías y un presupuesto de reparación. El propietario decide si reclama su importe con cargo a la fianza.",
        ],
      },
    ],
  };
}

export function procedimientoIncidencias(): DocSeed {
  return {
    clave: "proc-incidencias",
    titulo: "Procedimiento interno · Gestión de incidencias y urgencias",
    tipo: "procedimiento_interno",
    fecha: "2025-03-01",
    secciones: [
      {
        encabezado: "1. CLASIFICACIÓN",
        parrafos: [
          "Toda incidencia se registra con categoría y prioridad. Urgente: riesgo para personas o daños graves en curso (fuga de gas, inundación, avería eléctrica peligrosa, ascensor con personas atrapadas). Alta: falta de servicios básicos (calefacción en invierno, agua caliente, cerradura de entrada). Media: avería que afecta al confort. Baja: mejoras y pequeños desperfectos.",
        ],
      },
      {
        encabezado: "2. TIEMPOS DE RESPUESTA",
        parrafos: [
          "Las incidencias urgentes se atienden en un máximo de 4 horas, las altas en 24 horas, las medias en 3 días laborables y las bajas en 10 días laborables.",
          "Las reparaciones necesarias para conservar la habitabilidad corren a cargo del propietario. Las pequeñas reparaciones por desgaste del uso ordinario corren a cargo del inquilino. Las averías superiores a 300 euros requieren autorización previa del propietario, salvo urgencia.",
        ],
      },
      {
        encabezado: "3. PROVEEDORES",
        parrafos: ["Se solicita presupuesto a un proveedor homologado de la categoría. En obras superiores a 1.500 euros se piden dos presupuestos. Tras el trabajo se registra el coste y se cierra la incidencia con la conformidad del inquilino."],
      },
    ],
  };
}

// ── Normativa (resúmenes internos, no oficiales) ──────────────────────────────────────────────────
const AVISO = "Resumen interno con fines orientativos. No es el texto oficial ni constituye asesoramiento jurídico: consulte siempre la redacción vigente en el BOE.";

export function guiaLau(): DocSeed {
  return {
    clave: "legal-lau",
    titulo: "Guía interna · Ley de Arrendamientos Urbanos (LAU), resumen orientativo",
    tipo: "legal",
    fecha: "2025-06-01",
    secciones: [
      { parrafos: [AVISO] },
      {
        encabezado: "ARTÍCULO 9.- DURACIÓN Y PRÓRROGA OBLIGATORIA",
        parrafos: [
          "La duración del arrendamiento de vivienda es libremente pactada. Si es inferior a cinco años (siete si el arrendador es persona jurídica), el contrato se prorroga obligatoriamente por plazos anuales hasta alcanzar esa duración mínima, salvo que el arrendatario comunique su voluntad de no renovar con al menos treinta días de antelación.",
        ],
      },
      {
        encabezado: "ARTÍCULO 10.- PRÓRROGA TÁCITA",
        parrafos: [
          "Llegada la fecha de vencimiento del contrato tras cumplirse la duración mínima, si ninguna parte notifica a la otra su voluntad de no renovarlo, el contrato se prorroga por plazos anuales hasta un máximo de tres años más. El arrendador debe avisar con al menos cuatro meses de antelación y el arrendatario con al menos dos meses.",
        ],
      },
      {
        encabezado: "ARTÍCULO 11.- DESISTIMIENTO DEL ARRENDATARIO",
        parrafos: [
          "Transcurridos al menos seis meses, el arrendatario puede desistir del contrato comunicándolo al arrendador con treinta días de antelación. Puede pactarse que indemnice con una mensualidad de renta por cada año que reste de contrato, en proporción para los períodos inferiores al año.",
        ],
      },
      {
        encabezado: "ARTÍCULO 17.- RENTA",
        parrafos: ["La renta es la que libremente estipulen las partes y se pagará en los plazos pactados. El pago se realiza en euros, siendo válido el abono por transferencia bancaria."],
      },
      {
        encabezado: "ARTÍCULO 18.- ACTUALIZACIÓN DE LA RENTA",
        parrafos: [
          "Durante los primeros años la renta solo puede actualizarse cada año en la fecha de aniversario y conforme a lo pactado. A falta de pacto expreso no hay actualización. La Ley 12/2023 sustituye el IPC por un índice de referencia del arrendamiento de vivienda, por lo que conviene comprobar el índice aplicable en la fecha de cada actualización.",
        ],
      },
      {
        encabezado: "ARTÍCULO 20.- GASTOS GENERALES Y DE GESTIÓN",
        parrafos: [
          "Pueden pactarse los gastos generales y de servicios individualizados a cargo del arrendatario. Los gastos de gestión inmobiliaria y de formalización del contrato son a cargo del arrendador, sin que puedan repercutirse al arrendatario en los contratos de vivienda.",
        ],
      },
      {
        encabezado: "ARTÍCULO 21.- CONSERVACIÓN DE LA VIVIENDA",
        parrafos: [
          "El arrendador debe realizar las reparaciones necesarias para conservar la vivienda en condiciones de habitabilidad. El arrendatario asume las pequeñas reparaciones que exija el desgaste por el uso ordinario.",
        ],
      },
      {
        encabezado: "ARTÍCULO 36.- FIANZA Y GARANTÍAS ADICIONALES",
        parrafos: [
          "A la celebración del contrato es obligatoria la exigencia y prestación de fianza en metálico equivalente a una mensualidad de renta en el arrendamiento de vivienda y a dos mensualidades en el arrendamiento para uso distinto del de vivienda. La fianza debe depositarse en el organismo que designe cada comunidad autónoma.",
          "En los arrendamientos de vivienda de duración pactada inferior a cinco años (siete si el arrendador es persona jurídica), las partes pueden acordar cualquier tipo de garantía adicional, con un máximo de dos mensualidades de renta.",
        ],
      },
      {
        encabezado: "ARRENDAMIENTOS DE TEMPORADA",
        parrafos: [
          "Los arrendamientos de vivienda por temporada se consideran de uso distinto del de vivienda y se rigen por la voluntad de las partes. Deben responder a una causa real de temporalidad (trabajo, estudios, tratamiento médico…); si se utilizan para encubrir un uso como vivienda habitual, pueden ser considerados arrendamientos de vivienda.",
        ],
      },
    ],
  };
}

export function guiaVivienda2023(): DocSeed {
  return {
    clave: "legal-ley-vivienda",
    titulo: "Guía interna · Ley 12/2023 por el derecho a la vivienda, puntos clave para arrendadores",
    tipo: "legal",
    fecha: "2025-06-01",
    secciones: [
      { parrafos: [AVISO] },
      {
        encabezado: "1. GASTOS DE GESTIÓN Y FORMALIZACIÓN",
        parrafos: ["Los gastos de gestión inmobiliaria y de formalización del contrato de arrendamiento de vivienda corren a cargo del arrendador. Las cláusulas que los repercuten al inquilino pueden considerarse nulas."],
      },
      {
        encabezado: "2. ZONAS DE MERCADO RESIDENCIAL TENSIONADO",
        parrafos: [
          "Las comunidades autónomas pueden solicitar la declaración de zona tensionada. En esos ámbitos se aplican límites a la renta de los nuevos contratos y prórrogas extraordinarias. Antes de firmar un contrato debe comprobarse si el municipio está declarado zona tensionada.",
        ],
      },
      {
        encabezado: "3. GRANDES TENEDORES",
        parrafos: ["Se consideran grandes tenedores los propietarios de más de diez inmuebles urbanos de uso residencial. Se les aplican obligaciones específicas de duración mínima y de información."],
      },
      {
        encabezado: "4. ÍNDICE DE ACTUALIZACIÓN",
        parrafos: ["La actualización anual de la renta de vivienda deja de referenciarse al IPC y pasa a un índice de referencia del arrendamiento de vivienda publicado por el INE. Los contratos anteriores mantienen lo pactado hasta su renovación."],
      },
    ],
  };
}

export function guiaFianzasMadrid(): DocSeed {
  return {
    clave: "legal-fianzas-madrid",
    titulo: "Guía interna · Depósito de fianzas de arrendamiento en la Comunidad de Madrid",
    tipo: "legal",
    fecha: "2025-06-01",
    secciones: [
      { parrafos: [AVISO] },
      {
        encabezado: "1. OBLIGACIÓN DE DEPÓSITO",
        parrafos: ["Los arrendadores de vivienda y de uso distinto deben depositar la fianza recibida en el organismo autonómico competente. El depósito acredita el cumplimiento de la obligación legal y permite recuperar la fianza al final del contrato."],
      },
      {
        encabezado: "2. QUÉ SE PRESENTA",
        parrafos: ["Se presenta el contrato de arrendamiento, los datos de las partes, la referencia catastral y el justificante del ingreso. La agencia conserva copia del resguardo de depósito en la ficha del contrato."],
      },
      {
        encabezado: "3. ACTUALIZACIÓN",
        parrafos: ["Las actualizaciones de renta y las prórrogas pueden obligar a completar la fianza, y así se hará si la normativa autonómica lo exige."],
      },
    ],
  };
}

// ── Inventarios y certificados ────────────────────────────────────────────────────────────────────
export function inventarioEntrada(opts: { clave: string; unidadId: number; edificioId?: number; direccion: string; fecha: string; amueblado: boolean; habitaciones: number }): DocSeed {
  const estados = ["muy buen estado", "buen estado", "buen estado", "desgaste normal", "pequeños rayones"];
  const pick = (i: number) => estados[i % estados.length];
  const salon = [
    `Sofá de tres plazas: ${pick(0)}.`,
    `Mesa de comedor y cuatro sillas: ${pick(1)}.`,
    `Televisor de 42 pulgadas y mueble: ${pick(2)}.`,
  ];
  const cocina = [`Nevera-congelador: ${pick(3)}.`, `Placa de inducción y horno: ${pick(1)}.`, `Lavadora: ${pick(4)}.`, `Campana extractora y microondas: ${pick(0)}.`];
  const dormitorios = Array.from({ length: Math.max(1, opts.habitaciones) }, (_, i) => `Dormitorio ${i + 1}: cama con colchón, mesilla y armario empotrado, ${pick(i + 2)}.`);
  return {
    clave: opts.clave,
    titulo: `Inventario de entrada · ${opts.direccion}`,
    tipo: "inventario",
    unidad_id: opts.unidadId,
    edificio_id: opts.edificioId,
    fecha: opts.fecha,
    secciones: [
      { parrafos: [`Acta de entrada de la vivienda en ${opts.direccion}, a ${fechaLarga(opts.fecha)}. ${opts.amueblado ? "La vivienda se entrega amueblada." : "La vivienda se entrega sin mobiliario, con los electrodomésticos indicados."}`] },
      { encabezado: "1. SALÓN", parrafos: opts.amueblado ? salon : ["Salón vacío. Suelo de parquet en buen estado; paredes recién pintadas."] },
      { encabezado: "2. COCINA", parrafos: cocina },
      { encabezado: "3. DORMITORIOS", parrafos: opts.amueblado ? dormitorios : ["Dormitorios vacíos con armarios empotrados en buen estado."] },
      { encabezado: "4. BAÑOS", parrafos: ["Bañera o plato de ducha sin desconchones, sanitarios en buen estado, grifería sin fugas, espejo sin desperfectos."] },
      { encabezado: "5. LECTURAS DE CONTADORES", parrafos: ["Electricidad: 18.240 kWh. Agua: 412 m³. Gas: 1.203 m³. Se adjuntan fotografías firmadas por ambas partes."] },
      { encabezado: "6. LLAVES ENTREGADAS", parrafos: ["Tres juegos de llaves de la vivienda, un mando de garaje si procede y una llave del buzón."] },
    ],
  };
}

export function certificadoEnergetico(opts: { clave: string; unidadId: number; edificioId?: number; direccion: string; letra: string; caducidad: string; superficie: number; catastro: string }): DocSeed {
  const consumo: Record<string, number> = { A: 25, B: 48, C: 75, D: 110, E: 160, F: 230, G: 320 };
  const emision = new Date(opts.caducidad + "T00:00:00Z");
  emision.setUTCFullYear(emision.getUTCFullYear() - 10);
  const fecha = emision.toISOString().slice(0, 10);
  return {
    clave: opts.clave,
    titulo: `Certificado de eficiencia energética · ${opts.direccion}`,
    tipo: "certificado_energetico",
    unidad_id: opts.unidadId,
    edificio_id: opts.edificioId,
    fecha,
    secciones: [
      {
        encabezado: "DATOS DEL INMUEBLE",
        parrafos: [`Dirección: ${opts.direccion}. Referencia catastral: ${opts.catastro}. Superficie útil habitable: ${opts.superficie} m².`],
      },
      {
        encabezado: "CALIFICACIÓN ENERGÉTICA",
        parrafos: [
          `Calificación de eficiencia energética: ${opts.letra}. Consumo de energía primaria no renovable: ${consumo[opts.letra] ?? 100} kWh/m² año.`,
          `Fecha de emisión: ${fechaLarga(fecha)}. Válido hasta: ${fechaLarga(opts.caducidad)}.`,
        ],
      },
      {
        encabezado: "VALIDEZ",
        parrafos: ["El certificado tiene una validez máxima de diez años. Debe renovarse, modificarse o actualizarse cuando así lo exija la normativa o tras una reforma que afecte a la eficiencia energética. Es obligatorio incluir la etiqueta energética en cualquier anuncio de alquiler o venta."],
      },
    ],
  };
}
