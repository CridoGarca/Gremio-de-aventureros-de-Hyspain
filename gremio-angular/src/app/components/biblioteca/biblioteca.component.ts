import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef,
  signal, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import Cropper from 'cropperjs';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';
import { ItemBiblioteca, LineaPedidoBiblioteca, PedidoBiblioteca } from '../../models/models';

@Component({
  selector: 'app-biblioteca',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './biblioteca.component.html'
})
export class BibliotecaComponent implements OnInit, OnDestroy {
  @ViewChild('imgRecorteBiblioteca') imgRecorteBiblioteca!: ElementRef<HTMLImageElement>;
  private cropper: Cropper | null = null;
  private subItems?: Subscription;
  private subPedidos?: Subscription;

  items: ItemBiblioteca[] = [];
  pedidos: PedidoBiblioteca[] = [];
  carrito: { item: ItemBiblioteca; cantidad: number }[] = [];

  // Modal item (bibliotecario/admin)
  modalItem = signal(false);
  modalRecorte = signal(false);
  editandoId: number | null = null;
  itemNombre = '';
  itemOro = 0;
  itemPlata = 0;
  itemCobre = 0;
  itemDescripcion = '';
  itemImagen = '';
  imgSrc = '';

  // UI
  mostrarCarrito = signal(false);
  mensajePedidoOk = signal(false);
  mostrarConsolaAdmin = signal(false);

  constructor(public auth: AuthService, private db: DbService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.subItems = this.db.getItemsBiblioteca$().subscribe(items => {
      this.items = items;
      this.cdr.detectChanges();
    });
    if (this.auth.esBibliotecario()) {
      this.subPedidos = this.db.getPedidosBiblioteca$().subscribe(p => {
        this.pedidos = p;
        this.cdr.detectChanges();
      });
    }
  }

  ngOnDestroy(): void {
    this.subItems?.unsubscribe();
    this.subPedidos?.unsubscribe();
    if (this.cropper) this.cropper.destroy();
  }

  // ── Carrito ────────────────────────────────────────────
  agregarAlCarrito(item: ItemBiblioteca): void {
    const existente = this.carrito.find(c => c.item.id === item.id);
    if (existente) {
      existente.cantidad++;
    } else {
      this.carrito.push({ item, cantidad: 1 });
    }
    this.mostrarCarrito.set(true);
  }

  quitarDelCarrito(itemId: number): void {
    this.carrito = this.carrito.filter(c => c.item.id !== itemId);
    if (this.carrito.length === 0) this.mostrarCarrito.set(false);
  }

  cambiarCantidad(itemId: number, delta: number): void {
    const entry = this.carrito.find(c => c.item.id === itemId);
    if (!entry) return;
    entry.cantidad = Math.max(1, entry.cantidad + delta);
  }

  totalOro(): number {
    return this.carrito.reduce((s, c) => s + (c.item.oro || 0) * c.cantidad, 0);
  }

  totalPlata(): number {
    return this.carrito.reduce((s, c) => s + (c.item.plata || 0) * c.cantidad, 0);
  }

  totalCobre(): number {
    return this.carrito.reduce((s, c) => s + (c.item.cobre || 0) * c.cantidad, 0);
  }

  async enviarPedido(): Promise<void> {
    if (this.carrito.length === 0) return;
    const u = this.auth.usuario();
    const lineas: LineaPedidoBiblioteca[] = this.carrito.map(c => {
      const linea: LineaPedidoBiblioteca = {
        itemId: c.item.id,
        nombre: c.item.nombre,
        cantidad: c.cantidad,
      };
      if (c.item.imagen) linea.imagen = c.item.imagen;
      if (c.item.oro) linea.oro = c.item.oro;
      if (c.item.plata) linea.plata = c.item.plata;
      if (c.item.cobre) linea.cobre = c.item.cobre;
      return linea;
    });
    const pedido: PedidoBiblioteca = {
      id: Date.now(),
      aventurero: u?.nombre || 'Desconocido',
      lineas,
      fecha: Date.now(),
      estado: 'pendiente',
    };
    if (u?.foto) pedido.fotoAventurero = u.foto;
    await this.db.crearPedidoBiblioteca(pedido);
    this.carrito = [];
    this.mostrarCarrito.set(false);
    this.mensajePedidoOk.set(true);
    setTimeout(() => this.mensajePedidoOk.set(false), 4000);
  }

