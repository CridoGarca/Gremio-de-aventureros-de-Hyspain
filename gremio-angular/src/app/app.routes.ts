import { Routes } from '@angular/router';
import { authGuard, adminGuard, adminPuroGuard } from './guards/guards';
import { LoginComponent } from './components/login/login.component';
import { LayoutComponent } from './components/layout/layout.component';
import { InicioComponent } from './components/inicio/inicio.component';
import { PerfilComponent } from './components/perfil/perfil.component';
import { MisionesComponent } from './components/misiones/misiones.component';
import { RankingGlobalComponent } from './components/ranking-global/ranking-global.component';
import { LogrosComponent } from './components/logros/logros.component';
import { AdminComponent } from './components/admin/admin.component';
import { SeguimientoComponent } from './components/seguimiento/seguimiento.component';
import { CaballosComponent } from './components/caballos/caballos.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'app',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'inicio', component: InicioComponent },
      { path: 'perfil', component: PerfilComponent },
      { path: 'misiones', component: MisionesComponent },
      { path: 'ranking-global', component: RankingGlobalComponent },
      { path: 'ranking-semanal', redirectTo: 'ranking-global', pathMatch: 'full' },
      { path: 'logros', component: LogrosComponent },
      { path: 'caballos', component: CaballosComponent },
      { path: 'admin', component: AdminComponent, canActivate: [adminPuroGuard] },
      { path: 'seguimiento', component: SeguimientoComponent, canActivate: [adminGuard] },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];
