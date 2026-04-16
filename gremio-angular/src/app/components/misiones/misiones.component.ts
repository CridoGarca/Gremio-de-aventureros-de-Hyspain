import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';
import { Mision } from '../../models/models';
import { PUNTOS_DIFICULTAD, COOLDOWNS_MS, LIMITE_HISTORIAL, calcularRango } from '../../constants/rangos';

@Component({
  selector: 'app-misiones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './misiones.component.html'
})
export class MisionesComponent {
  private db = inject(DbService);
  auth = inject(AuthService);

  misiones = toSignal(
    this.db.getMisiones$().pipe(catchError(e => { console.error('Error cargando misiones:', e); return of([]); })),
    { initialValue: [] as Mision[] }
  );

  dificultades = toSignal(
    this.db.getDificultades$().pipe(catchError(e => { console.error('Error cargando dificultades:', e); return of([]); })),
    { initialValue: [] }
  );

  misionesPorDificultad = computed(() => {
    const difs = [...this.dificultades()].sort((a, b) => a.orden - b.orden);
    const misiones = this.misiones();
    return difs
      .map(d => ({ dificultad: d, misiones: misiones.filter(m => m.dificultad === d.nombre) }))
      .filter(g => g.misiones.length > 0);
  });

  // Modal editar misión
  modalEditar = signal(false);
  editId: number | null = null;
  editTitulo = ''; editDificultad = 'Fácil'; editRecompensa = ''; editMateriales = ''; editDescripcion = ''

  puntosDificultad(dif: string): number {
    return this.dificultades().find(d => d.nombre === dif)?.puntos ?? PUNTOS_DIFICULTAD[dif] ?? 0;
  }

  colorDificultad(d: string): string {
    if (d === 'Fácil') return 'text-green-400';
    if (d === 'Media') return 'text-yellow-400';
    if (d === 'Difícil') return 'text-orange-500';
    return 'text-red-500 font-bold drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]';
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
    u.misionActiva = { id: m.id, titulo: m.titulo, recompensa: m.recompensa, materiales: m.materiales || '', dificultad: m.dificultad, descripcion: m.descripcion };
    await this.db.actualizarUsuario(u.nombre, { misionActiva: u.misionActiva });
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
    this.modalEditar.set(true);
  }

  cerrarEditar(): void { this.modalEditar.set(false); this.editId = null; }

  async guardarEdicion(): Promise<void> {
    if (!this.editId) return;
    await this.db.actualizarMision(this.editId, {
      titulo: this.editTitulo, dificultad: this.editDificultad,
      recompensa: this.editRecompensa, materiales: this.editMateriales,
      descripcion: this.editDescripcion
    });
    this.cerrarEditar();
  }
}
