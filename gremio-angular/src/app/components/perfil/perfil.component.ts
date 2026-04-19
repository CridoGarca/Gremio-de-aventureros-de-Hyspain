import { Component, OnInit, ViewChild, ElementRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Cropper from 'cropperjs';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';


@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.component.html'
})
export class PerfilComponent implements OnInit {
  @ViewChild('imgRecorte') imgRecorte!: ElementRef<HTMLImageElement>;

  editNombre = '';
  editPassword = '';
  editRaza = '';
  editFaccion = '';
  mostrarPassword = false;
  fotoTemporal = '';
  mostrarModal = signal(false);
  imgSrc = '';
  private cropper: Cropper | null = null;
  mensajeOk = signal(false);

  constructor(public auth: AuthService, private db: DbService) {}

  ngOnInit(): void {
    const u = this.auth.usuario()!;
    this.editNombre = u.nombre;
    this.editPassword = u.password;
    this.editRaza = u.raza || '';
    this.editFaccion = u.faccion || '';
    this.fotoTemporal = u.foto;
  }

  togglePassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  abrirRecorte(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imgSrc = e.target?.result as string;
      this.mostrarModal.set(true);
      setTimeout(() => {
        if (this.cropper) this.cropper.destroy();
        this.cropper = new Cropper(this.imgRecorte.nativeElement, {
          aspectRatio: 1, viewMode: 1, background: false
        });
      }, 200);
    };
    reader.readAsDataURL(file);
  }

  confirmarRecorte(): void {
    if (!this.cropper) return;
    const canvas = this.cropper.getCroppedCanvas({ width: 300, height: 300 });
    this.fotoTemporal = canvas.toDataURL('image/jpeg', 0.7);
    this.cerrarModal();
  }

  cancelarRecorte(): void {
    this.fotoTemporal = this.auth.usuario()!.foto;
    this.cerrarModal();
  }

  private cerrarModal(): void {
    this.mostrarModal.set(false);
    if (this.cropper) { this.cropper.destroy(); this.cropper = null; }
  }

  async guardarPerfil(): Promise<void> {
    const u = this.auth.usuario()!;
    if (!this.editNombre.trim() || !this.editPassword.trim()) {
      alert('Campos vacíos.'); return;
    }
    const cambios: Record<string, unknown> = {
      nombre: this.editNombre.trim(),
      password: this.editPassword.trim(),
      raza: this.editRaza.trim(),
      faccion: this.editFaccion.trim(),
      foto: this.fotoTemporal || u.foto
    };
    try {
      await this.db.actualizarUsuario(u.nombre, cambios as any);
      this.auth.actualizarUsuarioEnMemoria({ ...u, ...cambios });
      this.mensajeOk.set(true);
      setTimeout(() => this.mensajeOk.set(false), 3000);
    } catch (err) {
      console.error('Error al guardar perfil:', err);
      alert('No se pudieron guardar los cambios. Intenta de nuevo.');
    }
  }
}
