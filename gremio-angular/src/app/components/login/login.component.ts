import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  nombre = '';
  password = '';
  error = signal('');
  cargando = signal(false);

  constructor(private auth: AuthService, private router: Router) {}

  async adentrarse(): Promise<void> {
    this.error.set('');
    this.cargando.set(true);
    const err = await this.auth.login(this.nombre.trim(), this.password.trim());
    this.cargando.set(false);
    if (err) { this.error.set(err); return; }
    this.router.navigate(['/app/inicio']);
  }

  async firmarContrato(): Promise<void> {
    this.error.set('');
    this.cargando.set(true);
    const err = await this.auth.registrar(this.nombre.trim(), this.password.trim());
    this.cargando.set(false);
    if (err) { this.error.set(err); return; }
    alert('¡Contrato firmado! Bienvenido al gremio.');
    this.router.navigate(['/app/inicio']);
  }
}
