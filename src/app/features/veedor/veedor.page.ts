import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  createOutline,
  logOutOutline,
  refreshOutline,
} from 'ionicons/icons';
import { JrvConDetalles } from '../../core/models/jrv.model';
import { AuthService } from '../../core/services/auth.service';
import { JrvService } from '../../core/services/jrv.service';
import { EstadoVistaComponent } from '../../shared/components/estado-vista.component';

@Component({
  selector: 'app-veedor',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonBadge,
    EstadoVistaComponent,
  ],
  templateUrl: './veedor.page.html',
  styleUrls: ['./veedor.page.scss'],
})
export class VeedorPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly jrvService = inject(JrvService);

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly mesas = signal<JrvConDetalles[]>([]);

  constructor() {
    addIcons({ refreshOutline, logOutOutline, createOutline, checkmarkCircleOutline });
  }

  ngOnInit(): void {
    void this.cargarMesas();
  }

  ionViewWillEnter(): void {
    void this.cargarMesas();
  }

  colorEstado(estado: string): string {
    if (estado === 'completa') return 'success';
    if (estado === 'parcial') return 'warning';
    return 'medium';
  }

  async cargarMesas(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const lista = await this.jrvService.listarMisMesasAsignadas();
      this.mesas.set(lista);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al cargar sus mesas.');
    } finally {
      this.cargando.set(false);
    }
  }

  async salir(): Promise<void> {
    await this.auth.cerrarSesion();
  }
}
