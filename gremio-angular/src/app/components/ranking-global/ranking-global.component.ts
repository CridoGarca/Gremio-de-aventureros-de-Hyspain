import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DbService } from '../../services/db.service';
import { AuthService } from '../../services/auth.service';
import { Usuario } from '../../models/models';
import { colorRango } from '../../constants/rangos';

@Component({
  selector: 'app-ranking-global',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ranking-global.component.html'
})
export class RankingGlobalComponent implements OnInit, OnDestroy {
  clasificados: Usuario[] = [];
  podio: (Usuario | undefined)[] = [];
  resto: Usuario[] = [];
  private sub?: Subscription;
  colorRango = colorRango;

  constructor(public auth: AuthService, private db: DbService) {}

  ngOnInit(): void {
    this.sub = this.db.getUsuarios$().subscribe(usuarios => {
      this.clasificados = usuarios
        .filter(u => u.rol !== 'ADMIN' && u.nombre !== 'ADMIN')
        .sort((a, b) => b.puntos - a.puntos);
      this.podio = [this.clasificados[1], this.clasificados[0], this.clasificados[2]];
      this.resto = this.clasificados.slice(3);
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  podioClases(pos: number): { borde: string; img: string; texto: string; caja: string; icono: string } {
    if (pos === 0) return { borde: 'border-yellow-400', img: 'w-20 h-20 md:w-24 md:h-24', texto: 'text-lg md:text-xl', caja: 'h-40 md:h-48 bg-gradient-to-t from-yellow-900/60 to-black/40 border-yellow-600/50', icono: 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' };
    if (pos === 1) return { borde: 'border-gray-300', img: 'w-16 h-16 md:w-20 md:h-20', texto: 'text-base md:text-lg', caja: 'h-32 md:h-40 bg-gradient-to-t from-gray-600/60 to-black/40 border-gray-500/50', icono: 'text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.8)]' };
    return { borde: 'border-orange-700', img: 'w-14 h-14 md:w-16 md:h-16', texto: 'text-sm md:text-base', caja: 'h-28 md:h-32 bg-gradient-to-t from-orange-900/60 to-black/40 border-orange-700/50', icono: 'text-orange-700 drop-shadow-[0_0_8px_rgba(194,65,12,0.8)]' };
  }
}
