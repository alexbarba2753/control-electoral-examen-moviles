import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addCircleOutline,
  createOutline,
  documentTextOutline,
  gridOutline,
  logOutOutline,
  peopleOutline,
  refreshOutline,
} from 'ionicons/icons';
import { ActaConDetalle } from '../../core/models/acta.model';
import { JrvConDetalles } from '../../core/models/jrv.model';
import { Recinto } from '../../core/models/recinto.model';
import { Usuario } from '../../core/models/usuario.model';
import { ActaService } from '../../core/services/acta.service';
import { AuthService } from '../../core/services/auth.service';
import { JrvService } from '../../core/services/jrv.service';
import { RecintoService } from '../../core/services/recinto.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { EstadoVistaComponent } from '../../shared/components/estado-vista.component';
import { cedulaEcuatorianaValidator } from '../../shared/validators/cedula-ecuatoriana.validator';

type PestanaRecinto = 'mesas' | 'veedores' | 'actas';

@Component({
  selector: 'app-recinto',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonNote,
    IonBadge,
    IonSpinner,
    EstadoVistaComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Coordinador de Recinto</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="cargarTodo()" [disabled]="cargando()">
            <ion-icon slot="icon-only" name="refresh-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="salir()">
            <ion-icon slot="icon-only" name="log-out-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment [value]="pestana()" (ionChange)="cambiarPestana($event.detail.value)">
          <ion-segment-button value="mesas">
            <ion-icon name="grid-outline"></ion-icon>
            <ion-label>Mesas JRV</ion-label>
          </ion-segment-button>
          <ion-segment-button value="veedores">
            <ion-icon name="people-outline"></ion-icon>
            <ion-label>Veedores</ion-label>
          </ion-segment-button>
          <ion-segment-button value="actas">
            <ion-icon name="document-text-outline"></ion-icon>
            <ion-label>Actas</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="contenedor">
        @if (recinto(); as r) {
          <div class="cabecera-recinto">
            <div>
              <strong>{{ r.nombre }}</strong>
              <div class="sub">{{ r.canton }} · {{ r.parroquia }}</div>
            </div>
            <ion-badge color="primary">{{ mesas().length }} JRV</ion-badge>
          </div>
        }

        <app-estado-vista
          [cargando]="cargando()"
          [error]="error()"
          [vacio]="false"
          (reintentar)="cargarTodo()"
        ></app-estado-vista>

        @if (!cargando() && !error()) {
          @if (!recinto()) {
            <app-estado-vista
              [vacio]="true"
              textoVacio="Su cuenta aun no tiene un recinto asignado por el coordinador provincial."
            ></app-estado-vista>
          } @else {
            @if (pestana() === 'mesas') {
              @for (m of mesas(); track m.id) {
                <ion-card>
                  <ion-card-header>
                    <div class="card-top">
                      <ion-card-title>JRV #{{ m.numero }}</ion-card-title>
                      <ion-badge [color]="colorEstado(m.estado)">{{ m.estado | uppercase }}</ion-badge>
                    </div>
                  </ion-card-header>
                  <ion-card-content>
                    <div class="badges-actas">
                      <ion-badge [color]="m.tiene_acta_alcalde ? 'success' : 'medium'">
                        Alcalde: {{ m.tiene_acta_alcalde ? 'Registrada' : 'Pendiente' }}
                      </ion-badge>
                      <ion-badge [color]="m.tiene_acta_prefecto ? 'success' : 'medium'">
                        Prefecto: {{ m.tiene_acta_prefecto ? 'Registrada' : 'Pendiente' }}
                      </ion-badge>
                    </div>

                    <ion-item lines="full" class="ion-margin-top">
                      <ion-select
                        label="Veedor asignado"
                        labelPlacement="stacked"
                        [value]="m.veedor_id ?? ''"
                        (ionChange)="asignarVeedor(m.id, $event.detail.value)"
                      >
                        <ion-select-option value="">Sin asignar</ion-select-option>
                        @for (v of veedores(); track v.id) {
                          <ion-select-option [value]="v.id">
                            {{ v.nombres }} {{ v.apellidos }} ({{ v.cedula }})
                          </ion-select-option>
                        }
                      </ion-select>
                    </ion-item>

                    <div class="acciones-jrv">
                      <ion-button
                        size="small"
                        fill="outline"
                        [routerLink]="['/acta', m.id, 'alcalde']"
                      >
                        <ion-icon slot="start" name="create-outline"></ion-icon>
                        {{ m.tiene_acta_alcalde ? 'Corregir Alcalde' : 'Registrar Alcalde' }}
                      </ion-button>
                      <ion-button
                        size="small"
                        fill="outline"
                        color="secondary"
                        [routerLink]="['/acta', m.id, 'prefecto']"
                      >
                        <ion-icon slot="start" name="create-outline"></ion-icon>
                        {{ m.tiene_acta_prefecto ? 'Corregir Prefecto' : 'Registrar Prefecto' }}
                      </ion-button>
                    </div>
                  </ion-card-content>
                </ion-card>
              }
            }

            @if (pestana() === 'veedores') {
              <ion-card>
                <ion-card-header>
                  <ion-card-title>Crear veedor de mesa</ion-card-title>
                  <ion-card-subtitle>Clave inicial Ecuador2026 con cambio obligatorio</ion-card-subtitle>
                </ion-card-header>
                <ion-card-content>
                  <form [formGroup]="veedorForm" (ngSubmit)="crearVeedor()">
                    <ion-item>
                      <ion-input label="Cedula" labelPlacement="stacked" maxlength="10" inputmode="numeric" formControlName="cedula"></ion-input>
                    </ion-item>
                    @if (veedorForm.get('cedula')?.touched && veedorForm.get('cedula')?.errors) {
                      <ion-note color="danger" class="campo-error">Cedula ecuatoriana invalida.</ion-note>
                    }
                    <ion-item>
                      <ion-input label="Nombres" labelPlacement="stacked" formControlName="nombres"></ion-input>
                    </ion-item>
                    <ion-item>
                      <ion-input label="Apellidos" labelPlacement="stacked" formControlName="apellidos"></ion-input>
                    </ion-item>
                    <ion-item>
                      <ion-input label="Telefono" labelPlacement="stacked" type="tel" formControlName="telefono"></ion-input>
                    </ion-item>
                    <ion-item>
                      <ion-input label="Correo electronico" labelPlacement="stacked" type="email" formControlName="correo"></ion-input>
                    </ion-item>

                    <ion-button
                      type="submit"
                      expand="block"
                      class="ion-margin-top"
                      [disabled]="guardandoVeedor() || veedorForm.invalid"
                    >
                      @if (guardandoVeedor()) {
                        <ion-spinner name="crescent" slot="start"></ion-spinner>
                        Creando...
                      } @else {
                        <ion-icon slot="start" name="add-circle-outline"></ion-icon>
                        Crear veedor
                      }
                    </ion-button>
                  </form>
                </ion-card-content>
              </ion-card>

              @if (veedores().length === 0) {
                <app-estado-vista
                  [vacio]="true"
                  textoVacio="No hay veedores registrados en este recinto."
                ></app-estado-vista>
              } @else {
                @for (v of veedores(); track v.id) {
                  <ion-card>
                    <ion-card-header>
                      <ion-card-subtitle>Cedula: {{ v.cedula }}</ion-card-subtitle>
                      <ion-card-title>{{ v.nombres }} {{ v.apellidos }}</ion-card-title>
                    </ion-card-header>
                    <ion-card-content>
                      <p>Correo: {{ v.correo }} · Tel: {{ v.telefono }}</p>
                    </ion-card-content>
                  </ion-card>
                }
              }
            }

            @if (pestana() === 'actas') {
              @if (actas().length === 0) {
                <app-estado-vista
                  [vacio]="true"
                  textoVacio="No existen actas registradas todavia en este recinto."
                ></app-estado-vista>
              } @else {
                @for (a of actas(); track a.id) {
                  <ion-card>
                    <ion-card-header>
                      <ion-card-subtitle>JRV #{{ a.jrv_numero }} · {{ a.dignidad | uppercase }}</ion-card-subtitle>
                      <ion-card-title>Total sufragantes: {{ a.total_sufragantes }}</ion-card-title>
                    </ion-card-header>
                    <ion-card-content>
                      <p>Nulos: {{ a.nulos }} · Blancos: {{ a.blancos }} · Nitidez: {{ a.puntaje_nitidez }}</p>
                      <p>GPS: {{ a.latitud }}, {{ a.longitud }}</p>
                      @if (a.foto_url) {
                        <img [src]="a.foto_url" alt="Evidencia de acta" class="foto-acta" />
                      }
                      <ion-button
                        size="small"
                        class="ion-margin-top"
                        [routerLink]="['/acta', a.jrv_id, a.dignidad]"
                      >
                        <ion-icon slot="start" name="create-outline"></ion-icon>
                        Corregir datos y foto
                      </ion-button>
                    </ion-card-content>
                  </ion-card>
                }
              }
            }
          }
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      .contenedor {
        max-width: 780px;
        margin: 0 auto;
      }
      .cabecera-recinto {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        margin-bottom: 0.75rem;
        background: var(--ion-color-light);
        border-radius: 10px;
      }
      .sub {
        font-size: 0.84rem;
        color: var(--ion-color-medium);
      }
      .card-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .badges-actas {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .acciones-jrv {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.85rem;
      }
      .campo-error {
        display: block;
        padding: 0.25rem 0.75rem;
        font-size: 0.8rem;
      }
      .foto-acta {
        margin-top: 0.75rem;
        width: 100%;
        max-height: 220px;
        object-fit: contain;
        border-radius: 8px;
        border: 1px solid var(--ion-color-light-shade);
      }
    `,
  ],
})
export class RecintoPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly recintoService = inject(RecintoService);
  private readonly jrvService = inject(JrvService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly actaService = inject(ActaService);
  private readonly toastCtrl = inject(ToastController);

  readonly pestana = signal<PestanaRecinto>('mesas');
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly guardandoVeedor = signal(false);

  readonly recinto = signal<Recinto | null>(null);
  readonly mesas = signal<JrvConDetalles[]>([]);
  readonly veedores = signal<Usuario[]>([]);
  readonly actas = signal<ActaConDetalle[]>([]);

  readonly veedorForm = this.fb.group({
    cedula: ['', [Validators.required, cedulaEcuatorianaValidator()]],
    nombres: ['', [Validators.required]],
    apellidos: ['', [Validators.required]],
    telefono: ['', [Validators.required, Validators.minLength(7)]],
    correo: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    addIcons({
      gridOutline,
      peopleOutline,
      documentTextOutline,
      logOutOutline,
      refreshOutline,
      addCircleOutline,
      createOutline,
    });
  }

  ngOnInit(): void {
    void this.cargarTodo();
  }

  ionViewWillEnter(): void {
    void this.cargarTodo();
  }

  cambiarPestana(valor: string | number | undefined): void {
    if (valor === 'mesas' || valor === 'veedores' || valor === 'actas') {
      this.pestana.set(valor);
    }
  }

  colorEstado(estado: string): string {
    if (estado === 'completa') return 'success';
    if (estado === 'parcial') return 'warning';
    return 'medium';
  }

  async cargarTodo(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const usuario = this.auth.usuario();
      const recintoId = usuario?.recinto_id;
      if (!recintoId) {
        this.recinto.set(null);
        return;
      }

      const [recinto, mesas, veedores, actas] = await Promise.all([
        this.recintoService.obtenerRecintoPorId(recintoId),
        this.jrvService.listarMesasRecinto(recintoId),
        this.usuarioService.listarVeedoresRecinto(recintoId),
        this.actaService.listarActasConUbicacion(recintoId),
      ]);

      this.recinto.set(recinto);
      this.mesas.set(mesas);
      this.veedores.set(veedores);
      this.actas.set(actas);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al cargar informacion del recinto.');
    } finally {
      this.cargando.set(false);
    }
  }

  async crearVeedor(): Promise<void> {
    if (this.veedorForm.invalid) {
      this.veedorForm.markAllAsTouched();
      return;
    }

    this.guardandoVeedor.set(true);
    try {
      const resp = await this.usuarioService.crearUsuario({
        cedula: String(this.veedorForm.value.cedula ?? '').trim(),
        nombres: String(this.veedorForm.value.nombres ?? '').trim(),
        apellidos: String(this.veedorForm.value.apellidos ?? '').trim(),
        telefono: String(this.veedorForm.value.telefono ?? '').trim(),
        correo: String(this.veedorForm.value.correo ?? '').trim(),
        rol: 'veedor',
      });
      this.veedorForm.reset();
      await this.mostrarToast(resp.mensaje, 'success');
      await this.cargarTodo();
    } catch (err) {
      await this.mostrarToast(
        err instanceof Error ? err.message : 'No se pudo crear el veedor',
        'danger'
      );
    } finally {
      this.guardandoVeedor.set(false);
    }
  }

  async asignarVeedor(jrvId: string, veedorId: string): Promise<void> {
    try {
      await this.jrvService.asignarVeedor(jrvId, veedorId || null);
      await this.mostrarToast('Asignacion de veedor actualizada.', 'success');
      await this.cargarTodo();
    } catch (err) {
      await this.mostrarToast(
        err instanceof Error ? err.message : 'No se pudo asignar el veedor',
        'danger'
      );
    }
  }

  async salir(): Promise<void> {
    await this.auth.cerrarSesion();
  }

  private async mostrarToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 3000, color });
    await toast.present();
  }
}
