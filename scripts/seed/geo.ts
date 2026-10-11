// Geografía de la Comunidad de Madrid para el seed. Las zonas son una agrupación propia (no oficial).

export interface ZonaRow {
  id: number;
  nombre: string;
  descripcion: string;
}
export interface MunicipioRow {
  id: number;
  nombre: string;
  zona_id: number;
  es_capital: boolean;
  poblacion: number;
}
export interface DistritoRow {
  id: number;
  municipio_id: number;
  nombre: string;
  zona_id: number;
}
export interface BarrioRow {
  id: number;
  distrito_id: number;
  nombre: string;
}
export interface SinonimoRow {
  termino: string;
  entidad: "zona" | "municipio" | "distrito" | "barrio";
  entidad_id: number;
}

/** Punto donde puede construirse un edificio: mercado, precios y carácter de la zona. */
export interface Lugar {
  municipioId: number;
  municipio: string;
  distritoId: number | null;
  distrito: string | null;
  barrios: { id: number; nombre: string }[];
  zonaId: number;
  peso: number;
  rentM2: number;
  saleM2: number;
  lat: number;
  lng: number;
  cps: string[];
  calles: string[];
  ambiente: string[];
  /** Zona universitaria / estudiantil: más habitaciones sueltas. */
  estudiantil?: boolean;
  /** Peso relativo de edificios unifamiliares (chalés, adosados). */
  chalets?: number;
}

export const ZONAS: ZonaRow[] = [
  { id: 1, nombre: "Madrid Centro", descripcion: "Distritos Centro, Arganzuela, Retiro, Salamanca y Chamberí" },
  { id: 2, nombre: "Madrid Norte", descripcion: "Distritos Chamartín, Tetuán, Fuencarral-El Pardo y Hortaleza" },
  { id: 3, nombre: "Madrid Oeste", descripcion: "Distritos Moncloa-Aravaca y Latina" },
  { id: 4, nombre: "Madrid Sur", descripcion: "Distritos Carabanchel, Usera, Villaverde, Puente de Vallecas y Villa de Vallecas" },
  { id: 5, nombre: "Madrid Este", descripcion: "Distritos Moratalaz, Ciudad Lineal, Vicálvaro, San Blas-Canillejas y Barajas" },
  { id: 6, nombre: "Corredor del Henares", descripcion: "Alcalá de Henares, Torrejón, Coslada y municipios vecinos" },
  { id: 7, nombre: "Sur metropolitano", descripcion: "Getafe, Leganés, Fuenlabrada, Móstoles, Alcorcón y el sur de la Comunidad" },
  { id: 8, nombre: "Norte metropolitano", descripcion: "Alcobendas, San Sebastián de los Reyes, Tres Cantos y Colmenar Viejo" },
  { id: 9, nombre: "Noroeste y Sierra", descripcion: "Las Rozas, Majadahonda, Pozuelo, Boadilla y municipios de la sierra" },
  { id: 10, nombre: "Sureste", descripcion: "Rivas-Vaciamadrid, Arganda del Rey y Velilla de San Antonio" },
];

interface DistritoDef {
  nombre: string;
  zonaId: number;
  peso: number;
  rentM2: number;
  saleM2: number;
  lat: number;
  lng: number;
  cps: string[];
  calles: string[];
  ambiente: string[];
  barrios: string[];
  estudiantil?: boolean;
}

