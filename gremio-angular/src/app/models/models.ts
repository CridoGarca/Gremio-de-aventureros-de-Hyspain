export interface MisionActiva {
  id: number;
  titulo: string;
  recompensa: string;
  materiales: string;
  dificultad: string;
  descripcion: string;
  oro?: number;
  plata?: number;
  cobre?: number;
}

export interface XpPendiente {
  mision: string;
  puntos: number;
  fecha: number;
  aceptadoPor?: string;
  dineroEntregado?: number;
  recompensa?: string;
  materiales?: string;
  oro?: number;
  plata?: number;
  cobre?: number;
}

export interface Usuario {
  nombre: string;
  password: string;
  raza: string;
  faccion: string;
  foto: string;
  puntos: number;
  puntosSemanales: number;
  rol: string;
  misionActiva: MisionActiva | null;
  progresoLogros: { [key: string]: number };
  cooldownsMisiones: { [key: string]: number };
  historialMisiones: { [key: string]: number[] };
  xpPendienteEntrega?: XpPendiente | null;
  oroTotal?: number;
  plataTotal?: number;
  cobreTotal?: number;
}

export interface Mision {
  id: number;
  titulo: string;
  dificultad: string;
  recompensa: string;
  materiales: string;
  descripcion: string;
  oro?: number;
  plata?: number;
  cobre?: number;
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
  color?: string;      // hex color para el título de la categoría
  cc?: number;         // cooldown en minutos
  bloque?: number;     // 1 = Pacífico-Sombría, 2 = Demencial+, 3 = Especial (sin CC)
  fondo?: string;      // base64 background image para las tarjetas de misión
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

export interface EntregaHistorial {
  id: number;
  mod: string;
  aventurero: string;
  mision: string;
  puntos: number;
  dinero: number;
  fecha: number;
  oro?: number;
  plata?: number;
  cobre?: number;
}

export interface NoticiaCarreras {
  id: number;
  titulo: string;
  contenido: string;
  fecha: string;
  imagen: string | null;
}
