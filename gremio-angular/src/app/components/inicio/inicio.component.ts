import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';
import { Noticia } from '../../models/models';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inicio.component.html'
})
export class InicioComponent implements OnInit, OnDestroy {
  noticias: Noticia[] = [];
  private sub?: Subscription;

  constructor(public auth: AuthService, private db: DbService) {}

  ngOnInit(): void {
    this.sub = this.db.getNoticias$().subscribe(n => this.noticias = n);
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  async eliminarNoticia(id: number): Promise<void> {
    if (confirm('¿Borrar esta noticia permanentemente?')) {
      await this.db.eliminarNoticia(id);
    }
  }
}
