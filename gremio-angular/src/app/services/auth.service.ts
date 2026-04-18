import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DbService } from './db.service';
import { Usuario } from '../models/models';
import { calcularRango } from '../constants/rangos';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _usuario = signal<Usuario | null>(null);
  usuario = this._usuario.asReadonly();

  esAdmin = computed(() => {
    const u = this._usuario();
    return !!(u && (u.rol === 'ADMIN' || u.rol === 'MOD' || u.nombre === 'ADMIN'));
  });

  // Solo ADMIN puro (no MOD): para acciones exclusivas del rol ADMIN
  esAdminPuro = computed(() => {
    const u = this._usuario();
    return !!(u && (u.rol === 'ADMIN' || u.nombre === 'ADMIN'));
  });

  constructor(private db: DbService, private router: Router) {}

  async init(): Promise<void> {
    await this.db.inicializar();
    const guardado = localStorage.getItem('gremio_sesion');
    if (guardado) {
      const user = await this.db.getUsuario(guardado);
      if (user) this._usuario.set(user);
    }
  }

  async login(nombre: string, password: string): Promise<string | null> {
    const user = await this.db.getUsuario(nombre);
    if (user && user.password === password) {
      this._usuario.set(user);
      localStorage.setItem('gremio_sesion', user.nombre);
      return null;
    }
    return 'Nombre o contraseña incorrectos.';
  }

  async registrar(nombre: string, password: string): Promise<string | null> {
    if (!nombre || !password) return 'Falta nombre o clave.';
    const existe = await this.db.getUsuario(nombre);
    if (existe) return 'Este nombre ya existe.';

    const nuevo: Usuario = {
      nombre, password, raza: '', faccion: '',
      foto: 'https://cdn-icons-png.flaticon.com/512/847/847969.png',
      puntos: 0, puntosSemanales: 0,
      rango: calcularRango(0, 'Aventurero', nombre),
      rol: 'Aventurero', misionActiva: null,
      progresoLogros: {}, cooldownsMisiones: {},
      historialMisiones: { 'Fácil': [], 'Media': [], 'Difícil': [], 'Épica': [] }
    };
    await this.db.crearUsuario(nuevo);
    this._usuario.set(nuevo);
    localStorage.setItem('gremio_sesion', nombre);
    return null;
  }

  actualizarUsuarioEnMemoria(u: Usuario): void {
    this._usuario.set({ ...u });
  }

  cerrarSesion(): void {
    this._usuario.set(null);
    localStorage.removeItem('gremio_sesion');
    this.router.navigate(['/login']);
  }
}