const DISTRITOS: DistritoDef[] = [
  {
    nombre: "Centro", zonaId: 1, peso: 10, rentM2: 24, saleM2: 6800, lat: 40.4155, lng: -3.7074, estudiantil: true,
    cps: ["28004", "28012", "28013", "28014"],
    calles: ["Calle de Toledo", "Calle de la Estrella", "Calle de Atocha", "Calle del Barquillo", "Calle de Fuencarral", "Calle de Segovia", "Calle de la Palma", "Calle de San Vicente Ferrer", "Calle del Pez", "Calle de la Reina"],
    ambiente: ["a un paso de la Puerta del Sol", "en pleno corazón de Madrid", "rodeado de teatros, cafés y comercio", "en un barrio animado con mucha vida cultural"],
    barrios: ["Palacio", "Embajadores", "Cortes", "Justicia", "Universidad", "Sol"],
  },
  {
    nombre: "Arganzuela", zonaId: 1, peso: 5, rentM2: 19, saleM2: 5200, lat: 40.398, lng: -3.696,
    cps: ["28045", "28005", "28012"],
    calles: ["Paseo de las Delicias", "Calle de Méndez Álvaro", "Paseo de la Chopera", "Calle de Embajadores", "Calle de Toledo", "Calle de Ferrocarril"],
    ambiente: ["junto a Madrid Río", "cerca de Atocha y de la estación de tren", "en una zona con parques y buenas conexiones"],
    barrios: ["Imperial", "Acacias", "Chopera", "Legazpi", "Delicias", "Palos de Moguer", "Atocha"],
  },
  {
    nombre: "Retiro", zonaId: 1, peso: 5, rentM2: 21, saleM2: 6300, lat: 40.411, lng: -3.674,
    cps: ["28007", "28009"],
    calles: ["Calle de Alcalá", "Calle de O'Donnell", "Calle de Ibiza", "Calle de Menéndez Pelayo", "Calle de Granada", "Calle del Doctor Esquerdo"],
    ambiente: ["a pocos minutos del parque del Retiro", "en una zona residencial muy tranquila", "cerca de colegios y zonas verdes"],
    barrios: ["Pacífico", "Adelfas", "Estrella", "Ibiza", "Jerónimos", "Niño Jesús"],
  },
  {
    nombre: "Salamanca", zonaId: 1, peso: 8, rentM2: 25, saleM2: 7600, lat: 40.43, lng: -3.678,
    cps: ["28001", "28006", "28009", "28028"],
    calles: ["Calle de Serrano", "Calle de Velázquez", "Calle de Goya", "Calle de Lagasca", "Calle de Claudio Coello", "Calle de Núñez de Balboa", "Calle de Castelló"],
    ambiente: ["en el elegante barrio de Salamanca", "en una finca señorial con portero", "cerca de las mejores tiendas y restaurantes"],
    barrios: ["Recoletos", "Goya", "Fuente del Berro", "Guindalera", "Lista", "Castellana"],
  },
  {
    nombre: "Chamberí", zonaId: 1, peso: 8, rentM2: 23, saleM2: 6900, lat: 40.435, lng: -3.704,
    cps: ["28003", "28010", "28015"],
    calles: ["Calle de Fuencarral", "Calle de Modesto Lafuente", "Calle de Santa Engracia", "Calle de Bravo Murillo", "Calle de Eloy Gonzalo", "Calle de Zurbano", "Calle de Génova"],
    ambiente: ["en un barrio tradicional, tranquilo y bien comunicado", "junto a mercados y comercio de proximidad", "con metro a un minuto"],
    barrios: ["Gaztambide", "Arapiles", "Trafalgar", "Almagro", "Ríos Rosas", "Vallehermoso"],
  },
  {
    nombre: "Chamartín", zonaId: 2, peso: 6, rentM2: 22, saleM2: 6800, lat: 40.46, lng: -3.677,
    cps: ["28002", "28016", "28036"],
    calles: ["Calle de Príncipe de Vergara", "Calle de López de Hoyos", "Avenida de Alberto Alcocer", "Calle de Padre Damián", "Calle de Costa Rica", "Calle de Oruro"],
    ambiente: ["en una zona residencial de primer nivel", "cerca del Bernabéu y de Nuevos Ministerios", "con colegios internacionales en las inmediaciones"],
    barrios: ["El Viso", "Prosperidad", "Ciudad Jardín", "Hispanoamérica", "Nueva España", "Castilla"],
  },
  {
    nombre: "Tetuán", zonaId: 2, peso: 5, rentM2: 18, saleM2: 4600, lat: 40.46, lng: -3.7,
    cps: ["28020", "28029", "28039"],
    calles: ["Calle de Bravo Murillo", "Paseo de la Castellana", "Calle de Francos Rodríguez", "Calle de Marqués de Viana", "Calle de Villaamil", "Calle de Sáinz de Baranda"],
    ambiente: ["junto a la Castellana y con metro cercano", "en un barrio multicultural con mucho comercio", "bien conectado con el centro y el aeropuerto"],
    barrios: ["Bellas Vistas", "Cuatro Caminos", "Castillejos", "Almenara", "Valdeacederas", "Berruguete"],
  },
  {
    nombre: "Fuencarral-El Pardo", zonaId: 2, peso: 4, rentM2: 17, saleM2: 4400, lat: 40.49, lng: -3.71,
    cps: ["28034", "28035", "28049"],
    calles: ["Avenida del Cardenal Herrera Oria", "Calle de Ginzo de Limia", "Calle de Monforte de Lemos", "Calle de Arroyofresno", "Calle de Nuestra Señora de Valverde"],
    ambiente: ["rodeado de zonas verdes y con vistas a la sierra", "en un barrio residencial con muchos servicios", "cerca de Monte del Pardo"],
    barrios: ["El Pardo", "Fuentelarreina", "Peñagrande", "Pilar", "La Paz", "Valverde", "Mirasierra", "El Goloso"],
  },
  {
    nombre: "Hortaleza", zonaId: 2, peso: 4, rentM2: 17, saleM2: 4500, lat: 40.473, lng: -3.642,
    cps: ["28033", "28043"],
    calles: ["Calle de Mar de Cristal", "Calle de Silvano", "Calle de Santa Virgilia", "Avenida de San Luis", "Calle de Alcalá"],
    ambiente: ["en una urbanización moderna con zonas comunes", "cerca de IFEMA y del aeropuerto", "con parques y colegios a pocos pasos"],
    barrios: ["Palomas", "Piovera", "Canillas", "Pinar del Rey", "Apóstol Santiago", "Valdefuentes"],
  },
  {
    nombre: "Moncloa-Aravaca", zonaId: 3, peso: 4, rentM2: 20, saleM2: 5600, lat: 40.435, lng: -3.735, estudiantil: true,
    cps: ["28008", "28040", "28023"],
    calles: ["Calle de la Princesa", "Calle de Rosario Pino", "Paseo de la Habana", "Calle de Ferraz", "Calle de la Florida", "Avenida de Valladolid"],
    ambiente: ["junto a la Ciudad Universitaria", "cerca de Argüelles y del parque del Oeste", "con excelente conexión de metro y autobús"],
    barrios: ["Casa de Campo", "Argüelles", "Ciudad Universitaria", "Valdezarza", "Valdemarín", "El Plantío", "Aravaca"],
  },
  {
    nombre: "Latina", zonaId: 3, peso: 4, rentM2: 15, saleM2: 3400, lat: 40.39, lng: -3.74, estudiantil: true,
    cps: ["28011", "28024", "28047"],
    calles: ["Calle de Illescas", "Avenida de las Águilas", "Calle de Camarena", "Paseo de Extremadura", "Calle de Seseña"],
    ambiente: ["junto a la Casa de Campo", "en un barrio con buen ambiente vecinal y precios contenidos", "cerca de Aluche y con cercanías"],
    barrios: ["Los Cármenes", "Puerta del Ángel", "Lucero", "Aluche", "Campamento", "Cuatro Vientos", "Las Águilas"],
  },
  {
    nombre: "Carabanchel", zonaId: 4, peso: 5, rentM2: 15, saleM2: 3200, lat: 40.38, lng: -3.735,
    cps: ["28019", "28025", "28044"],
    calles: ["Calle de General Ricardos", "Calle de Oca", "Calle de Vía Lusitana", "Calle de Antonio Leyva", "Calle de Monseñor Oscar Romero"],
    ambiente: ["en pleno Carabanchel, con metro y comercio", "cerca de Vista Alegre y sus parques", "en un barrio en plena transformación"],
    barrios: ["Comillas", "Opañel", "San Isidro", "Vista Alegre", "Puerta Bonita", "Buenavista", "Abrantes"],
  },
  {
    nombre: "Usera", zonaId: 4, peso: 3, rentM2: 14, saleM2: 3000, lat: 40.383, lng: -3.704,
    cps: ["28026", "28041"],
    calles: ["Calle de Marcelo Usera", "Avenida de Andalucía", "Calle de Antonio López", "Calle de Rafaela Ybarra"],
    ambiente: ["en un barrio diverso y vibrante", "cerca de Madrid Río y con metro", "con todos los servicios a mano"],
    barrios: ["Orcasitas", "Orcasur", "San Fermín", "Almendrales", "Moscardó", "Zofío", "Pradolongo"],
  },
  {
    nombre: "Villaverde", zonaId: 4, peso: 3, rentM2: 13, saleM2: 2700, lat: 40.348, lng: -3.707,
    cps: ["28021", "28041"],
    calles: ["Calle de Alcocer", "Paseo de Alberto Palacios", "Calle de Santa Petronila", "Avenida de Andalucía"],
    ambiente: ["con cercanías y metro a pocos minutos", "en un barrio tranquilo con precios accesibles", "cerca de grandes superficies y parques"],
    barrios: ["Villaverde Alto", "San Cristóbal", "Butarque", "Los Rosales", "Los Ángeles"],
  },
  {
    nombre: "Puente de Vallecas", zonaId: 4, peso: 4, rentM2: 14, saleM2: 2800, lat: 40.393, lng: -3.66,
    cps: ["28018", "28038", "28053"],
    calles: ["Avenida de la Albufera", "Calle de Sierra Vieja", "Calle de Peña Gorbea", "Calle de Monte Igueldo", "Calle de Pedro Laborde"],
    ambiente: ["en un barrio vivo, con mercados y mucho carácter", "con vecindario tradicional y comercio de toda la vida", "bien comunicado con el centro por metro"],
    barrios: ["Entrevías", "San Diego", "Palomeras Bajas", "Palomeras Sureste", "Portazgo", "Numancia"],
  },
  {
    nombre: "Villa de Vallecas", zonaId: 4, peso: 2, rentM2: 14, saleM2: 3100, lat: 40.372, lng: -3.62,
    cps: ["28031", "28051"],
    calles: ["Calle de Real de Arganda", "Avenida de la Gran Vía del Sureste", "Calle de Sierra Gorda", "Calle de Ronda del Sur"],
    ambiente: ["en un desarrollo moderno con amplias zonas verdes", "cerca de Santa Eugenia y sus cercanías", "en una zona familiar de nueva construcción"],
    barrios: ["Casco Histórico de Vallecas", "Santa Eugenia", "Ensanche de Vallecas"],
  },
  {
    nombre: "Moratalaz", zonaId: 5, peso: 3, rentM2: 16, saleM2: 3600, lat: 40.407, lng: -3.645,
    cps: ["28030"],
    calles: ["Calle del Arroyo Fontarrón", "Calle de Camino de los Vinateros", "Calle de Pico de los Artilleros", "Calle de Hacienda de Pavones"],
    ambiente: ["en un barrio residencial y tranquilo", "cerca del parque de Moratalaz", "con buena oferta de colegios y comercio"],
    barrios: ["Pavones", "Horcajo", "Marroquina", "Media Legua", "Fontarrón", "Vinateros"],
  },
  {
    nombre: "Ciudad Lineal", zonaId: 5, peso: 5, rentM2: 17, saleM2: 4200, lat: 40.445, lng: -3.65,
    cps: ["28017", "28027", "28043"],
    calles: ["Calle de Alcalá", "Calle de Arturo Soria", "Calle de López de Hoyos", "Calle de Hermanos García Noblejas", "Calle de Martínez Izquierdo"],
    ambiente: ["en una zona muy bien comunicada por metro", "cerca de la Elipa y sus zonas deportivas", "en un barrio de vecinos de toda la vida"],
    barrios: ["Ventas", "Pueblo Nuevo", "Quintana", "La Concepción", "San Pascual", "San Juan Bautista", "Colina", "Atalaya", "Costillares"],
  },
  {
    nombre: "Vicálvaro", zonaId: 5, peso: 2, rentM2: 14, saleM2: 3300, lat: 40.403, lng: -3.6,
    cps: ["28032"],
    calles: ["Calle de Villablanca", "Calle de Ambroz", "Avenida de Daroca", "Calle de Lago Ercina"],
    ambiente: ["en un barrio nuevo con zonas verdes y colegios", "cerca de Valdebernardo y su parque", "con cercanías y metro a pocos pasos"],
    barrios: ["Casco Histórico de Vicálvaro", "Valdebernardo", "Valderrivas", "El Cañaveral"],
  },
  {
    nombre: "San Blas-Canillejas", zonaId: 5, peso: 3, rentM2: 16, saleM2: 3700, lat: 40.43, lng: -3.61,
    cps: ["28022", "28037"],
    calles: ["Calle de Alcalá", "Calle de Hermanos García Noblejas", "Calle de Boltaña", "Calle de Jazmín", "Avenida de Arcentales"],
    ambiente: ["cerca del Estadio Metropolitano", "en un barrio bien conectado con la M-40", "junto a parques y zonas deportivas"],
    barrios: ["Simancas", "Hellín", "Amposta", "Arcos", "Rosas", "Rejas", "Canillejas", "El Salvador"],
  },
  {
    nombre: "Barajas", zonaId: 5, peso: 2, rentM2: 17, saleM2: 4300, lat: 40.475, lng: -3.58,
    cps: ["28042"],
    calles: ["Avenida de Logroño", "Calle de Ramón y Cajal", "Calle de Bahía de Pollensa", "Calle de Jazmín"],
    ambiente: ["en la Alameda de Osuna, rodeado de jardines", "junto al aeropuerto y al Parque Juan Carlos I", "en una zona residencial de baja densidad"],
    barrios: ["Alameda de Osuna", "Aeropuerto", "Casco Histórico de Barajas", "Timón", "Corralejos"],
  },
];

