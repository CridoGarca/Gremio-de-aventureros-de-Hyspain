import { Component, OnInit, OnDestroy, ViewChild, ElementRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import Cropper from 'cropperjs';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';
import { Usuario, Dificultad } from '../../models/models';
import { CATEGORIAS_RECURSOS } from '../../constants/logros-data';
import { DATA_BRUTA } from '../../constants/logros-data';

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

  usuarios: Usuario[] = [];
  dificultades: Dificultad[] = [];

  // Noticia
  noticiaTitle = ''; noticiaContent = ''; imagenNoticia = ''; imgSrc = '';
  modalRecorte = signal(false); mensajeNoticiaOk = signal(false);

  // Misión
  misionTitulo = ''; misionDificultad = 'Fácil'; misionRecompensa = ''; misionMateriales = ''; misionDesc = '';
  mensajeMisionOk = signal(false);

  // Nueva dificultad
  nuevaDifNombre = ''; nuevaDifPuntos = 10;
  mensajeDifOk = signal(false); mensajeDifError = '';

  // Roles
  buscarRolNombre = ''; rolSeleccionado = 'Aventurero'; mensajeRol = ''; mensajeRolColor = '';

  // Peligro
  buscarPeligroNombre = '';
  modalLogros = signal(false); nombreEditandoLogros = '';
  categoriasMisiones = ['Misiones Totales', 'Misiones Fáciles', 'Misiones Medias', 'Misiones Difíciles'];
  todasCategorias: string[] = [];
  valoresLogros: { [key: string]: number } = {};

  constructor(public auth: AuthService, private db: DbService) {
    this.todasCategorias = [...this.categoriasMisiones, ...CATEGORIAS_RECURSOS];
  }

  ngOnInit(): void {
    this.sub = this.db.getUsuarios$().subscribe(u => this.usuarios = u.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    this.db.getDificultades$().subscribe(d => {
      this.dificultades = d;
      if (d.length && !d.find(x => x.nombre === this.misionDificultad)) {
        this.misionDificultad = d[0].nombre;
      }
    });
  }
  ngOnDestroy(): void { this.sub?.unsubscribe(); }

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

  // ── Dificultades ──────────────────────────────────────────
  async crearDificultadPersonalizada(): Promise<void> {
    const nombre = this.nuevaDifNombre.trim();
    if (!nombre) { this.mensajeDifError = 'Escribe un nombre.'; return; }
    if (this.dificultades.find(d => d.nombre.toLowerCase() === nombre.toLowerCase())) {
      this.mensajeDifError = 'Ya existe esa dificultad.'; return;
    }
    const orden = this.dificultades.length > 0 ? Math.max(...this.dificultades.map(d => d.orden)) + 1 : 1;
    await this.db.crearDificultad({ nombre, puntos: this.nuevaDifPuntos, orden });
    this.nuevaDifNombre = ''; this.nuevaDifPuntos = 10; this.mensajeDifError = '';
    this.mensajeDifOk.set(true); setTimeout(() => this.mensajeDifOk.set(false), 3000);
  }

  async eliminarDificultadPersonalizada(nombre: string): Promise<void> {
    if (!confirm(`¿Eliminar la dificultad "${nombre}"? Las misiones existentes con esta dificultad no se borran pero dejarán de mostrar puntos correctamente.`)) return;
    await this.db.eliminarDificultad(nombre);
  }

  // ── Misiones ──────────────────────────────────────────────
  async crearMision(): Promise<void> {
    if (!this.misionTitulo.trim() || !this.misionDesc.trim()) { alert('Falta título o descripción.'); return; }
    await this.db.crearMision({ titulo: this.misionTitulo.trim(), dificultad: this.misionDificultad, recompensa: this.misionRecompensa.trim(), materiales: this.misionMateriales.trim(), descripcion: this.misionDesc.trim() });
    this.misionTitulo = ''; this.misionRecompensa = ''; this.misionMateriales = ''; this.misionDesc = '';
    this.mensajeMisionOk.set(true); setTimeout(() => this.mensajeMisionOk.set(false), 3000);
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
