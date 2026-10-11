import { fechaLarga } from "./contrato";
import type { DocSeed } from "./render";

export interface PoliticaEdificio {
  mascotas: "libres" | "limitadas" | "prohibidas";
  maxMascotas: number;
  turistico: "prohibido" | "autorizado";
  silencioDesde: string;
  silencioHasta: string;
  obrasHorario: string;
  obrasAgosto: boolean;
  mudanzas: string;
  basuras: string;
  piscinaHorario: string | null;
  garajeMotos: boolean;
  terrazasBarbacoa: boolean;
  cuotaExtra: string;
}

export interface EdificioDoc {
  id: number;
  referencia: string;
  direccion: string;
  municipio: string;
  cp: string;
  anio: number;
  plantas: number;
  ascensor: boolean;
  garaje: boolean;
  piscina: boolean;
  portero: boolean;
  administrador: string;
}

const MASCOTAS_TEXTO: Record<PoliticaEdificio["mascotas"], (p: PoliticaEdificio) => string[]> = {
  libres: () => [
    "Se permite la tenencia de animales domésticos en las viviendas, sin límite de número, siempre que no causen molestias a los vecinos ni riesgo para la salubridad.",
    "Los animales deberán circular por los elementos comunes sujetos con correa. Los propietarios recogerán de inmediato los excrementos de sus animales.",
  ],
  limitadas: (p) => [
    `Se permite la tenencia de animales domésticos con un máximo de ${p.maxMascotas} por vivienda. Los perros clasificados como potencialmente peligrosos requerirán autorización previa de la junta de propietarios.`,
    "Los animales deberán circular por los elementos comunes sujetos con correa y, en el ascensor, en brazos o con bozal cuando proceda. Los propietarios recogerán de inmediato los excrementos.",
  ],
  prohibidas: () => [
    "Queda prohibida la tenencia de animales de compañía en las viviendas y locales del edificio, con la única excepción de los perros de asistencia de personas con discapacidad, que gozan de acceso en los términos previstos por la ley.",
    "Los propietarios que arrienden su vivienda deberán trasladar esta prohibición a sus arrendatarios. El incumplimiento se considerará infracción grave.",
  ],
};