interface MunicipioDef {
  nombre: string;
  zonaId: number;
  poblacion: number;
  peso: number;
  rentM2: number;
  saleM2: number;
  lat: number;
  lng: number;
  cp: string;
  ambiente: string[];
  chalets?: number; // probabilidad relativa de edificios unifamiliares
  estudiantil?: boolean;
}

const MUNICIPIOS: MunicipioDef[] = [
  // Corredor del Henares
  { nombre: "Alcalá de Henares", zonaId: 6, poblacion: 198000, peso: 5, rentM2: 11.5, saleM2: 2300, lat: 40.482, lng: -3.364, cp: "288", estudiantil: true, ambiente: ["cerca del casco histórico y de la universidad", "con cercanías directas a Madrid", "en una ciudad patrimonio de la humanidad"] },
  { nombre: "Torrejón de Ardoz", zonaId: 6, poblacion: 136000, peso: 3, rentM2: 12, saleM2: 2400, lat: 40.46, lng: -3.47, cp: "288", ambiente: ["con cercanías y grandes zonas de ocio", "en un municipio con mucha oferta de servicios", "cerca del Parque Europa"] },
  { nombre: "Coslada", zonaId: 6, poblacion: 82000, peso: 2, rentM2: 13, saleM2: 2700, lat: 40.423, lng: -3.562, cp: "288", ambiente: ["con metro y cercanías a Madrid", "cerca del parque de los Pueblos de Europa", "muy bien comunicado por la A-2"] },
  { nombre: "San Fernando de Henares", zonaId: 6, poblacion: 40000, peso: 1, rentM2: 12.5, saleM2: 2500, lat: 40.424, lng: -3.533, cp: "288", ambiente: ["con metro y zonas verdes", "en un municipio tranquilo junto al Jarama", "con buena conexión a Madrid"] },
  { nombre: "Mejorada del Campo", zonaId: 6, poblacion: 24000, peso: 0.5, rentM2: 11, saleM2: 2100, lat: 40.391, lng: -3.465, cp: "288", chalets: 2, ambiente: ["en un entorno tranquilo", "cerca de la A-3", "con parcelas y chalés adosados"] },
  { nombre: "Paracuellos de Jarama", zonaId: 6, poblacion: 26000, peso: 0.5, rentM2: 13, saleM2: 2600, lat: 40.503, lng: -3.529, cp: "281", chalets: 3, ambiente: ["en urbanización con zonas comunes", "cerca del aeropuerto", "con colegios y comercio cercanos"] },
  // Sur metropolitano
  { nombre: "Getafe", zonaId: 7, poblacion: 187000, peso: 4, rentM2: 13.5, saleM2: 2700, lat: 40.305, lng: -3.732, cp: "289", estudiantil: true, ambiente: ["con metro y cercanías", "cerca de la Universidad Carlos III", "en una ciudad con mucha industria y servicios"] },
  { nombre: "Leganés", zonaId: 7, poblacion: 187000, peso: 3, rentM2: 13, saleM2: 2600, lat: 40.327, lng: -3.764, cp: "289", estudiantil: true, ambiente: ["junto a la universidad y al Hospital Severo Ochoa", "con metrosur y cercanías", "cerca de Parquesur"] },
  { nombre: "Fuenlabrada", zonaId: 7, poblacion: 194000, peso: 3, rentM2: 12, saleM2: 2300, lat: 40.284, lng: -3.794, cp: "289", ambiente: ["con metrosur y cercanías", "cerca del Hospital de Fuenlabrada", "en un municipio con mucha vida familiar"] },
  { nombre: "Móstoles", zonaId: 7, poblacion: 210000, peso: 4, rentM2: 12, saleM2: 2300, lat: 40.322, lng: -3.865, cp: "289", ambiente: ["cerca de Móstoles Central y del campus", "con metrosur y cercanías", "junto al parque de El Soto"] },
  { nombre: "Alcorcón", zonaId: 7, poblacion: 172000, peso: 3, rentM2: 13.5, saleM2: 2800, lat: 40.348, lng: -3.825, cp: "289", ambiente: ["con metrosur y muchos servicios", "cerca de la Fundación Jiménez Díaz", "en un municipio bien equipado"] },
  { nombre: "Parla", zonaId: 7, poblacion: 132000, peso: 2, rentM2: 11, saleM2: 2100, lat: 40.236, lng: -3.767, cp: "289", ambiente: ["con tranvía y cercanías", "en un barrio de nueva construcción", "con precios muy competitivos"] },
  { nombre: "Pinto", zonaId: 7, poblacion: 55000, peso: 1.5, rentM2: 12, saleM2: 2400, lat: 40.24, lng: -3.699, cp: "283", chalets: 2, ambiente: ["con tranvía a Parla y cercanías", "en zona residencial con parques", "cerca de la A-4"] },
  { nombre: "Valdemoro", zonaId: 7, poblacion: 77000, peso: 1.5, rentM2: 13, saleM2: 2600, lat: 40.191, lng: -3.679, cp: "283", chalets: 2, ambiente: ["en urbanización con piscina", "con colegios y zonas deportivas", "cerca de la R-4 y la A-4"] },
  { nombre: "Humanes de Madrid", zonaId: 7, poblacion: 20000, peso: 0.5, rentM2: 11, saleM2: 2200, lat: 40.257, lng: -3.834, cp: "289", ambiente: ["con cercanías directas", "en un entorno tranquilo", "cerca de Fuenlabrada"] },
  { nombre: "Aranjuez", zonaId: 7, poblacion: 60000, peso: 1, rentM2: 9.5, saleM2: 1700, lat: 40.033, lng: -3.602, cp: "286", ambiente: ["junto a los jardines del Palacio Real", "en una ciudad histórica y tranquila", "con cercanías a Madrid"] },
  // Norte metropolitano
  { nombre: "Alcobendas", zonaId: 8, poblacion: 121000, peso: 4, rentM2: 16, saleM2: 3700, lat: 40.547, lng: -3.642, cp: "281", ambiente: ["en La Moraleja o el casco urbano, con excelentes colegios", "cerca de empresas y zonas de ocio", "con metro y cercanías"] },
  { nombre: "San Sebastián de los Reyes", zonaId: 8, poblacion: 92000, peso: 2.5, rentM2: 15, saleM2: 3300, lat: 40.547, lng: -3.627, cp: "287", ambiente: ["con metro y cercanías", "en un municipio con mucha oferta comercial", "cerca del Hospital Infanta Sofía"] },
  { nombre: "Tres Cantos", zonaId: 8, poblacion: 48000, peso: 1.5, rentM2: 16, saleM2: 3800, lat: 40.6, lng: -3.707, cp: "287", chalets: 2, ambiente: ["rodeado de naturaleza y con carril bici", "en una ciudad planificada, tranquila y verde", "con cercanías directas"] },
  { nombre: "Colmenar Viejo", zonaId: 8, poblacion: 51000, peso: 1.5, rentM2: 13, saleM2: 2800, lat: 40.659, lng: -3.767, cp: "287", chalets: 2, ambiente: ["a los pies de la sierra", "en una localidad con carácter y buena calidad de vida", "cerca de la M-607"] },
  { nombre: "Algete", zonaId: 8, poblacion: 21000, peso: 0.5, rentM2: 12, saleM2: 2500, lat: 40.596, lng: -3.497, cp: "281", chalets: 3, ambiente: ["en urbanización con parcelas", "en un entorno tranquilo y verde", "cerca de la A-1"] },
  // Noroeste y Sierra
  { nombre: "Las Rozas de Madrid", zonaId: 9, poblacion: 96000, peso: 3, rentM2: 17, saleM2: 4000, lat: 40.493, lng: -3.874, cp: "282", chalets: 2, ambiente: ["cerca de Las Rozas Village y de la A-6", "con cercanías y buenos colegios", "en zona residencial con jardines"] },
  { nombre: "Majadahonda", zonaId: 9, poblacion: 72000, peso: 2.5, rentM2: 17.5, saleM2: 4200, lat: 40.473, lng: -3.872, cp: "282", chalets: 2, ambiente: ["junto al hospital Puerta de Hierro", "en zona residencial de alto nivel", "con colegios bilingües en el entorno"] },
  { nombre: "Pozuelo de Alarcón", zonaId: 9, poblacion: 87000, peso: 3, rentM2: 19, saleM2: 5000, lat: 40.436, lng: -3.813, cp: "282", chalets: 2, ambiente: ["en una de las zonas más exclusivas de la Comunidad", "junto a la Ciudad de la Imagen", "con cercanías y metro ligero"] },
  { nombre: "Boadilla del Monte", zonaId: 9, poblacion: 60000, peso: 2, rentM2: 17, saleM2: 4100, lat: 40.405, lng: -3.878, cp: "266", chalets: 3, ambiente: ["en urbanización con piscina y pádel", "con metro ligero y colegios internacionales", "rodeado de zonas verdes"] },
  { nombre: "Torrelodones", zonaId: 9, poblacion: 24000, peso: 1, rentM2: 16, saleM2: 4000, lat: 40.577, lng: -3.923, cp: "282", chalets: 3, ambiente: ["a los pies de la sierra", "con cercanías directas a Madrid", "en un entorno natural privilegiado"] },
  { nombre: "Collado Villalba", zonaId: 9, poblacion: 63000, peso: 1.5, rentM2: 11.5, saleM2: 2500, lat: 40.635, lng: -4.006, cp: "284", ambiente: ["con cercanías a Madrid y a la sierra", "en una localidad con toda clase de servicios", "cerca de la A-6"] },
  { nombre: "Galapagar", zonaId: 9, poblacion: 34000, peso: 0.7, rentM2: 11, saleM2: 2700, lat: 40.579, lng: -4.001, cp: "288", chalets: 3, ambiente: ["en la sierra, con vistas espectaculares", "en zona de chalés y jardines", "junto al embalse de Valmayor"] },
  { nombre: "Villaviciosa de Odón", zonaId: 9, poblacion: 28000, peso: 1, rentM2: 13, saleM2: 3000, lat: 40.357, lng: -3.9, cp: "286", chalets: 3, ambiente: ["cerca de la Universidad Europea", "en urbanización con zonas comunes", "rodeado de encinares"] },
  { nombre: "El Escorial", zonaId: 9, poblacion: 16000, peso: 0.5, rentM2: 10.5, saleM2: 2600, lat: 40.585, lng: -4.133, cp: "282", chalets: 2, ambiente: ["a la sombra del Monasterio", "en plena sierra", "con cercanías a Madrid"] },
  { nombre: "Guadarrama", zonaId: 9, poblacion: 15000, peso: 0.5, rentM2: 10, saleM2: 2500, lat: 40.673, lng: -4.087, cp: "284", chalets: 2, ambiente: ["a las puertas de la sierra", "con cercanías y senderismo a mano", "en un pueblo tranquilo"] },
  { nombre: "Villanueva de la Cañada", zonaId: 9, poblacion: 24000, peso: 0.7, rentM2: 13.5, saleM2: 3100, lat: 40.446, lng: -3.993, cp: "266", chalets: 3, ambiente: ["cerca de la Universidad Camilo José Cela", "en urbanización con piscina", "en un entorno familiar"] },
  // Sureste
  { nombre: "Rivas-Vaciamadrid", zonaId: 10, poblacion: 93000, peso: 2.5, rentM2: 14, saleM2: 3000, lat: 40.352, lng: -3.517, cp: "285", ambiente: ["junto al parque del Sureste", "con metro y carril bici", "en una ciudad joven y muy verde"] },
  { nombre: "Arganda del Rey", zonaId: 10, poblacion: 56000, peso: 1.5, rentM2: 11.5, saleM2: 2300, lat: 40.301, lng: -3.437, cp: "285", ambiente: ["con metro y tren de Arganda", "cerca de la laguna del Campillo", "con precios asequibles"] },
  { nombre: "Velilla de San Antonio", zonaId: 10, poblacion: 13000, peso: 0.5, rentM2: 10.5, saleM2: 2000, lat: 40.372, lng: -3.49, cp: "285", chalets: 2, ambiente: ["en un entorno tranquilo", "cerca de la laguna", "con tranquilidad y precios contenidos"] },
];

