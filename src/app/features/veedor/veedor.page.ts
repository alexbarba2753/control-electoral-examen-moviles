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
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Mis Mesas (Veedor)</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="cargarMesas()" [disabled]="cargando()">
            <ion-icon slot="icon-only" name="refresh-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="salir()">
            <ion-icon slot="icon-only" name="log-out-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="contenedor">
        @if (auth.usuario(); as u) {
          <div class="cabecera-usuario">
            <span>{{ u.nombres }} {{ u.apellidos }} · Cedula {{ u.cedula }}</span>
            <ion-badge color="tertiary">Veedor</ion-badge>
          </div>
        }

        <app-estado-vista
          [cargando]="cargando()"
          [error]="error()"
          [vacio]="!cargando() && !error() && mesas().length === 0"
          textoVacio="No tiene juntas receptoras del voto asignadas todavia."
          (reintentar)="cargarMesas()"
        ></app-estado-vista>

        @if (!cargando() && !error()) {
          @for (m of mesas(); track m.id) {
            <ion-card>
              <ion-card-header>
                <div class="card-top">
                  <div>
                    <ion-card-subtitle>{{ m.recinto_nombre }} · {{ m.recinto_parroquia }}</ion-card-subtitle>
                    <ion-card-title>JRV #{{ m.numero }}</ion-card-title>
                  </div>
                  <ion-badge [color]="colorEstado(m.estado)">{{ m.estado | uppercase }}</ion-badge>
                </div>
              </ion-card-header>
              <ion-card-content>
                <div class="acciones-grid">
                  <ion-button
                    expand="block"
                    [fill]="m.tiene_acta_alcalde ? 'outline' : 'solid'"
                    [routerLink]="['/acta', m.id, 'alcalde']"
                  >
                    <ion-icon
                      slot="start"
                      [name]="m.tiene_acta_alcalde ? 'checkmark-circle-outline' : 'create-outline'"
                    ></ion-icon>
                    {{ m.tiene_acta_alcalde ? 'Corregir Alcalde' : 'Registrar Alcalde' }}
                  </ion-button>

                  <ion-button
                    expand="block"
                    color="secondary"
                    [fill]="m.tiene_acta_prefecto ? 'outline' : 'solid'"
                    [routerLink]="['/acta', m.id, 'prefecto']"
                  >
                    <ion-icon
                      slot="start"
                      [name]="m.tiene_acta_prefecto ? 'checkmark-circle-outline' : 'create-outline'"
                    ></ion-icon>
                    {{ m.tiene_acta_prefecto ? 'Corregir Prefecto' : 'Registrar Prefecto' }}
                  </ion-button>
                </div>
              </ion-card-content>
            </ion-card>
          }
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      .contenedor {
        max-width: 720px;
        margin: 0 auto;
      }
      .cabecera-usuario {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.6rem 0.9rem;
        margin-bottom: 0.75rem;
        background: var(--ion-color-light);
        border-radius: 10px;
        font-size: 0.88rem;
      }
      .card-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 0.5rem;
      }
      .acciones-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 0.6rem;
      }
    `,
  ],
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