export function construirNormas(e: EdificioDoc, p: PoliticaEdificio, fecha: string, version: string): DocSeed {
  const arts: DocSeed["secciones"] = [];
  let n = 0;
  const art = (titulo: string, parrafos: string[]) => {
    n += 1;
    arts.push({ encabezado: `ARTÍCULO ${n}.- ${titulo.toUpperCase()}`, parrafos });
  };

  art("Objeto y ámbito de aplicación", [
    `Las presentes normas de convivencia regulan el uso de los elementos comunes y las relaciones entre los ocupantes del edificio situado en ${e.direccion}, ${e.cp} ${e.municipio} (${e.referencia}), construido en ${e.anio}, con ${e.plantas} plantas${e.ascensor ? " y ascensor" : ""}. Obligan a propietarios, arrendatarios y cualquier ocupante, a título gratuito u oneroso.`,
    `Administración de la comunidad: ${e.administrador}.`,
  ]);
  art("Uso de los elementos comunes", [
    "Los portales, escaleras, pasillos y demás zonas comunes no podrán utilizarse para depositar enseres, bicicletas, cochecitos ni otros objetos que dificulten el paso o supongan riesgo de incendio.",
    "Queda prohibido tender ropa en fachadas y balcones que den a la vía pública, así como sacudir alfombras desde ventanas y balcones.",
  ]);
  art("Horario de descanso y ruidos", [
    `Se respetará el silencio entre las ${p.silencioDesde} y las ${p.silencioHasta} horas. Fuera de ese horario, los ruidos no excederán de los límites de la ordenanza municipal de protección contra la contaminación acústica.`,
    "Las fiestas o reuniones con música deberán comunicarse con antelación razonable a los vecinos colindantes y no se prolongarán más allá del horario de descanso.",
  ]);
  art("Obras y reformas en viviendas", [
    `Las obras en el interior de las viviendas solo podrán realizarse ${p.obrasHorario}${p.obrasAgosto ? ", quedando prohibidas durante todo el mes de agosto" : ""}. El propietario comunicará a la administración el inicio de las obras y su duración estimada.`,
    "Los escombros se retirarán a diario en sacos o contenedores autorizados, y el propietario responderá de los daños y de la limpieza de los elementos comunes.",
  ]);
  art("Animales de compañía", MASCOTAS_TEXTO[p.mascotas](p));
  art("Viviendas de uso turístico", [
    p.turistico === "prohibido"
      ? "Queda prohibido el uso de las viviendas para actividades de alquiler turístico o de corta estancia (menos de treinta días) gestionadas a través de plataformas o directamente. El incumplimiento facultará a la comunidad para iniciar acciones de cesación."
      : "Se permite el uso turístico de las viviendas previa comunicación a la administración y siempre que el titular cuente con la licencia o inscripción municipal y autonómica exigible. Los huéspedes quedan sujetos a estas normas de convivencia.",
  ]);
  art("Terrazas, patios y barbacoas", [
    p.terrazasBarbacoa
      ? "Se permite el uso de barbacoas eléctricas en terrazas y patios privativos. Quedan prohibidas las de carbón o leña."
      : "Queda prohibido el uso de barbacoas de cualquier tipo en terrazas, balcones y patios privativos por riesgo de incendio y molestias por humos.",
    "Las plantas y macetas se colocarán de forma que no puedan caer a la vía pública ni verter agua a los pisos inferiores.",
  ]);
  art("Basuras y reciclaje", [p.basuras, "Los residuos voluminosos (muebles, electrodomésticos) no se depositarán en el portal ni en los cuartos de basuras: se solicitará su recogida al servicio municipal."]);
  if (e.ascensor) {
    art("Ascensor y mudanzas", [
      `El ascensor no podrá utilizarse para el transporte de materiales de obra sin protección previa. Las mudanzas se comunicarán con al menos 48 horas de antelación a la administración y se realizarán ${p.mudanzas}.`,
      "Los desperfectos causados en el ascensor durante una mudanza o transporte serán de cuenta del causante.",
    ]);
  }
  if (e.garaje) {
    art("Garaje y trasteros", [
      `La velocidad máxima dentro del garaje es de 10 km/h. Está prohibido estacionar fuera de la plaza asignada y almacenar materiales inflamables en plazas y trasteros. ${p.garajeMotos ? "Se permite el estacionamiento de motocicletas en plazas de garaje." : "No se permite el estacionamiento de motocicletas en las plazas de coche."}`,
    ]);
  }
  if (e.piscina && p.piscinaHorario) {
    art("Piscina y zonas deportivas", [
      `La piscina estará abierta ${p.piscinaHorario}. Los menores de 14 años deberán ir acompañados de un adulto. Cada vivienda podrá invitar a un máximo de dos personas.`,
      "Está prohibido el uso de recipientes de cristal, el acceso con calzado de calle a la zona de baño y la reserva de tumbonas.",
    ]);
  }
  art("Cuotas y gastos comunes", [
    `Los gastos comunes se abonarán por trimestres anticipados. ${p.cuotaExtra}`,
    "El arrendatario solo responderá de los gastos comunes en la medida pactada en su contrato de arrendamiento; frente a la comunidad responde siempre el propietario.",
  ]);
  art("Régimen sancionador", [
    "El incumplimiento reiterado de estas normas facultará al presidente, previo requerimiento fehaciente, para acudir a la vía judicial conforme al artículo 7 de la Ley de Propiedad Horizontal.",
  ]);

  return {
    clave: `normas-${e.referencia}-${version}`,
    titulo: `Normas de convivencia y régimen interior · ${e.direccion} (${version})`,
    tipo: "normas_comunidad",
    edificio_id: e.id,
    fecha,
    secciones: [{ parrafos: [`Aprobadas por la junta general de propietarios el ${fechaLarga(fecha)}.`] }, ...arts],
  };
}

export interface AcuerdoActa {
  titulo: string;
  texto: string;
  votos?: string;
}

