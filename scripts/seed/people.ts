import { addDays, chance, cif, dni, faker, int, iso, money, nie, pick, slug, telefono, TODAY, weighted } from "./util";

export interface PersonaBase {
  nombre: string;
  apellidos: string;
  nacionalidad: string;
  documento_tipo: "DNI" | "NIE" | "PASAPORTE";
  documento: string;
}

// Nombres de otras procedencias para los extranjeros (ficticios, combinaciones aleatorias).
const ORIGENES: Record<string, { nombres: string[]; apellidos: string[] }> = {
  Marruecos: { nombres: ["Youssef", "Karim", "Omar", "Hamza", "Fatima", "Amina", "Salma", "Yassine", "Nadia", "Rachid"], apellidos: ["El Idrissi", "Benali", "Amrani", "Ouazzani", "Haddad", "Bouzid", "Tahiri"] },
  Rumanía: { nombres: ["Andrei", "Mihai", "Elena", "Ioana", "Cristian", "Daniela", "Florin", "Alina"], apellidos: ["Popescu", "Ionescu", "Dumitru", "Stan", "Munteanu", "Radu", "Constantin"] },
  Colombia: { nombres: ["Juan David", "Laura", "Santiago", "Valentina", "Camilo", "Daniela", "Andrés", "Paola"], apellidos: ["Gómez", "Rodríguez", "Ospina", "Cardona", "Restrepo", "Vargas", "Mejía"] },
  Venezuela: { nombres: ["Luis", "Carla", "José Gregorio", "Mariana", "Gabriel", "Yelitza", "Rafael", "Ana Karina"], apellidos: ["Pérez", "Rivas", "Colmenares", "Márquez", "Bravo", "Salazar", "Ferrer"] },
  Ecuador: { nombres: ["Kevin", "Jessica", "Jefferson", "Génesis", "Bryan", "Karla"], apellidos: ["Mendoza", "Zambrano", "Cedeño", "Loor", "Villacís", "Guamán"] },
  Perú: { nombres: ["Diego", "Milagros", "Jhon", "Rosa", "Luis Alberto", "Yesenia"], apellidos: ["Quispe", "Huamán", "Flores", "Chávez", "Mamani", "Condori"] },
  China: { nombres: ["Wei", "Li", "Yang", "Mei", "Jun", "Xiao"], apellidos: ["Zhang", "Wang", "Liu", "Chen", "Lin", "Zhou"] },
  Italia: { nombres: ["Marco", "Giulia", "Luca", "Chiara", "Matteo", "Francesca"], apellidos: ["Rossi", "Bianchi", "Romano", "Colombo", "Ricci", "Greco"] },
  Ucrania: { nombres: ["Olena", "Andriy", "Oksana", "Taras", "Iryna", "Dmytro"], apellidos: ["Kovalenko", "Shevchenko", "Bondarenko", "Tkachenko", "Melnyk"] },
  Brasil: { nombres: ["Thiago", "Camila", "Rafael", "Beatriz", "Gustavo", "Larissa"], apellidos: ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Costa"] },
};

const PROFESIONES = [
  "Ingeniero/a", "Enfermero/a", "Profesor/a", "Administrativo/a", "Camarero/a", "Desarrollador/a de software",
  "Médico/a", "Abogado/a", "Comercial", "Autónomo/a", "Arquitecto/a", "Conductor/a", "Estudiante", "Cocinero/a",
  "Electricista", "Diseñador/a gráfico", "Periodista", "Farmacéutico/a", "Policía", "Funcionario/a", "Contable",
  "Repartidor/a", "Peluquero/a", "Investigador/a", "Consultor/a", "Fisioterapeuta", "Dependiente/a",
];

const DOMINIOS = ["example.com", "example.org", "example.net"];

function nombreEspanol() {
  const sexo = pick(["male", "female"] as const);
  return {
    nombre: faker.person.firstName(sexo),
    apellidos: `${faker.person.lastName().split(" ")[0]} ${faker.person.lastName().split(" ")[0]}`,
  };
}

export function personaAleatoria(extranjeroProb = 0.22): PersonaBase {
  if (chance(extranjeroProb)) {
    const pais = pick(Object.keys(ORIGENES));
    const o = ORIGENES[pais];
    return {
      nombre: pick(o.nombres),
      apellidos: `${pick(o.apellidos)} ${pick(o.apellidos)}`,
      nacionalidad: pais,
      ...(chance(0.06) ? { documento_tipo: "PASAPORTE", documento: `P${int(1_000_000, 9_999_999)}` } : { documento_tipo: "NIE", documento: nie() }),
    } as PersonaBase;
  }
  return { ...nombreEspanol(), nacionalidad: "España", documento_tipo: "DNI", documento: dni() };
}

export function emailDe(nombre: string, apellidos: string) {
  return `${slug(nombre.split(" ")[0])}.${slug(apellidos.split(" ")[0])}${int(1, 99)}@${pick(DOMINIOS)}`;
}

// ── Propietarios ─────────────────────────────────────────────────────────────────────────────────
const SOCIEDADES = [
  "Inversiones Villanueva S.L.", "Patrimonial Castellana S.A.", "Gestión Inmuebles Retiro S.L.", "Rentas del Manzanares S.L.",
  "Grupo Inmobiliario Chamberí S.L.", "Alquileres Sierra Norte S.L.", "Promociones Henares S.L.", "Casa & Hogar Inversiones S.L.",
  "Activos Urbanos Madrid S.L.", "Inmuebles Puerta del Sol S.A.", "Real Estate Lavapiés S.L.", "Tenencias del Sur S.L.",
  "Fincas Atocha S.L.", "Residencial Barajas S.L.", "Inversiones Alcalá 2000 S.L.",
];

export interface PropietarioRow {
  id: number;
  tipo_persona: "fisica" | "sociedad";
  nombre: string;
  documento: string;
  email: string;
  telefono: string;
}

export function generarPropietarios(total: number): PropietarioRow[] {
  const filas: PropietarioRow[] = [];
  const usados = new Set<string>();
  SOCIEDADES.forEach((nombre, i) => {
    let doc = cif();
    while (usados.has(doc)) doc = cif();
    usados.add(doc);
    filas.push({
      id: i + 1, tipo_persona: "sociedad", nombre, documento: doc,
      email: `administracion@${slug(nombre.replace(/S\.[LA]\./, ""))}.example.com`, telefono: telefono(),
    });
  });
  while (filas.length < total) {
    const p = personaAleatoria(0.08);
    if (usados.has(p.documento)) continue;
    usados.add(p.documento);
    filas.push({
      id: filas.length + 1, tipo_persona: "fisica", nombre: `${p.nombre} ${p.apellidos}`, documento: p.documento,
      email: emailDe(p.nombre, p.apellidos), telefono: telefono(),
    });
  }
  return filas;
}

// ── Inquilinos ───────────────────────────────────────────────────────────────────────────────────
export interface InquilinoRow {
  id: number;
  nombre: string;
  apellidos: string;
  documento_tipo: string;
  documento: string;
  email: string;
  telefono: string;
  fecha_nacimiento: string;
  nacionalidad: string;
  profesion: string;
  ingresos_mensuales: number;
}

export function generarInquilinos(total: number, usados: Set<string>): InquilinoRow[] {
  const filas: InquilinoRow[] = [];
  while (filas.length < total) {
    const p = personaAleatoria();
    if (usados.has(p.documento)) continue;
    usados.add(p.documento);
    const edad = weighted<[number, number]>([[[20, 27], 22], [[28, 39], 44], [[40, 55], 26], [[56, 75], 8]]);
    const nacimiento = addDays(TODAY, -int(edad[0] * 365, edad[1] * 365));
    const profesion = pick(PROFESIONES);
    const base = profesion === "Estudiante" ? int(400, 1200) : int(1150, 5200);
    filas.push({
      id: filas.length + 1, nombre: p.nombre, apellidos: p.apellidos, documento_tipo: p.documento_tipo,
      documento: p.documento, email: emailDe(p.nombre, p.apellidos), telefono: telefono(),
      fecha_nacimiento: iso(nacimiento), nacionalidad: p.nacionalidad, profesion,
      ingresos_mensuales: money(Math.round(base / 50) * 50),
    });
  }
  return filas;
}