const CALLES_GENERICAS = [
  "Calle Mayor", "Calle Real", "Avenida de España", "Calle de la Constitución", "Calle del Pilar",
  "Avenida de Madrid", "Calle de la Iglesia", "Calle de Cervantes", "Calle de Goya", "Calle de Velázquez",
  "Avenida de la Libertad", "Calle del Carmen", "Calle de San Isidro", "Plaza de España", "Calle de la Paz",
  "Avenida de los Pinos", "Calle de las Encinas", "Calle del Olivo", "Calle de Miguel de Cervantes", "Calle de Pablo Iglesias",
];

export interface GeoDataset {
  zonas: ZonaRow[];
  municipios: MunicipioRow[];
  distritos: DistritoRow[];
  barrios: BarrioRow[];
  sinonimos: SinonimoRow[];
  lugares: Lugar[];
}

export function buildGeo(): GeoDataset {
  const municipios: MunicipioRow[] = [];
  const distritos: DistritoRow[] = [];
  const barrios: BarrioRow[] = [];
  const lugares: Lugar[] = [];

  municipios.push({ id: 1, nombre: "Madrid", zona_id: 1, es_capital: true, poblacion: 3_400_000 });

  let distritoId = 0;
  let barrioId = 0;
  for (const d of DISTRITOS) {
    distritoId += 1;
    distritos.push({ id: distritoId, municipio_id: 1, nombre: d.nombre, zona_id: d.zonaId });
    const bs = d.barrios.map((nombre) => {
      barrioId += 1;
      barrios.push({ id: barrioId, distrito_id: distritoId, nombre });
      return { id: barrioId, nombre };
    });
    lugares.push({
      municipioId: 1, municipio: "Madrid", distritoId, distrito: d.nombre, barrios: bs, zonaId: d.zonaId,
      peso: d.peso, rentM2: d.rentM2, saleM2: d.saleM2, lat: d.lat, lng: d.lng, cps: d.cps,
      calles: d.calles, ambiente: d.ambiente, estudiantil: d.estudiantil,
      chalets: ["Hortaleza", "Fuencarral-El Pardo", "Moncloa-Aravaca", "Barajas"].includes(d.nombre) ? 1 : 0,
    });
  }

  let municipioId = 1;
  for (const m of MUNICIPIOS) {
    municipioId += 1;
    municipios.push({ id: municipioId, nombre: m.nombre, zona_id: m.zonaId, es_capital: false, poblacion: m.poblacion });
    lugares.push({
      municipioId, municipio: m.nombre, distritoId: null, distrito: null, barrios: [], zonaId: m.zonaId,
      peso: m.peso, rentM2: m.rentM2, saleM2: m.saleM2, lat: m.lat, lng: m.lng,
      cps: [m.cp], // prefijo de 3 cifras: el generador de edificios añade las 2 últimas
      calles: CALLES_GENERICAS, ambiente: m.ambiente, estudiantil: m.estudiantil, chalets: m.chalets,
    });
  }

  const sinonimos = buildSinonimos(municipios, distritos, barrios);
  return { zonas: ZONAS, municipios, distritos, barrios, sinonimos, lugares };
}

