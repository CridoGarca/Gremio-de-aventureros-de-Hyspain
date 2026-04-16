export interface MisionActiva {
  id: number;
  titulo: string;
  recompensa: string;
  materiales: string;
  dificultad: string;
  descripcion: string;
}

export interface Usuario {
  nombre: string;
  password: string;
  raza: string;
  faccion: string;
  foto: string;
  puntos: number;
  puntosSemanales: number;
  rango: string;
  rol: string;
  misionActiva: MisionActiva | null;
  progresoLogros: { [key: string]: number };
  cooldownsMisiones: { [key: string]: number };
  historialMisiones: { [key: string]: number[] };
}

export interface Mision {
  id: number;
  titulo: string;
  dificultad: string;
  recompensa: string;
  materiales: string;
  descripcion: string;
}

export interface Noticia {
  id: number;
  titulo: string;
  contenido: string;
  fecha: string;
  imagen: string | null;
}

export interface Logro {
  id: string;
  recurso: string;
  icono: string;
  nombre: string;
  requisito: string;
  recompensa: string;
}

export interface Dificultad {
  nombre: string;
  puntos: number;
  orden: number;
}

// ── Carreras de Caballos ──────────────────────────────────
export interface Escuderia {
  id: number;
  nombre: string;
  pais: string;
  bandera: string; // código emoji de bandera
  color: string;   // color hex de la escudería
  foto: string;
  puntos: number;
}

export interface Corredor {
  id: number;
  nombre: string;
  pais: string;
  bandera: string;
  foto: string;
  escuderia: string;
  puntos: number;
}

export interface ResultadoCarrera {
  id: number;
  titulo: string;
  fecha: string;
  resultados: { corredorId: number; posicion: number; puntos: number }[];
}

export interface NoticiaCarreras {
  id: number;
  titulo: string;
  contenido: string;
  fecha: string;
  imagen: string | null;
}
