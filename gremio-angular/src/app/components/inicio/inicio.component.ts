import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';
import { Noticia } from '../../models/models';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inicio.component.html'
})
export class InicioComponent {
  private db = inject(DbService);
  auth = inject(AuthService);

  noticias = toSignal(
    this.db.getNoticias$().pipe(catchError(() => of([] as Noticia[]))),
    { initialValue: [] as Noticia[] }
  );

  async eliminarNoticia(id: number): Promise<void> {
    if (confirm('¿Borrar esta noticia permanentemente?')) {
      await this.db.eliminarNoticia(id);
    }
  }
}
