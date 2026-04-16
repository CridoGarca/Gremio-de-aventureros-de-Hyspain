import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';
import { Corredor, Escuderia, ResultadoCarrera, NoticiaCarreras } from '../../models/models';

type Vista = 'noticias' | 'clasificacion' | 'admin';
type TipoClasificacion = 'corredores' | 'escuderias';

@Component({
  selector: 'app-caballos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './caballos.component.html'
})
export class CaballosComponent {
  private db = inject(DbService);
  auth = inject(AuthService);

  vista = signal<Vista>('noticias');
  tipoClasif = signal<TipoClasificacion>('corredores');

  corredores = toSignal(
    this.db.getCorredores$().pipe(catchError(() => of([]))),
    { initialValue: [] as Corredor[] }
  );

  escuderias = toSignal(
    this.db.getEscuderias$().pipe(catchError(() => of([]))),
    { initialValue: [] as Escuderia[] }
  );

  resultados = toSignal(
    this.db.getResultados$().pipe(catchError(() => of([]))),
    { initialValue: [] as ResultadoCarrera[] }
  );

  noticias = toSignal(
    this.db.getNoticiasCarreras$().pipe(catchError(() => of([]))),
    { initialValue: [] as NoticiaCarreras[] }
  );

  corredoresOrdenados = computed(() =>
    [...this.corredores()].sort((a, b) => b.puntos - a.puntos)
  );

  escuderiasOrdenadas = computed(() =>
    [...this.escuderias()].sort((a, b) => b.puntos - a.puntos)
  );

  // ── Admin: Corredor ─────────────────────────────────────
  adminVista = signal<'corredor' | 'escuderia' | 'resultado' | 'noticia'>('corredor');
  cNombre = ''; cPais = ''; cBandera = ''; cFoto = ''; cEscuderia = '';
  eNombre = ''; ePais = ''; eBandera = ''; eFoto = ''; eColor = '#7c3aed';
  rTitulo = ''; rFecha = '';
  rLineas: { corredorId: number; posicion: number; puntos: number }[] = [];
  nTitulo = ''; nContenido = ''; nFecha = ''; nImagen = '';

  // ── Resultado inline editor ──────────────────────────────
  modalResultado = signal(false);

  escuderiaDeCorredor(nombre: string): Escuderia | undefined {
    return this.escuderias().find(e => e.nombre === nombre);
  }

  nombreCorredor(id: number): string {
    return this.corredores().find(c => c.id === id)?.nombre ?? 'Desconocido';
  }

  async crearCorredor(): Promise<void> {
    if (!this.cNombre.trim()) return;
    const id = Date.now();
    await this.db.crearCorredor({
      id, nombre: this.cNombre.trim(), pais: this.cPais.trim(),
      bandera: this.cBandera.trim(), foto: this.cFoto.trim(),
      escuderia: this.cEscuderia.trim(), puntos: 0
    });
    this.cNombre = ''; this.cPais = ''; this.cBandera = '';
    this.cFoto = ''; this.cEscuderia = '';
    alert('Corredor creado.');
  }

  async eliminarCorredor(id: number): Promise<void> {
    if (confirm('¿Eliminar corredor?')) await this.db.eliminarCorredor(id);
  }

  async crearEscuderia(): Promise<void> {
    if (!this.eNombre.trim()) return;
    const id = Date.now();
    await this.db.crearEscuderia({
      id, nombre: this.eNombre.trim(), pais: this.ePais.trim(),
      bandera: this.eBandera.trim(), foto: this.eFoto.trim(),
      color: this.eColor, puntos: 0
    });
    this.eNombre = ''; this.ePais = ''; this.eBandera = '';
    this.eFoto = ''; this.eColor = '#7c3aed';
    alert('Escudería creada.');
  }

  async eliminarEscuderia(id: number): Promise<void> {
    if (confirm('¿Eliminar escudería?')) await this.db.eliminarEscuderia(id);
  }

  agregarLinea(): void {
    this.rLineas.push({ corredorId: 0, posicion: this.rLineas.length + 1, puntos: 0 });
  }

  eliminarLinea(i: number): void {
    this.rLineas.splice(i, 1);
  }

  async guardarResultado(): Promise<void> {
    if (!this.rTitulo.trim() || this.rLineas.length === 0) return;
    const id = Date.now();
    await this.db.crearResultado({
      id, titulo: this.rTitulo.trim(),
      fecha: this.rFecha || new Date().toISOString().split('T')[0],
      resultados: this.rLineas.filter(l => l.corredorId)
    });
    // Actualizar puntos corredores
    for (const l of this.rLineas.filter(ln => ln.corredorId)) {
      const corredor = this.corredores().find(c => c.id === +l.corredorId);
      if (corredor) {
        const nuevos = corredor.puntos + l.puntos;
        await this.db.actualizarCorredor(corredor.id, { puntos: nuevos });
        // Actualizar escudería
        const esc = this.escuderias().find(e => e.nombre === corredor.escuderia);
        if (esc) await this.db.actualizarEscuderia(esc.id, { puntos: esc.puntos + l.puntos });
      }
    }
    this.rTitulo = ''; this.rFecha = ''; this.rLineas = [];
    alert('Resultado guardado y puntos actualizados.');
  }

  async eliminarResultado(id: number): Promise<void> {
    if (confirm('¿Eliminar resultado? (No revertirá los puntos)'))
      await this.db.eliminarResultado(id);
  }

  async crearNoticia(): Promise<void> {
    if (!this.nTitulo.trim()) return;
    const id = Date.now();
    await this.db.crearNoticiaCarreras({
      id, titulo: this.nTitulo.trim(), contenido: this.nContenido.trim(),
      fecha: this.nFecha || new Date().toISOString().split('T')[0],
      imagen: this.nImagen.trim() || null
    });
    this.nTitulo = ''; this.nContenido = ''; this.nFecha = ''; this.nImagen = '';
    alert('Noticia creada.');
  }

  async eliminarNoticia(id: number): Promise<void> {
    if (confirm('¿Eliminar noticia?')) await this.db.eliminarNoticiaCarreras(id);
  }
}
