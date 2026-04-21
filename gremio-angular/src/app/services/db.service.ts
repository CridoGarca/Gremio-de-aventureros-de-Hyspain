import { Injectable, Inject } from '@angular/core';
import {
  Firestore,
  collection, doc, getDoc, getDocs,
  setDoc, updateDoc, deleteDoc, writeBatch, query, orderBy, where,
  onSnapshot, deleteField
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { Usuario, Mision, Noticia, Logro, Dificultad, EntregaHistorial, Escuderia, Corredor, ResultadoCarrera, NoticiaCarreras, BannerInicio, ItemTienda, PedidoTienda } from '../models/models';
import { DATA_BRUTA } from '../constants/logros-data';
import { FIRESTORE_TOKEN } from './firestore.token';

@Injectable({ providedIn: 'root' })
export class DbService {

  constructor(@Inject(FIRESTORE_TOKEN) private fs: Firestore) {}

  obtenerInicioSemana(): number {
    const ahora = new Date();
    const dia = ahora.getDay() || 7;
    ahora.setHours(0, 0, 0, 0);
    ahora.setDate(ahora.getDate() - dia + 1);
    return ahora.getTime();
  }

  async inicializar(): Promise<void> {
    await Promise.all([this.inicializarAdmin(), this.inicializarLogros(), this.inicializarDificultades()]);
    await this.checkResetSemanal();
  }

  private async inicializarAdmin(): Promise<void> {
    const ref = doc(this.fs, 'usuarios', 'admin');
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        nombre: 'ADMIN', password: '0683843', raza: 'Desconocida',
        faccion: 'Maestro del Gremio',
        foto: 'https://cdn-icons-png.flaticon.com/512/847/847969.png',
        puntos: 0, puntosSemanales: 0, rol: 'ADMIN',
        misionActiva: null, progresoLogros: {}, cooldownsMisiones: {},
        historialMisiones: { 'FÃ¡cil': [], 'Media': [], 'DifÃ­cil': [], 'Ã‰pica': [] }
      });
    }
  }

  private async inicializarDificultades(): Promise<void> {
    const snap = await getDocs(collection(this.fs, 'dificultades'));
    if (!snap.empty) return;
    const defaults: Dificultad[] = [
      { nombre: 'Fácil', puntos: 10, orden: 1 },
      { nombre: 'Media', puntos: 25, orden: 2 },
      { nombre: 'Difícil', puntos: 75, orden: 3 },
      { nombre: 'Épica', puntos: 250, orden: 4 },
    ];
    const batch = writeBatch(this.fs);
    defaults.forEach(d => batch.set(doc(this.fs, 'dificultades', d.nombre), d));
    await batch.commit();
  }

  private async inicializarLogros(): Promise<void> {
    const snap = await getDocs(collection(this.fs, 'logros'));
    if (!snap.empty) return;
    const batch = writeBatch(this.fs);
    let count = 1;
    DATA_BRUTA.forEach(cat => {
      cat.niveles.forEach(lvl => {
        const id = 'logro_' + count++;
        batch.set(doc(this.fs, 'logros', id), {
          id, recurso: cat.categoria, icono: cat.icon,
          nombre: lvl.nombre, requisito: lvl.req, recompensa: 'Recompensa no establecida'
        });
      });
    });
    await batch.commit();
  }

  async checkResetSemanal(): Promise<void> {
    const nowWeekStart = this.obtenerInicioSemana();
    const configRef = doc(this.fs, 'config', 'semana');
    const configSnap = await getDoc(configRef);
    if (!configSnap.exists() || (configSnap.data() as any)['semanaActual'] !== nowWeekStart) {
      const usersSnap = await getDocs(collection(this.fs, 'usuarios'));
      const batch = writeBatch(this.fs);
      usersSnap.forEach(d => batch.update(d.ref, { puntosSemanales: 0 }));
      batch.set(configRef, { semanaActual: nowWeekStart });
      await batch.commit();
    }
  }

  // â”€â”€ Usuarios â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  getUsuarios$(): Observable<Usuario[]> {
    return new Observable(obs => {
      const unsub = onSnapshot(collection(this.fs, 'usuarios'),
        snap => obs.next(snap.docs.map(d => d.data() as Usuario)),
        err => obs.error(err));
      return () => unsub();
    });
  }

  async getUsuario(nombre: string): Promise<Usuario | null> {
    const snap = await getDoc(doc(this.fs, 'usuarios', nombre.toLowerCase()));
    return snap.exists() ? (snap.data() as Usuario) : null;
  }

  async crearUsuario(u: Usuario): Promise<void> {
    await setDoc(doc(this.fs, 'usuarios', u.nombre.toLowerCase()), u);
  }

  async actualizarUsuario(nombre: string, data: Partial<Usuario>): Promise<void> {
    await updateDoc(doc(this.fs, 'usuarios', nombre.toLowerCase()), data as Record<string, unknown>);
  }

  async eliminarUsuario(nombre: string): Promise<void> {
    await deleteDoc(doc(this.fs, 'usuarios', nombre.toLowerCase()));
  }

  // â”€â”€ Misiones â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  getMisiones$(): Observable<Mision[]> {
    return new Observable(obs => {
      const unsub = onSnapshot(
        collection(this.fs, 'misiones'),
        snap => obs.next(snap.docs.map(d => d.data() as Mision).sort((a, b) => b.id - a.id)),
        err => obs.error(err));
      return () => unsub();
    });
  }

  async crearMision(m: Omit<Mision, 'id'>): Promise<void> {
    const id = Date.now();
    await setDoc(doc(this.fs, 'misiones', id.toString()), { ...m, id });
  }

  async actualizarMision(id: number, data: Partial<Mision>): Promise<void> {
    await updateDoc(doc(this.fs, 'misiones', id.toString()), data as Record<string, unknown>);
  }

  async eliminarMision(id: number): Promise<void> {
    await deleteDoc(doc(this.fs, 'misiones', id.toString()));
  }

  // â”€â”€ Noticias â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  getNoticias$(): Observable<Noticia[]> {
    return new Observable(obs => {
      const unsub = onSnapshot(
        query(collection(this.fs, 'noticias'), orderBy('id', 'desc')),
        snap => obs.next(snap.docs.map(d => d.data() as Noticia)),
        err => obs.error(err));
      return () => unsub();
    });
  }

  async crearNoticia(n: Noticia): Promise<void> {
    await setDoc(doc(this.fs, 'noticias', n.id.toString()), n);
  }

  async actualizarNoticia(id: number, data: Partial<Noticia>): Promise<void> {
    await updateDoc(doc(this.fs, 'noticias', id.toString()), data as Record<string, unknown>);
  }

  async eliminarNoticia(id: number): Promise<void> {
    await deleteDoc(doc(this.fs, 'noticias', id.toString()));
  }

  // ── Banner Inicio ──────────────────────────────────────────
  readonly BANNER_DEFAULT: BannerInicio = {
    titulo: '¡Bienvenid@s, aventurer@s!',
    parrafo1: 'En esta web podrás seguir y controlar tu avance dentro del gremio. Explora los diferentes apartados, completa tu perfil y añade tu foto para mejorar tu presencia en el ranking.',
    parrafo2: 'Compite con el resto de aventureros, asciende posiciones y demuestra tu valía.',
    lemaLabel: 'Recuerda siempre nuestro lema:',
    lemaTexto: '"Nuestra espada no tiene bando, nuestra palabra no tiene precio."',
  };

  getBannerInicio$(): Observable<BannerInicio> {
    return new Observable(obs => {
      const unsub = onSnapshot(
        doc(this.fs, 'config', 'banner'),
        snap => obs.next(snap.exists() ? (snap.data() as BannerInicio) : this.BANNER_DEFAULT),
        err => obs.error(err));
      return () => unsub();
    });
  }

  async actualizarBannerInicio(data: BannerInicio): Promise<void> {
    await setDoc(doc(this.fs, 'config', 'banner'), data);
  }

  // â”€â”€ Logros â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  getLogros$(): Observable<Logro[]> {
    return new Observable(obs => {
      const unsub = onSnapshot(collection(this.fs, 'logros'),
        snap => obs.next(snap.docs.map(d => d.data() as Logro)),
        err => obs.error(err));
      return () => unsub();
    });
  }

  async actualizarLogro(id: string, recompensa: string): Promise<void> {
    await updateDoc(doc(this.fs, 'logros', id), { recompensa });
  }

  // ── Dificultades ──────────────────────────────────────────
  getDificultades$(): Observable<Dificultad[]> {
    return new Observable(obs => {
      const unsub = onSnapshot(
        query(collection(this.fs, 'dificultades'), orderBy('orden', 'asc')),
        snap => obs.next(snap.docs.map(d => d.data() as Dificultad)),
        err => obs.error(err));
      return () => unsub();
    });
  }

  async crearDificultad(d: Dificultad): Promise<void> {
    await setDoc(doc(this.fs, 'dificultades', d.nombre), d);
  }

  async actualizarDificultad(nombre: string, data: Record<string, unknown>): Promise<void> {
    await updateDoc(doc(this.fs, 'dificultades', nombre), data);
  }

  async eliminarDificultad(nombre: string): Promise<void> {
    await deleteDoc(doc(this.fs, 'dificultades', nombre));
  }

  // ── Historial de entregas (por mod) ─────────────────────────
  getHistorialEntregas$(): Observable<EntregaHistorial[]> {
    return new Observable(obs => {
      const unsub = onSnapshot(
        query(collection(this.fs, 'historial_entregas'), orderBy('fecha', 'desc')),
        snap => obs.next(snap.docs.map(d => d.data() as EntregaHistorial)),
        err => obs.error(err));
      return () => unsub();
    });
  }

  async crearHistorialEntrega(e: EntregaHistorial): Promise<void> {
    await setDoc(doc(this.fs, 'historial_entregas', e.id.toString()), e);
  }

  async eliminarHistorialAventurero(nombre: string): Promise<void> {
    const snap = await getDocs(query(collection(this.fs, 'historial_entregas'), where('aventurero', '==', nombre)));
    const batch = writeBatch(this.fs);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }

  // ── Caballos: Escuderías ────────────────────────────────
  getEscuderias$(): Observable<Escuderia[]> {
    return new Observable(obs => {
      const unsub = onSnapshot(
        query(collection(this.fs, 'caballos_escuderias'), orderBy('puntos', 'desc')),
        snap => obs.next(snap.docs.map(d => d.data() as Escuderia)),
        err => obs.error(err));
      return () => unsub();
    });
  }

  async crearEscuderia(e: Escuderia): Promise<void> {
    await setDoc(doc(this.fs, 'caballos_escuderias', e.id.toString()), e);
  }

  async actualizarEscuderia(id: number, data: Partial<Escuderia>): Promise<void> {
    await updateDoc(doc(this.fs, 'caballos_escuderias', id.toString()), data as Record<string, unknown>);
  }

  async eliminarEscuderia(id: number): Promise<void> {
    await deleteDoc(doc(this.fs, 'caballos_escuderias', id.toString()));
  }

  // ── Caballos: Corredores ────────────────────────────────
  getCorredores$(): Observable<Corredor[]> {
    return new Observable(obs => {
      const unsub = onSnapshot(
        query(collection(this.fs, 'caballos_corredores'), orderBy('puntos', 'desc')),
        snap => obs.next(snap.docs.map(d => d.data() as Corredor)),
        err => obs.error(err));
      return () => unsub();
    });
  }

  async crearCorredor(c: Corredor): Promise<void> {
    await setDoc(doc(this.fs, 'caballos_corredores', c.id.toString()), c);
  }

  async actualizarCorredor(id: number, data: Partial<Corredor>): Promise<void> {
    await updateDoc(doc(this.fs, 'caballos_corredores', id.toString()), data as Record<string, unknown>);
  }

  async eliminarCorredor(id: number): Promise<void> {
    await deleteDoc(doc(this.fs, 'caballos_corredores', id.toString()));
  }

  // ── Caballos: Resultados de carrera ─────────────────────
  getResultados$(): Observable<ResultadoCarrera[]> {
    return new Observable(obs => {
      const unsub = onSnapshot(
        query(collection(this.fs, 'caballos_resultados'), orderBy('id', 'desc')),
        snap => obs.next(snap.docs.map(d => d.data() as ResultadoCarrera)),
        err => obs.error(err));
      return () => unsub();
    });
  }

  async crearResultado(r: ResultadoCarrera): Promise<void> {
    await setDoc(doc(this.fs, 'caballos_resultados', r.id.toString()), r);
  }

  async eliminarResultado(id: number): Promise<void> {
    await deleteDoc(doc(this.fs, 'caballos_resultados', id.toString()));
  }

  // ── Caballos: Noticias ──────────────────────────────────
  getNoticiasCarreras$(): Observable<NoticiaCarreras[]> {
    return new Observable(obs => {
      const unsub = onSnapshot(
        query(collection(this.fs, 'caballos_noticias'), orderBy('id', 'desc')),
        snap => obs.next(snap.docs.map(d => d.data() as NoticiaCarreras)),
        err => obs.error(err));
      return () => unsub();
    });
  }

  async crearNoticiaCarreras(n: NoticiaCarreras): Promise<void> {
    await setDoc(doc(this.fs, 'caballos_noticias', n.id.toString()), n);
  }

  async eliminarNoticiaCarreras(id: number): Promise<void> {
    await deleteDoc(doc(this.fs, 'caballos_noticias', id.toString()));
  }

  // ── Tienda: Items ────────────────────────────────────────
  getItemsTienda$(): Observable<ItemTienda[]> {
    return new Observable(obs => {
      const unsub = onSnapshot(
        query(collection(this.fs, 'tienda_items'), orderBy('id', 'asc')),
        snap => obs.next(snap.docs.map(d => d.data() as ItemTienda)),
        err => obs.error(err));
      return () => unsub();
    });
  }

  async crearItemTienda(item: Omit<ItemTienda, 'id'>): Promise<void> {
    const id = Date.now();
    await setDoc(doc(this.fs, 'tienda_items', id.toString()), { ...item, id });
  }

  async actualizarItemTienda(id: number, data: Partial<ItemTienda>): Promise<void> {
    await updateDoc(doc(this.fs, 'tienda_items', id.toString()), data as Record<string, unknown>);
  }

  async eliminarItemTienda(id: number): Promise<void> {
    await deleteDoc(doc(this.fs, 'tienda_items', id.toString()));
  }

  // ── Tienda: Pedidos ──────────────────────────────────────
  getPedidosTienda$(): Observable<PedidoTienda[]> {
    return new Observable(obs => {
      const unsub = onSnapshot(
        query(collection(this.fs, 'tienda_pedidos'), orderBy('fecha', 'desc')),
        snap => obs.next(snap.docs.map(d => d.data() as PedidoTienda)),
        err => obs.error(err));
      return () => unsub();
    });
  }

  async crearPedidoTienda(p: PedidoTienda): Promise<void> {
    await setDoc(doc(this.fs, 'tienda_pedidos', p.id.toString()), p);
  }

  async actualizarPedidoTienda(id: number, data: Partial<PedidoTienda>): Promise<void> {
    await updateDoc(doc(this.fs, 'tienda_pedidos', id.toString()), data as Record<string, unknown>);
  }

  async eliminarPedidoTienda(id: number): Promise<void> {
    await deleteDoc(doc(this.fs, 'tienda_pedidos', id.toString()));
  }
}

