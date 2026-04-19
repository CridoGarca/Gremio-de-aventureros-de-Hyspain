import { Component, OnInit, OnDestroy, ViewChild, ElementRef, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import Cropper from 'cropperjs';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';
import { Usuario, Dificultad, EntregaHistorial, Noticia } from '../../models/models';
import { CATEGORIAS_RECURSOS } from '../../constants/logros-data';
import { DATA_BRUTA } from '../../constants/logros-data';
import { COLOR_PALETTE } from '../misiones/misiones.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html'
})
export class AdminComponent implements OnInit, OnDestroy {
  @ViewChild('imgRecorteNoticia') imgRecorteNoticia!: ElementRef<HTMLImageElement>;
  private cropper: Cropper | null = null;
  private sub?: Subscription;
  private subHistorial?: Subscription;
  private subNoticias?: Subscription;

  usuarios: Usuario[] = [];
  dificultades: Dificultad[] = [];
  historialEntregas: EntregaHistorial[] = [];
  noticias: Noticia[] = [];
  colorPalette = COLOR_PALETTE;

  // Noticia
  noticiaTitle = ''; noticiaContent = ''; imagenNoticia = ''; imgSrc = '';
  modalRecorte = signal(false); mensajeNoticiaOk = signal(false);

  // Editar noticia existente
  modalEditarNoticia = signal(false);
  noticiaEditandoId: number | null = null;
  noticiaEditTitle = ''; noticiaEditContent = ''; noticiaEditImagen = '';

  // Misión
  misionTitulo = ''; misionDificultad = 'Fácil'; misionRecompensa = ''; misionMateriales = ''; misionDesc = '';
  misionOro = 0; misionPlata = 0; misionCobre = 0;
  mensajeMisionOk = signal(false);

  // Nueva dificultad
  nuevaDifNombre = ''; nuevaDifPuntos = 10; nuevaDifCc = 0; nuevaDifBloque = 0; nuevaDifColor = '#d4af37';
  mensajeDifOk = signal(false); mensajeDifError = '';

  // Roles
  buscarRolNombre = ''; rolSeleccionado = 'Aventurero'; mensajeRol = ''; mensajeRolColor = '';

  // Reset historial
  buscarResetHistorial = '';

  // Peligro
  buscarPeligroNombre = '';
  modalLogros = signal(false); nombreEditandoLogros = '';
  categoriasMisiones = ['Misiones Totales', 'Misiones Fáciles', 'Misiones Medias', 'Misiones Difíciles'];
  todasCategorias: string[] = [];
  valoresLogros: { [key: string]: number } = {};

  constructor(public auth: AuthService, private db: DbService, private cdr: ChangeDetectorRef) {
    this.todasCategorias = [...this.categoriasMisiones, ...CATEGORIAS_RECURSOS];
  }

  ngOnInit(): void {
    this.sub = this.db.getUsuarios$().subscribe(u => {
      this.usuarios = u.sort((a, b) => a.nombre.localeCompare(b.nombre));
      this.cdr.detectChanges();
    });
    this.db.getDificultades$().subscribe(d => {
      this.dificultades = d;
      if (d.length && !d.find(x => x.nombre === this.misionDificultad)) {
        this.misionDificultad = d[0].nombre;
      }
      this.cdr.detectChanges();
    });
    this.subHistorial = this.db.getHistorialEntregas$().subscribe(h => {
      this.historialEntregas = h;
      this.cdr.detectChanges();
    });
    this.subNoticias = this.db.getNoticias$().subscribe(n => {
      this.noticias = n;
      this.cdr.detectChanges();
    });
  }
  ngOnDestroy(): void { this.sub?.unsubscribe(); this.subHistorial?.unsubscribe(); this.subNoticias?.unsubscribe(); }

