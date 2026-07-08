export const CHILE_REGIONS: Record<string, string[]> = {
  "Arica y Parinacota": ["Arica", "Camarones", "Putre", "General Lagos"],
  Tarapacá: ["Iquique", "Alto Hospicio", "Pozo Almonte", "Pica"],
  Antofagasta: [
    "Antofagasta",
    "Calama",
    "Tocopilla",
    "Mejillones",
    "San Pedro de Atacama",
  ],
  Atacama: ["Copiapó", "Caldera", "Vallenar", "Huasco"],
  Coquimbo: ["La Serena", "Coquimbo", "Ovalle", "Illapel", "Los Vilos"],
  Valparaíso: [
    "Valparaíso",
    "Viña del Mar",
    "Quilpué",
    "Villa Alemana",
    "San Antonio",
    "Quillota",
    "Los Andes",
  ],
  "Metropolitana de Santiago": [
    "Santiago",
    "Providencia",
    "Las Condes",
    "Ñuñoa",
    "Maipú",
    "Puente Alto",
    "La Florida",
    "San Bernardo",
    "Quilicura",
    "Pudahuel",
  ],
  "Libertador General Bernardo O'Higgins": [
    "Rancagua",
    "Machalí",
    "San Fernando",
    "Rengo",
    "Santa Cruz",
    "Pichilemu",
  ],
  Maule: ["Talca", "Curicó", "Linares", "Cauquenes", "Constitución"],
  Ñuble: ["Chillán", "Chillán Viejo", "San Carlos", "Bulnes"],
  Biobío: [
    "Concepción",
    "Talcahuano",
    "Los Ángeles",
    "Chiguayante",
    "San Pedro de la Paz",
    "Coronel",
  ],
  "La Araucanía": ["Temuco", "Padre Las Casas", "Angol", "Villarrica", "Pucón"],
  "Los Ríos": ["Valdivia", "La Unión", "Río Bueno", "Panguipulli"],
  "Los Lagos": ["Puerto Montt", "Osorno", "Castro", "Puerto Varas", "Ancud"],
  "Aysén del General Carlos Ibáñez del Campo": [
    "Coyhaique",
    "Puerto Aysén",
    "Chile Chico",
    "Cochrane",
  ],
  "Magallanes y de la Antártica Chilena": [
    "Punta Arenas",
    "Puerto Natales",
    "Porvenir",
    "Cabo de Hornos",
  ],
};
export const soloNombre = (value: string) =>
  value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]/g, "");
export const validarNombre = (value: string) =>
  /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]{2,}$/.test(value.trim());
export const telefonoLocal = (value: string) =>
  value.replace(/\D/g, "").replace(/^569/, "").slice(0, 8);
export const formatearTelefonoChile = (value: string) =>
  `+569${telefonoLocal(value)}`;
export const validarTelefonoChile = (value: string) =>
  /^\+569\d{8}$/.test(formatearTelefonoChile(value));
export const validarEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export const validarPassword = (value: string) => value.length >= 4;
export function formatearRutEmpresa(value: string) {
  const clean = value
    .replace(/[^0-9kK]/g, "")
    .toUpperCase()
    .slice(0, 9);
  if (!clean) return "";
  const hasVerifier = clean.length === 9;
  const body = hasVerifier ? clean.slice(0, -1) : clean;
  const verifier = hasVerifier ? clean.slice(-1) : "";
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return hasVerifier ? `${formattedBody}-${verifier}` : formattedBody;
}
export const validarRutEmpresa = (value: string) =>
  /^\d{1,2}\.\d{3}\.\d{3}-[0-9K]$/i.test(value);
