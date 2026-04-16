import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';
import { Usuario, Dificultad } from '../../models/models';
import { PUNTOS_DIFICULTAD, COOLDOWNS_MS, LIMITE_HISTORIAL, calcularRango, colorRango } from '../../constants/rangos';
import { CATEGORIAS_RECURSOS } from '../../constants/logros-data';

@Component({
  selector: 'app-seguimiento',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './seguimiento.component.html'
})
export class SeguimientoComponent {
  private db = inject(DbService);
  auth = inject(AuthService);

  usuarios = toSignal(
    this.db.getUsuarios$().pipe(
      map(u => u.sort((a, b) => b.puntos - a.puntos)),
      catchError(e => { console.error('Error cargando usuarios:', e); return of([]); })
    ),
    { initialValue: [] as Usuario[] }
  );

  private dificultades = toSignal(
    this.db.getDificultades$().pipe(catchError(e => { console.error(e); return of([]); })),
    { initialValue: [] as Dificultad[] }
  );

  // Modal completar misión
  modalCompletar = signal(false);
  nombreCompletando = '';
  xpYaEntregada = false;

  // Modal ajustar puntos
  modalPuntos = signal(false);
  nombreAjuste = '';
  valorAjuste = 0;
  colorRango = colorRango;

  private puntosDificultad(dif: string): number {
    return this.dificultades().find(d => d.nombre === dif)?.puntos ?? PUNTOS_DIFICULTAD[dif] ?? 0;
  }

  abrirCompletar(nombreAventurero: string): void {
    this.nombreCompletando = nombreAventurero;
    this.xpYaEntregada = false;
    this.modalCompletar.set(true);
  }

  cerrarCompletar(): void {
    this.modalCompletar.set(false);
    this.nombreCompletando = '';
  }

  async confirmarCompletar(): Promise<void> {
    const nombreAventurero = this.nombreCompletando;
    this.cerrarCompletar();
    const u = { ...this.usuarios().find(x => x.nombre === nombreAventurero)! };
    if (!u || !u.misionActiva) return;

    const dif = u.misionActiva.dificultad;
    const pts = this.puntosDificultad(dif);
    u.puntos = (u.puntos || 0) + pts;
    u.puntosSemanales = (u.puntosSemanales || 0) + pts;
    u.rango = calcularRango(u.puntos, u.rol, u.nombre);

    // Cooldown
    if (!u.cooldownsMisiones) u.cooldownsMisiones = {};
    u.cooldownsMisiones[dif] = Date.now() + (COOLDOWNS_MS[dif] || 0);

    // Anti-fardeo
    if (!u.historialMisiones) u.historialMisiones = { 'Fácil': [], 'Media': [], 'Difícil': [], 'Épica': [] };
    if (!u.historialMisiones[dif]) u.historialMisiones[dif] = [];
    u.historialMisiones[dif].push(u.misionActiva.id);
    const limite = LIMITE_HISTORIAL[dif] || 6;
    if (u.historialMisiones[dif].length > limite) u.historialMisiones[dif].shift();

    // Logros
    if (!u.progresoLogros) u.progresoLogros = {};
    u.progresoLogros['Misiones Totales'] = (u.progresoLogros['Misiones Totales'] || 0) + 1;
    if (dif === 'Fácil') u.progresoLogros['Misiones Fáciles'] = (u.progresoLogros['Misiones Fáciles'] || 0) + 1;
    if (dif === 'Media') u.progresoLogros['Misiones Medias'] = (u.progresoLogros['Misiones Medias'] || 0) + 1;
    if (dif === 'Difícil') u.progresoLogros['Misiones Difíciles'] = (u.progresoLogros['Misiones Difíciles'] || 0) + 1;

    // Parser mágico de recursos
    const texto = ((u.misionActiva.titulo || '') + ' ' + (u.misionActiva.descripcion || '')).toLowerCase();
    CATEGORIAS_RECURSOS.forEach(recurso => {
      const regex = new RegExp(`(\\d+)\\s*(?:de\\s+|x\\s*)?${recurso.toLowerCase()}`, 'g');
      let match;
      while ((match = regex.exec(texto)) !== null) {
        u.progresoLogros[recurso] = (u.progresoLogros[recurso] || 0) + parseInt(match[1], 10);
      }
    });

    // XP pendiente de entrega
    u.xpPendienteEntrega = this.xpYaEntregada
      ? null
      : { mision: u.misionActiva.titulo, puntos: pts, fecha: Date.now() };

    u.misionActiva = null;
    await this.db.actualizarUsuario(u.nombre, u);
    const sesion = this.auth.usuario();
    if (sesion?.nombre === u.nombre) this.auth.actualizarUsuarioEnMemoria(u);
  }

  abrirAjustePuntos(nombre: string): void {
    this.nombreAjuste = nombre; this.valorAjuste = 0; this.modalPuntos.set(true);
  }

  cerrarAjustePuntos(): void { this.modalPuntos.set(false); this.nombreAjuste = ''; }

  async confirmarAjuste(): Promise<void> {
    if (isNaN(this.valorAjuste)) { alert('Introduce un número válido.'); return; }
    const u = this.usuarios().find(x => x.nombre === this.nombreAjuste);
    if (!u) return;
    const puntos = Math.max(0, (u.puntos || 0) + this.valorAjuste);
    const puntosSemanales = Math.max(0, (u.puntosSemanales || 0) + this.valorAjuste);
    const rango = calcularRango(puntos, u.rol, u.nombre);
    await this.db.actualizarUsuario(u.nombre, { puntos, puntosSemanales, rango });
    const sesion = this.auth.usuario();
    if (sesion?.nombre === u.nombre) this.auth.actualizarUsuarioEnMemoria({ ...sesion, puntos, puntosSemanales, rango });
    this.cerrarAjustePuntos();
  }
}
