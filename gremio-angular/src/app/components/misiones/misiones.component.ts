import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';
import { Mision, Dificultad } from '../../models/models';
import { PUNTOS_DIFICULTAD, COOLDOWNS_MS, LIMITE_HISTORIAL } from '../../constants/rangos';
import { deleteField } from 'firebase/firestore';

// Paleta de colores para categorías (solo ADMIN puede asignarlos)
export const COLOR_PALETTE = [
  { name: 'Blanco',       hex: '#ffffff' },
  { name: 'Verde claro',  hex: '#86efac' },
  { name: 'Verde oscuro', hex: '#16a34a' },
  { name: 'Naranja',      hex: '#f97316' },
  { name: 'Rojo',         hex: '#ef4444' },
  { name: 'Morado',       hex: '#a855f7' },
  { name: 'Amarillo',     hex: '#eab308' },
  { name: 'Azul',         hex: '#3b82f6' },
];

const COLOR_DEFAULT = '#d4af37'; // dorado (por defecto)

// Bloques para label de CC en tooltip
const BLOQUES_NOMBRE: Record<number, string> = {
  1: 'Bloque 1 (CC compartido)',
  2: 'Bloque 2 (CC compartido)',
  3: 'Especial (sin CC)',
};

@Component({
  selector: 'app-misiones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './misiones.component.html'
})
export class MisionesComponent {
  private db = inject(DbService);
  auth = inject(AuthService);
  colorPalette = COLOR_PALETTE;

  misiones = toSignal(
    this.db.getMisiones$().pipe(catchError(e => { console.error('Error cargando misiones:', e); return of([]); })),
    { initialValue: [] as Mision[] }
  );

  dificultades = toSignal(
    this.db.getDificultades$().pipe(catchError(e => { console.error('Error cargando dificultades:', e); return of([]); })),
    { initialValue: [] as Dificultad[] }
  );

  ordenMisiones = signal<'asc' | 'desc'>('asc');

  misionesPorDificultad = computed(() => {
    const orden = this.ordenMisiones();
    const difs = [...this.dificultades()].sort((a, b) =>
      orden === 'asc' ? a.orden - b.orden : b.orden - a.orden
    );
    const misiones = this.misiones();
    return difs
      .map(d => ({ dificultad: d, misiones: misiones.filter(m => m.dificultad === d.nombre) }))
      .filter(g => g.misiones.length > 0);
  });

  // Retorna el color hex de una dificultad (o default dorado)
  colorHexDificultad(nombre: string): string {
    return this.dificultades().find(d => d.nombre === nombre)?.color || COLOR_DEFAULT;
  }

  // Retorna la imagen de fondo de una dificultad
  fondoDificultad(nombre: string): string {
    return this.dificultades().find(d => d.nombre === nombre)?.fondo || '';
  }

  // Modal editar misión individual
  modalEditar = signal(false);
  editId: number | null = null;
  editTitulo = ''; editDificultad = 'Fácil'; editRecompensa = ''; editMateriales = ''; editDescripcion = '';
  editOro = 0; editPlata = 0; editCobre = 0;

  // Modal editar categoría (dificultad)
  modalEditarCat = signal(false);
  editCatNombre = '';
  editCatNuevoNombre = '';
  editCatPuntos = 10;
  editCatCc = 0;
  editCatOrden = 1;
  editCatBloque = 0;
  editCatColor = COLOR_DEFAULT;
  editCatFondo = '';

  puntosDificultad(dif: string): number {
    return this.dificultades().find(d => d.nombre === dif)?.puntos ?? PUNTOS_DIFICULTAD[dif] ?? 0;
  }

  enCooldown(m: Mision): number {
    const u = this.auth.usuario();
    if (!u?.cooldownsMisiones?.[m.dificultad]) return 0;
    return Math.max(0, u.cooldownsMisiones[m.dificultad] - Date.now());
  }