  // ── CRUD Items (bibliotecario/admin) ───────────────────
  abrirNuevoItem(): void {
    this.editandoId = null;
    this.itemNombre = '';
    this.itemOro = 0;
    this.itemPlata = 0;
    this.itemCobre = 0;
    this.itemDescripcion = '';
    this.itemImagen = '';
    this.modalItem.set(true);
  }

  abrirEditarItem(item: ItemBiblioteca): void {
    this.editandoId = item.id;
    this.itemNombre = item.nombre;
    this.itemOro = item.oro || 0;
    this.itemPlata = item.plata || 0;
    this.itemCobre = item.cobre || 0;
    this.itemDescripcion = item.descripcion || '';
    this.itemImagen = item.imagen;
    this.modalItem.set(true);
  }

  cerrarModalItem(): void {
    this.modalItem.set(false);
    this.editandoId = null;
  }

  abrirRecorteBiblioteca(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      this.imgSrc = e.target?.result as string;
      this.modalRecorte.set(true);
      setTimeout(() => {
        if (this.cropper) this.cropper.destroy();
        this.cropper = new Cropper(this.imgRecorteBiblioteca.nativeElement, {
          aspectRatio: 1, viewMode: 1, background: false
        });
      }, 100);
    };
    reader.readAsDataURL(file);
  }

  confirmarRecorte(): void {
    if (!this.cropper) return;
    this.itemImagen = this.cropper.getCroppedCanvas({ width: 400, height: 400 }).toDataURL('image/jpeg', 0.8);
    this.cerrarRecorte();
  }

  cancelarRecorte(): void { this.cerrarRecorte(); }

  private cerrarRecorte(): void {
    this.modalRecorte.set(false);
    if (this.cropper) { this.cropper.destroy(); this.cropper = null; }
  }

  async guardarItem(): Promise<void> {
    if (!this.itemNombre.trim()) { alert('El nombre es obligatorio.'); return; }
    if (!this.itemImagen) { alert('Añade una imagen al item.'); return; }
    const data: Omit<ItemBiblioteca, 'id'> = {
      nombre: this.itemNombre.trim(),
      imagen: this.itemImagen,
    };
    if (this.itemOro > 0) data.oro = this.itemOro;
    if (this.itemPlata > 0) data.plata = this.itemPlata;
    if (this.itemCobre > 0) data.cobre = this.itemCobre;
    if (this.itemDescripcion.trim()) data.descripcion = this.itemDescripcion.trim();

    if (this.editandoId !== null) {
      await this.db.actualizarItemBiblioteca(this.editandoId, data);
    } else {
      await this.db.crearItemBiblioteca(data);
    }
    this.cerrarModalItem();
  }

  async eliminarItem(id: number): Promise<void> {
    if (confirm('¿Borrar este item de la biblioteca permanentemente?')) {
      await this.db.eliminarItemBiblioteca(id);
    }
  }

  // ── Pedidos (bibliotecario/admin) ──────────────────────
  pedidosPendientes(): PedidoBiblioteca[] {
    return this.pedidos.filter(p => p.estado === 'pendiente');
  }

  pedidosCompletados(): PedidoBiblioteca[] {
    return this.pedidos.filter(p => p.estado === 'completado');
  }

  async completarPedido(id: number): Promise<void> {
    await this.db.actualizarPedidoBiblioteca(id, { estado: 'completado' });
  }

  async eliminarPedido(id: number): Promise<void> {
    if (confirm('¿Eliminar este pedido del registro?')) {
      await this.db.eliminarPedidoBiblioteca(id);
    }
  }

  formatFecha(ts: number): string {
    return new Date(ts).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  hayMonedas(item: ItemBiblioteca): boolean {
    return !!(item.oro || item.plata || item.cobre);
  }
}