export function construirActa(e: EdificioDoc, fecha: string, tipo: "ordinaria" | "extraordinaria", asistentes: string, acuerdos: AcuerdoActa[], clave: string): DocSeed {
  const orden: DocSeed["secciones"] = [
    {
      encabezado: "CONVOCATORIA Y ASISTENCIA",
      parrafos: [
        `En ${e.municipio}, el ${fechaLarga(fecha)}, se reúne en junta general ${tipo} la comunidad de propietarios del edificio de ${e.direccion} (${e.referencia}), bajo la presidencia del presidente y con la asistencia de ${asistentes}.`,
        `Actúa como secretario-administrador ${e.administrador}. Se declara válidamente constituida la junta en primera convocatoria.`,
      ],
    },
  ];
  acuerdos.forEach((a, i) => {
    orden.push({
      encabezado: `PUNTO ${i + 1}.- ${a.titulo.toUpperCase()}`,
      parrafos: [a.texto, a.votos ? `Votación: ${a.votos}.` : ""].filter(Boolean),
    });
  });
  orden.push({
    encabezado: "CIERRE",
    parrafos: ["Sin más asuntos que tratar, se levanta la sesión, de lo que como secretario doy fe."],
  });
  return {
    clave,
    titulo: `Acta de junta ${tipo} · ${e.direccion} · ${fechaLarga(fecha)}`,
    tipo: "acta_junta",
    edificio_id: e.id,
    fecha,
    secciones: orden,
    firmas: [["El presidente", "Presidente/a de la comunidad"], ["El secretario-administrador", e.administrador]],
  };
}

export function construirEstatutos(e: EdificioDoc, fecha: string): DocSeed {
  return {
    clave: `estatutos-${e.referencia}`,
    titulo: `Estatutos de la comunidad · ${e.direccion}`,
    tipo: "estatutos",
    edificio_id: e.id,
    fecha,
    secciones: [
      {
        encabezado: "TÍTULO I.- DISPOSICIONES GENERALES",
        parrafos: [
          `La comunidad de propietarios del edificio situado en ${e.direccion}, ${e.municipio}, se rige por la Ley de Propiedad Horizontal, por estos estatutos y por las normas de régimen interior que apruebe la junta.`,
          `El edificio consta de ${e.plantas} plantas${e.portero ? ", cuenta con servicio de portería" : ""}${e.garaje ? ", garaje y trasteros en sótano" : ""}.`,
        ],
      },
      {
        encabezado: "TÍTULO II.- CUOTAS DE PARTICIPACIÓN",
        parrafos: [
          "A cada elemento privativo se le asigna una cuota de participación en los gastos y beneficios de la comunidad, fijada en el título constitutivo en proporción a su superficie y ubicación. Los locales comerciales participan en los gastos de ascensor y escalera únicamente si tienen acceso a ellos.",
          "Los gastos generales se distribuirán conforme a estas cuotas, salvo los servicios de los que quede exento un elemento por no tener acceso o no poder usarlos.",
        ],
      },
      {
        encabezado: "TÍTULO III.- USO DE LOS ELEMENTOS PRIVATIVOS",
        parrafos: [
          "Los propietarios podrán destinar sus viviendas a los usos permitidos por el planeamiento urbanístico. Las actividades molestas, insalubres, nocivas, peligrosas o ilícitas están prohibidas en todo el edificio.",
          "Cualquier modificación de la configuración exterior del edificio (toldos, cerramientos, aparatos de aire acondicionado en fachada) requerirá el acuerdo de la junta.",
        ],
      },
      {
        encabezado: "TÍTULO IV.- ÓRGANOS DE GOBIERNO",
        parrafos: [
          "Son órganos de gobierno la junta de propietarios, el presidente, los vicepresidentes en su caso, el secretario y el administrador. La junta se reunirá en sesión ordinaria una vez al año para aprobar los presupuestos y cuentas.",
          "Los acuerdos se adoptarán por mayoría simple de propietarios y cuotas, salvo los que la ley exija por mayoría cualificada o unanimidad.",
        ],
      },
      {
        encabezado: "TÍTULO V.- ARRENDAMIENTOS",
        parrafos: [
          "Los propietarios que cedan el uso de su vivienda deberán comunicar a la administración los datos del ocupante y darle copia de las normas de convivencia. Seguirán siendo responsables solidarios de las infracciones que este cometa.",
        ],
      },
    ],
  };
}
