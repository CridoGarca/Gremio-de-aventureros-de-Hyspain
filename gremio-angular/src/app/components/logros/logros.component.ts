import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';
import { Logro } from '../../models/models';
import { DATA_BRUTA } from '../../constants/logros-data';
import { temaLogro } from '../../constants/rangos';

interface ProgresoCat {
  categoria: string; icon: string;
  nivelNombre: string; nivelReq: string;
  cantidad: number; porcentaje: number;
  completado: boolean; tema: { card: string; text: string };
}

@Component({
  selector: 'app-logros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './logros.component.html'
})
export class LogrosComponent implements OnInit, OnDestroy {
  tabActivo = signal<'personales' | 'catalogo'>('personales');
  logrosPersonales: ProgresoCat[] = [];
  logrosCatalogo: Logro[] = [];
  private sub?: Subscription;

  // Modal editar logro
  modalEditar = signal(false);
  editLogroId = '';
  editLogroNombre = '';
  editRecompensa = '';

  temaLogro = temaLogro;

  constructor(public auth: AuthService, private db: DbService) {}

  ngOnInit(): void {
    this.cargarPersonales();
    this.sub = this.db.getLogros$().subscribe(logros => {
      this.logrosCatalogo = logros;
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  cambiarTab(tab: 'personales' | 'catalogo'): void {
    this.tabActivo.set(tab);
    if (tab === 'personales') this.cargarPersonales();
  }

  private cargarPersonales(): void {
    const u = this.auth.usuario();
    const progreso = u?.progresoLogros || {};
    this.logrosPersonales = DATA_BRUTA.map(cat => {
      const cantidad = progreso[cat.categoria] || 0;
      let nivelActual = cat.niveles[cat.niveles.length - 1];
      let completado = true;
      for (const lvl of cat.niveles) {
        const req = parseInt(lvl.req.replace(/\./g, ''), 10);
        if (cantidad < req) { nivelActual = lvl; completado = false; break; }
      }
      const reqNum = parseInt(nivelActual.req.replace(/\./g, ''), 10);
      const porcentaje = completado ? 100 : Math.min(100, Math.floor((cantidad / reqNum) * 100));
      return { categoria: cat.categoria, icon: cat.icon, nivelNombre: nivelActual.nombre, nivelReq: nivelActual.req, cantidad, porcentaje, completado, tema: temaLogro(cat.categoria) };
    });
  }

  abrirEditarLogro(logro: Logro): void {
    this.editLogroId = logro.id;
    this.editLogroNombre = `${logro.nombre} (${logro.recurso})`;
    this.editRecompensa = logro.recompensa !== 'Recompensa no establecida' ? logro.recompensa : '';
    this.modalEditar.set(true);
  }

  cerrarEditarLogro(): void { this.modalEditar.set(false); this.editLogroId = ''; }

  async guardarLogro(): Promise<void> {
    if (!this.editLogroId) return;
    await this.db.actualizarLogro(this.editLogroId, this.editRecompensa.trim() || 'Recompensa no establecida');
    this.cerrarEditarLogro();
  }
}
