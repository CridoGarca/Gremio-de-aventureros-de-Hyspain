import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';
import { Usuario, Dificultad } from '../../models/models';
import { PUNTOS_DIFICULTAD, COOLDOWNS_MS, LIMITE_HISTORIAL } from '../../constants/rangos';
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
  dineroEntregado = 0;

  // Modal ajustar puntos
  modalPuntos = signal(false);
  nombreAjuste = '';
  valorAjuste = 0;

  private puntosDificultad(dif: string): number {
    return this.dificultades().find(d => d.nombre === dif)?.puntos ?? PUNTOS_DIFICULTAD[dif] ?? 0;
  }

  abrirCompletar(nombreAventurero: string): void {
    this.nombreCompletando = nombreAventurero;
    this.xpYaEntregada = false;
    this.dineroEntregado = 0;
    this.modalCompletar.set(true);
  }

  cerrarCompletar(): void {
    this.modalCompletar.set(false);
    this.nombreCompletando = '';
  }

  async confirmarCompletar(): Promise<void> {
    const nombreAventurero = this.nombreCompletando;
    const xpYaEntregada = this.xpYaEntregada;
    const dinero = this.dineroEntregado || 0;
    this.cerrarCompletar();
    const u = { ...this.usuarios().find(x => x.nombre === nombreAventurero)! };
    if (!u || !u.misionActiva) return;

    const dif = u.misionActiva.dificultad;
    const pts = this.puntosDificultad(dif);
    u.puntos = (u.puntos || 0) + pts;
    u.puntosSemanales = (u.puntosSemanales || 0) + pts;

    // Cooldown por bloques
    if (!u.cooldownsMisiones) u.cooldownsMisiones = {};
    const dificultadObj = this.dificultades().find(d => d.nombre === dif);
    const bloque = dificultadObj?.bloque != null ? Number(dificultadObj.bloque) : 0;

    if (bloque === 3) {
      // Bloque especial: sin cooldown
    } else if (bloque >= 1) {
      // CC compartido: cada dificultad del bloque entra con SU PROPIO cooldown
      this.dificultades().forEach(d => {
        if (Number(d.bloque) === bloque) {
          const dCcMs = d.cc ? d.cc * 60 * 1000 : (COOLDOWNS_MS[d.nombre] || 0);
          u.cooldownsMisiones[d.nombre] = Date.now() + dCcMs;
        }
      });
    } else {
      // Sin bloque (0): cooldown individual de esta dificultad
      const ccMs = dificultadObj?.cc ? dificultadObj.cc * 60 * 1000 : (COOLDOWNS_MS[dif] || 0);
      u.cooldownsMisiones[dif] = Date.now() + ccMs;
    }

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

    // XP pendiente de entrega:
    // - ADMIN: puede marcar como ya entregada (xpYaEntregada=true → null)
    // - MOD: siempre crea entrada pendiente, sin opción de marcarla como entregada
    const modActual = this.auth.usuario()?.nombre || 'Sistema';
    const esAdmin = this.auth.esAdminPuro();
    const misionOro = u.misionActiva.oro;
    const misionPlata = u.misionActiva.plata;
    const misionCobre = u.misionActiva.cobre;

    // Acumular monedas totales del usuario
    if (misionOro) u.oroTotal = (u.oroTotal || 0) + misionOro;
    if (misionPlata) u.plataTotal = (u.plataTotal || 0) + misionPlata;
    if (misionCobre) u.cobreTotal = (u.cobreTotal || 0) + misionCobre;

    const xpPendiente: any = {
      mision: u.misionActiva.titulo,
      puntos: pts,
      fecha: Date.now(),
      aceptadoPor: modActual,
      dineroEntregado: esAdmin ? dinero : 0,
    };
    if (u.misionActiva.recompensa) xpPendiente.recompensa = u.misionActiva.recompensa;
    if (u.misionActiva.materiales) xpPendiente.materiales = u.misionActiva.materiales;
    if (misionOro) xpPendiente.oro = misionOro;
    if (misionPlata) xpPendiente.plata = misionPlata;
    if (misionCobre) xpPendiente.cobre = misionCobre;

    u.xpPendienteEntrega = (esAdmin && xpYaEntregada) ? null : xpPendiente;

    const misionTitulo = u.misionActiva.titulo;
    u.misionActiva = null;
    await this.db.actualizarUsuario(u.nombre, u);
    const sesion = this.auth.usuario();
    if (sesion?.nombre === u.nombre) this.auth.actualizarUsuarioEnMemoria(u);

    // Guardar en historial de entregas
    const entrega: any = {
      id: Date.now(),
      mod: modActual,
      aventurero: nombreAventurero,
      mision: misionTitulo,
      puntos: pts,
      dinero,
      fecha: Date.now(),
    };
    if (misionOro) entrega.oro = misionOro;
    if (misionPlata) entrega.plata = misionPlata;
    if (misionCobre) entrega.cobre = misionCobre;
    await this.db.crearHistorialEntrega(entrega);
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
    await this.db.actualizarUsuario(u.nombre, { puntos, puntosSemanales });
    const sesion = this.auth.usuario();
    if (sesion?.nombre === u.nombre) this.auth.actualizarUsuarioEnMemoria({ ...sesion, puntos, puntosSemanales });
    this.cerrarAjustePuntos();
  }
}