function buildSinonimos(municipios: MunicipioRow[], distritos: DistritoRow[], barrios: BarrioRow[]): SinonimoRow[] {
  const out: SinonimoRow[] = [];
  const z = (nombre: string) => ZONAS.find((x) => x.nombre === nombre)!.id;
  const m = (nombre: string) => municipios.find((x) => x.nombre === nombre)!.id;
  const d = (nombre: string) => distritos.find((x) => x.nombre === nombre)!.id;
  const b = (nombre: string) => barrios.find((x) => x.nombre === nombre)!.id;
  const add = (termino: string, entidad: SinonimoRow["entidad"], id: number) =>
    out.push({ termino, entidad, entidad_id: id });

  // "Sur", "norte"… son ambiguos: apuntan a la zona de la capital y a la metropolitana (el chat debe explicitar la suposición).
  for (const t of ["madrid centro", "el centro", "centro de madrid"]) add(t, "zona", z("Madrid Centro"));
  add("centro", "zona", z("Madrid Centro"));
  add("centro", "distrito", d("Centro"));
  for (const t of ["madrid sur", "el sur", "sur"]) add(t, "zona", z("Madrid Sur"));
  add("el sur", "zona", z("Sur metropolitano"));
  add("sur", "zona", z("Sur metropolitano"));
  for (const t of ["madrid norte", "el norte", "norte"]) add(t, "zona", z("Madrid Norte"));
  add("el norte", "zona", z("Norte metropolitano"));
  add("norte", "zona", z("Norte metropolitano"));
  for (const t of ["madrid este", "el este", "este"]) add(t, "zona", z("Madrid Este"));
  add("este", "zona", z("Corredor del Henares"));
  add("el este", "zona", z("Corredor del Henares"));
  for (const t of ["madrid oeste", "el oeste", "oeste"]) add(t, "zona", z("Madrid Oeste"));
  add("oeste", "zona", z("Noroeste y Sierra"));
  add("el oeste", "zona", z("Noroeste y Sierra"));
  add("henares", "zona", z("Corredor del Henares"));
  add("sierra", "zona", z("Noroeste y Sierra"));
  add("noroeste", "zona", z("Noroeste y Sierra"));
  add("sureste", "zona", z("Sureste"));

  for (const t of ["madrid", "madrid capital", "capital"]) add(t, "municipio", 1);
  add("vallecas", "distrito", d("Puente de Vallecas"));
  add("vallecas", "distrito", d("Villa de Vallecas"));
  add("moncloa", "distrito", d("Moncloa-Aravaca"));
  add("aravaca", "barrio", b("Aravaca"));
  add("lavapies", "barrio", b("Embajadores"));
  add("malasana", "barrio", b("Universidad"));
  add("chueca", "barrio", b("Justicia"));
  add("la latina", "barrio", b("Palacio"));
  add("el pardo", "barrio", b("El Pardo"));
  add("san blas", "distrito", d("San Blas-Canillejas"));
  add("canillejas", "barrio", b("Canillejas"));
  add("fuencarral", "distrito", d("Fuencarral-El Pardo"));
  add("alcala", "municipio", m("Alcalá de Henares"));
  add("torrejon", "municipio", m("Torrejón de Ardoz"));
  add("pozuelo", "municipio", m("Pozuelo de Alarcón"));
  add("boadilla", "municipio", m("Boadilla del Monte"));
  add("las rozas", "municipio", m("Las Rozas de Madrid"));
  add("rivas", "municipio", m("Rivas-Vaciamadrid"));
  add("arganda", "municipio", m("Arganda del Rey"));
  add("sanse", "municipio", m("San Sebastián de los Reyes"));
  add("san sebastian de los reyes", "municipio", m("San Sebastián de los Reyes"));
  add("colmenar", "municipio", m("Colmenar Viejo"));
  add("villalba", "municipio", m("Collado Villalba"));
  add("villaviciosa", "municipio", m("Villaviciosa de Odón"));
  add("la moraleja", "municipio", m("Alcobendas"));
  add("humanes", "municipio", m("Humanes de Madrid"));
  return out;
}
