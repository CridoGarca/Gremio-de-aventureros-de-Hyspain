import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';
import { Noticia, BannerInicio } from '../../models/models';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inicio.component.html'
})
export class InicioComponent {
  private db = inject(DbService);
  auth = inject(AuthService);

  noticias = toSignal(
    this.db.getNoticias$().pipe(catchError(() => of([] as Noticia[]))),
    { initialValue: [] as Noticia[] }
  );

  banner = toSignal(
    this.db.getBannerInicio$().pipe(catchError(() => of(this.db.BANNER_DEFAULT))),
    { initialValue: this.db.BANNER_DEFAULT }
  );

  editandoBanner = signal(false);
  bannerEdit: BannerInicio = { ...this.db.BANNER_DEFAULT };

  abrirEdicionBanner(): void {
    this.bannerEdit = { ...this.banner() };
    this.editandoBanner.set(true);
  }

  cerrarEdicionBanner(): void {
    this.editandoBanner.set(false);
  }

  async guardarBanner(): Promise<void> {
    await this.db.actualizarBannerInicio({ ...this.bannerEdit });
    this.editandoBanner.set(false);
  }

  async eliminarNoticia(id: number): Promise<void> {
    if (confirm('¿Borrar esta noticia permanentemente?')) {
      await this.db.eliminarNoticia(id);
    }
  }
}