  // ── Noticias ──────────────────────────────────────────────
  abrirRecorteNoticia(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      this.imgSrc = e.target?.result as string;
      this.modalRecorte.set(true);
      setTimeout(() => {
        if (this.cropper) this.cropper.destroy();
        this.cropper = new Cropper(this.imgRecorteNoticia.nativeElement, { aspectRatio: 16/9, viewMode: 1, background: false });
      }, 100);
    };
    reader.readAsDataURL(file);
  }

  confirmarRecorte(): void {
    if (!this.cropper) return;
    this.imagenNoticia = this.cropper.getCroppedCanvas({ width: 800, height: 450 }).toDataURL('image/jpeg', 0.7);
    this.cerrarRecorte();
  }

  cancelarRecorte(): void { this.imagenNoticia = ''; this.cerrarRecorte(); }

  private cerrarRecorte(): void {
    this.modalRecorte.set(false);
    if (this.cropper) { this.cropper.destroy(); this.cropper = null; }
  }

  async crearNoticia(): Promise<void> {
    if (!this.noticiaTitle.trim() || !this.noticiaContent.trim()) { alert('Falta título o contenido.'); return; }
    const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    await this.db.crearNoticia({ id: Date.now(), titulo: this.noticiaTitle.trim(), contenido: this.noticiaContent.trim(), fecha, imagen: this.imagenNoticia || null });
    this.noticiaTitle = ''; this.noticiaContent = ''; this.imagenNoticia = '';
    this.mensajeNoticiaOk.set(true); setTimeout(() => this.mensajeNoticiaOk.set(false), 3000);
  }

  abrirEditarNoticia(n: Noticia): void {
    this.noticiaEditandoId = n.id;
    this.noticiaEditTitle = n.titulo;
    this.noticiaEditContent = n.contenido;
    this.noticiaEditImagen = n.imagen || '';
    this.modalEditarNoticia.set(true);
  }

  cerrarEditarNoticia(): void {
    this.modalEditarNoticia.set(false);
    this.noticiaEditandoId = null;
  }

  abrirRecorteEditNoticia(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 800; canvas.height = 450;
        const ctx = canvas.getContext('2d')!;
        const ratio = Math.max(800 / img.width, 450 / img.height);
        const w = img.width * ratio; const h = img.height * ratio;
        const x = (800 - w) / 2; const y = (450 - h) / 2;
        ctx.drawImage(img, x, y, w, h);
        this.noticiaEditImagen = canvas.toDataURL('image/jpeg', 0.7);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async guardarEditarNoticia(): Promise<void> {
    if (!this.noticiaEditandoId) return;
    if (!this.noticiaEditTitle.trim() || !this.noticiaEditContent.trim()) { alert('Falta título o contenido.'); return; }
    await this.db.actualizarNoticia(this.noticiaEditandoId, {
      titulo: this.noticiaEditTitle.trim(),
      contenido: this.noticiaEditContent.trim(),
      imagen: this.noticiaEditImagen || null,
    });
    this.cerrarEditarNoticia();
    this.mensajeNoticiaOk.set(true); setTimeout(() => this.mensajeNoticiaOk.set(false), 3000);
  }

  async eliminarNoticiaDesdeAdmin(id: number): Promise<void> {
    if (confirm('¿Borrar esta noticia permanentemente?')) await this.db.eliminarNoticia(id);
  }

  // ── Dificultades ──────────────────────────────────────────
  async crearDificultadPersonalizada(): Promise<void> {
    const nombre = this.nuevaDifNombre.trim();
    if (!nombre) { this.mensajeDifError = 'Escribe un nombre.'; return; }
    if (this.dificultades.find(d => d.nombre.toLowerCase() === nombre.toLowerCase())) {
      this.mensajeDifError = 'Ya existe esa dificultad.'; return;
    }
    const orden = this.dificultades.length > 0 ? Math.max(...this.dificultades.map(d => d.orden)) + 1 : 1;
    await this.db.crearDificultad({
      nombre,
      puntos: this.nuevaDifPuntos,
      orden,
      cc: this.nuevaDifCc || undefined,
      bloque: this.nuevaDifBloque || undefined,
      color: this.nuevaDifColor || undefined,
    });
    this.nuevaDifNombre = ''; this.nuevaDifPuntos = 10; this.nuevaDifCc = 0;
    this.nuevaDifBloque = 0; this.nuevaDifColor = '#d4af37';
    this.mensajeDifError = '';
    this.mensajeDifOk.set(true); setTimeout(() => this.mensajeDifOk.set(false), 3000);
  }

  async eliminarDificultadPersonalizada(nombre: string): Promise<void> {
    if (!confirm(`¿Eliminar la dificultad "${nombre}"? Las misiones existentes con esta dificultad no se borran pero dejarán de mostrar puntos correctamente.`)) return;
    await this.db.eliminarDificultad(nombre);
  }

  // ── Misiones ──────────────────────────────────────────────
  async crearMision(): Promise<void> {
    if (!this.misionTitulo.trim() || !this.misionDesc.trim()) { alert('Falta título o descripción.'); return; }
    await this.db.crearMision({
      titulo: this.misionTitulo.trim(),
      dificultad: this.misionDificultad,
      recompensa: this.misionRecompensa.trim(),
      materiales: this.misionMateriales.trim(),
      descripcion: this.misionDesc.trim(),
      oro: this.misionOro || undefined,
      plata: this.misionPlata || undefined,
      cobre: this.misionCobre || undefined,
    });
    this.misionTitulo = ''; this.misionRecompensa = ''; this.misionMateriales = ''; this.misionDesc = '';
    this.misionOro = 0; this.misionPlata = 0; this.misionCobre = 0;
    this.mensajeMisionOk.set(true); setTimeout(() => this.mensajeMisionOk.set(false), 3000);
  }

  async resetearHistorialAventurero(): Promise<void> {
    const nombre = this.buscarResetHistorial.trim();
    if (!nombre) { alert('Selecciona un aventurero.'); return; }
    if (!confirm(`¿Borrar todo el historial de entregas de ${nombre}? Esta acción no se puede deshacer.`)) return;
    await this.db.eliminarHistorialAventurero(nombre);
    this.buscarResetHistorial = '';
    alert(`Historial de ${nombre} borrado.`);
  }

  // ── Roles ─────────────────────────────────────────────────
  async asignarRol(): Promise<void> {
    const nombre = this.buscarRolNombre.trim();
    if (!nombre) { this.setMensajeRol('Selecciona un aventurero.', 'text-red-400'); return; }
    const u = this.usuarios.find(x => x.nombre.toLowerCase() === nombre.toLowerCase());
    if (!u) { this.setMensajeRol('No encontrado.', 'text-orange-400'); return; }
    await this.db.actualizarUsuario(u.nombre, { rol: this.rolSeleccionado });
    const sesion = this.auth.usuario();
    if (sesion?.nombre.toLowerCase() === nombre.toLowerCase()) {
      this.auth.actualizarUsuarioEnMemoria({ ...sesion, rol: this.rolSeleccionado });
    }
    this.buscarRolNombre = '';
    const txt = this.rolSeleccionado === 'Aventurero' ? 'retirado todos los cargos' : `ascendido a ${this.rolSeleccionado}`;
    this.setMensajeRol(`Se le han ${txt} a ${u.nombre}.`, 'text-green-400');
  }

  private setMensajeRol(msg: string, color: string): void {
    this.mensajeRol = msg; this.mensajeRolColor = color;
    setTimeout(() => { this.mensajeRol = ''; }, 4000);
  }

  // ── Peligro: eliminar cuenta ─────────────────────────────
  get usuariosPendientesXP(): typeof this.usuarios {
    return this.usuarios.filter(u => u.xpPendienteEntrega);
  }

  // Resumen de entregas agrupado por mod
  get resumenMods(): { mod: string; totalMisiones: number; totalDinero: number }[] {
    const mapa = new Map<string, { totalMisiones: number; totalDinero: number }>();
    for (const e of this.historialEntregas) {
      const key = e.mod || 'Sistema';
      const prev = mapa.get(key) || { totalMisiones: 0, totalDinero: 0 };
      mapa.set(key, { totalMisiones: prev.totalMisiones + 1, totalDinero: prev.totalDinero + (e.dinero || 0) });
    }
    return Array.from(mapa.entries())
      .map(([mod, v]) => ({ mod, ...v }))
      .sort((a, b) => b.totalDinero - a.totalDinero);
  }

  selectNuevaDifColor(hex: string): void { this.nuevaDifColor = hex; }

  async marcarXpEntregada(nombre: string): Promise<void> {
    await this.db.actualizarUsuario(nombre, { xpPendienteEntrega: null });
  }

  async eliminarAventurero(): Promise<void> {
    const nombre = this.buscarPeligroNombre.trim();
    if (!nombre) { alert('Selecciona un aventurero primero.'); return; }
    if (nombre.toLowerCase() === this.auth.usuario()?.nombre.toLowerCase()) { alert('No puedes eliminar tu propia cuenta desde aquí.'); return; }
    if (nombre === 'ADMIN') { alert('El Maestro del Gremio original (ADMIN) no puede ser eliminado.'); return; }
    const u = this.usuarios.find(x => x.nombre.toLowerCase() === nombre.toLowerCase());
    if (!u) { alert('Aventurero no encontrado.'); return; }
    if (confirm(`⚠️ ALERTA: Estás a punto de eliminar a ${u.nombre} permanentemente.\n¿Continuar?`)) {
      await this.db.eliminarUsuario(u.nombre);
      this.buscarPeligroNombre = '';
      alert('Cuenta eliminada y purgada de los registros del Gremio.');
    }
  }

  // ── Peligro: retocar logros ──────────────────────────────
  abrirModalLogros(): void {
    const nombre = this.buscarPeligroNombre.trim();
    if (!nombre) { alert('Selecciona un aventurero primero.'); return; }
    const u = this.usuarios.find(x => x.nombre.toLowerCase() === nombre.toLowerCase());
    if (!u) { alert('Aventurero no encontrado.'); return; }
    this.nombreEditandoLogros = u.nombre;
    const prog = u.progresoLogros || {};
    this.todasCategorias.forEach(cat => { this.valoresLogros[cat] = prog[cat] || 0; });
    this.modalLogros.set(true);
  }

  cerrarModalLogros(): void { this.modalLogros.set(false); this.nombreEditandoLogros = ''; }

  async guardarLogros(): Promise<void> {
    if (!this.nombreEditandoLogros) return;
    const u = this.usuarios.find(x => x.nombre === this.nombreEditandoLogros);
    if (!u) return;
    const progresoLogros = { ...(u.progresoLogros || {}) };
    this.todasCategorias.forEach(cat => {
      const val = this.valoresLogros[cat];
      if (!isNaN(val) && val >= 0) progresoLogros[cat] = val;
    });
    await this.db.actualizarUsuario(this.nombreEditandoLogros, { progresoLogros });
    const sesion = this.auth.usuario();
    if (sesion?.nombre === this.nombreEditandoLogros) this.auth.actualizarUsuarioEnMemoria({ ...sesion, progresoLogros });
    this.cerrarModalLogros();
    alert(`El progreso de logros de ${this.nombreEditandoLogros} ha sido alterado manualmente.`);
  }
}