  formatCooldown(ms: number): string {
    const h = Math.floor(ms / 3600000);
    const min = Math.ceil((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  }

  enHistorial(m: Mision): boolean {
    const u = this.auth.usuario();
    return !!(u?.historialMisiones?.[m.dificultad]?.includes(m.id));
  }

  misionActivaEsEsta(m: Mision): boolean {
    return this.auth.usuario()?.misionActiva?.id === m.id;
  }

  tieneMisionActiva(): boolean {
    return !!this.auth.usuario()?.misionActiva;
  }

  async aceptarMision(m: Mision): Promise<void> {
    const u = { ...this.auth.usuario()! };
    if (u.misionActiva) { alert('Ya tienes una misión en curso.'); return; }
    const cd = this.enCooldown(m);
    if (cd > 0) { alert(`Aún te estás recuperando. No puedes aceptar misiones de dificultad ${m.dificultad} todavía.`); return; }
    if (this.enHistorial(m)) {
      const lim = LIMITE_HISTORIAL[m.dificultad] || 6;
      alert(`Debes completar otras ${lim} misiones de dificultad ${m.dificultad} antes de poder repetir esta.`); return;
    }
    const misionActiva: any = { id: m.id, titulo: m.titulo, recompensa: m.recompensa, materiales: m.materiales || '', dificultad: m.dificultad, descripcion: m.descripcion };
    if (m.oro) misionActiva.oro = m.oro;
    if (m.plata) misionActiva.plata = m.plata;
    if (m.cobre) misionActiva.cobre = m.cobre;
    u.misionActiva = misionActiva;
    await this.db.actualizarUsuario(u.nombre, { misionActiva });
    this.auth.actualizarUsuarioEnMemoria(u);
  }

  async abandonarMision(): Promise<void> {
    if (!confirm('¿Seguro que quieres abandonar esta misión? (No activará el tiempo de descanso)')) return;
    const u = { ...this.auth.usuario()! };
    u.misionActiva = null;
    await this.db.actualizarUsuario(u.nombre, { misionActiva: null });
    this.auth.actualizarUsuarioEnMemoria(u);
  }

  async eliminarMision(id: number): Promise<void> {
    if (confirm('¿Retirar esta misión del tablón?')) await this.db.eliminarMision(id);
  }

  abrirEditar(m: Mision): void {
    this.editId = m.id; this.editTitulo = m.titulo;
    this.editDificultad = m.dificultad; this.editRecompensa = m.recompensa;
    this.editMateriales = m.materiales || ''; this.editDescripcion = m.descripcion;
    this.editOro = m.oro || 0; this.editPlata = m.plata || 0; this.editCobre = m.cobre || 0;
    this.modalEditar.set(true);
  }

  cerrarEditar(): void { this.modalEditar.set(false); this.editId = null; }

  async guardarEdicion(): Promise<void> {
    if (!this.editId) return;
    const data: Record<string, unknown> = {
      titulo: this.editTitulo, dificultad: this.editDificultad,
      recompensa: this.editRecompensa, materiales: this.editMateriales,
      descripcion: this.editDescripcion,
      oro: this.editOro > 0 ? this.editOro : deleteField(),
      plata: this.editPlata > 0 ? this.editPlata : deleteField(),
      cobre: this.editCobre > 0 ? this.editCobre : deleteField(),
    };
    await this.db.actualizarMision(this.editId, data as Partial<Mision>);
    this.cerrarEditar();
  }

  // ── Editar categoría (dificultad) ───────────────────────
  abrirEditarCat(d: Dificultad): void {
    this.editCatNombre = d.nombre;
    this.editCatNuevoNombre = d.nombre;
    this.editCatPuntos = d.puntos;
    this.editCatCc = d.cc ?? 0;
    this.editCatOrden = d.orden;
    this.editCatBloque = d.bloque ?? 0;
    this.editCatColor = d.color || COLOR_DEFAULT;
    this.editCatFondo = d.fondo || '';
    this.modalEditarCat.set(true);
  }

  cerrarEditarCat(): void { this.modalEditarCat.set(false); }

  async guardarEditarCat(): Promise<void> {
    const nombre = this.editCatNombre;
    const datos: Record<string, unknown> = {
      puntos: this.editCatPuntos,
      cc: this.editCatCc,
      orden: this.editCatOrden,
      color: this.editCatColor,
      bloque: this.editCatBloque ? this.editCatBloque : deleteField(),
      fondo: this.editCatFondo ? this.editCatFondo : deleteField(),
    };
    await this.db.actualizarDificultad(nombre, datos);
    this.cerrarEditarCat();
  }

  seleccionarFondoCat(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_W = 600; const MAX_H = 400;
        let w = img.width; let h = img.height;
        if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
        if (h > MAX_H) { w = Math.round(w * MAX_H / h); h = MAX_H; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        this.editCatFondo = canvas.toDataURL('image/jpeg', 0.65);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  // ── Reordenar categorías ──────────────────────────────────
  async moverCategoria(d: Dificultad, direccion: 'arriba' | 'abajo'): Promise<void> {
    const lista = [...this.dificultades()].sort((a, b) => a.orden - b.orden);
    const idx = lista.findIndex(x => x.nombre === d.nombre);
    const swapIdx = direccion === 'arriba' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= lista.length) return;
    const otro = lista[swapIdx];
    const ordenA = d.orden;
    const ordenB = otro.orden;
    await Promise.all([
      this.db.actualizarDificultad(d.nombre, { orden: ordenB }),
      this.db.actualizarDificultad(otro.nombre, { orden: ordenA }),
    ]);
  }

  selectColor(hex: string): void { this.editCatColor = hex; }

  bloqueLabel(b: number): string { return BLOQUES_NOMBRE[b] || 'Sin bloque (CC individual)'; }
}
