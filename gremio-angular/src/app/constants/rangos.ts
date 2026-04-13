export const PUNTOS_DIFICULTAD: { [key: string]: number } = {
  'Fácil': 10, 'Media': 25, 'Difícil': 75, 'Épica': 250
};

export const COOLDOWNS_MS: { [key: string]: number } = {
  'Fácil': 20 * 60 * 1000,
  'Media': 30 * 60 * 1000,
  'Difícil': 60 * 60 * 1000,
  'Épica': 24 * 60 * 60 * 1000
};

export const LIMITE_HISTORIAL: { [key: string]: number } = {
  'Fácil': 6, 'Media': 6, 'Difícil': 6, 'Épica': 3
};

export function calcularRango(puntos: number, rol: string, nombre: string): string {
  if (rol === 'ADMIN' || nombre === 'ADMIN') return 'Leyenda';
  const p = isNaN(puntos) ? 0 : puntos;
  if (p >= 25000) return 'Leyenda';
  if (p >= 15000) return 'S+';
  if (p >= 10000) return 'S';
  if (p >= 7500) return 'A+';
  if (p >= 5000) return 'A';
  if (p >= 3500) return 'B+';
  if (p >= 2000) return 'B';
  if (p >= 1000) return 'C+';
  if (p >= 500) return 'C';
  if (p >= 250) return 'D+';
  if (p >= 100) return 'D';
  if (p >= 50) return 'E+';
  return 'E';
}

export function colorRango(rango: string): string {
  if (!rango) return 'text-gray-300';
  if (rango === 'Leyenda') return 'text-yellow-300 font-black drop-shadow-[0_0_8px_rgba(253,224,71,0.8)]';
  if (rango.includes('S')) return 'text-red-500 font-bold drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]';
  if (rango.includes('A')) return 'text-orange-400 font-bold';
  if (rango.includes('B')) return 'text-purple-400 font-bold';
  if (rango.includes('C')) return 'text-blue-400 font-bold';
  if (rango.includes('D')) return 'text-green-400 font-bold';
  return 'text-gray-300 font-bold';
}

export function temaLogro(categoria: string): { card: string; text: string } {
  if (categoria.includes('Copper') || categoria.includes('Fire') || categoria.includes('Difíciles'))
    return { card: 'border-orange-700/40 from-orange-900/20 to-black/60 hover:border-orange-500/60', text: 'text-orange-400' };
  if (categoria.includes('Iron') || categoria.includes('Hide'))
    return { card: 'border-stone-500/40 from-stone-800/20 to-black/60 hover:border-stone-400/60', text: 'text-stone-300' };
  if (categoria.includes('Gold') || categoria.includes('Sunflowers') || categoria.includes('Medias'))
    return { card: 'border-yellow-600/40 from-yellow-900/20 to-black/60 hover:border-yellow-400/60', text: 'text-yellow-400' };
  if (categoria.includes('Cobalt') || categoria.includes('Blue') || categoria.includes('Storm') || categoria.includes('Kelp'))
    return { card: 'border-blue-700/40 from-blue-900/20 to-black/60 hover:border-blue-500/60', text: 'text-blue-400' };
  if (categoria.includes('Thorium') || categoria.includes('Void') || categoria.includes('Totales'))
    return { card: 'border-purple-700/40 from-purple-900/20 to-black/60 hover:border-purple-400/60', text: 'text-purple-400' };
  if (categoria.includes('Adamantite') || categoria.includes('Venom') || categoria.includes('Fáciles') || categoria.includes('Chitin'))
    return { card: 'border-emerald-700/40 from-emerald-900/20 to-black/60 hover:border-emerald-400/60', text: 'text-emerald-400' };
  if (categoria.includes('Wildberries') || categoria.includes('Blood') || categoria.includes('Red') || categoria.includes('Wildmeat'))
    return { card: 'border-rose-700/40 from-rose-900/20 to-black/60 hover:border-rose-400/60', text: 'text-rose-400' };
  if (categoria.includes('Treesap'))
    return { card: 'border-amber-700/40 from-amber-900/20 to-black/60 hover:border-amber-500/60', text: 'text-amber-400' };
  return { card: 'border-gray-700/50 from-gray-900/20 to-black/60 hover:border-gray-500/60', text: 'text-gray-300' };
}
