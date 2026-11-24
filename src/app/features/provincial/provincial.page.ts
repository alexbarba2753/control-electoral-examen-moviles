import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
  IonList,
  IonNote,
  IonProgressBar,
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
  barChartOutline,
  businessOutline,
  locationOutline,
  logOutOutline,
  peopleOutline,
  refreshOutline,
} from 'ionicons/icons';
import { ActaConDetalle } from '../../core/models/acta.model';
import { ResumenAvanceGlobal } from '../../core/models/dashboard.model';
import { RecintoConResumen } from '../../core/models/recinto.model';
import { Usuario } from '../../core/models/usuario.model';
import { ActaService } from '../../core/services/acta.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { RecintoService } from '../../core/services/recinto.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { EstadoVistaComponent } from '../../shared/components/estado-vista.component';
import { cedulaEcuatorianaValidator } from '../../shared/validators/cedula-ecuatoriana.validator';

type PestanaProvincial = 'dashboard' | 'recintos' | 'coordinadores' | 'avance';

@Component({
  selector: 'app-provincial',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
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
    IonList,
    IonBadge,
    IonProgressBar,
    IonSpinner,
    EstadoVistaComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Coordinador Provincial</ion-title>
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
          <ion-segment-button value="dashboard">
            <ion-icon name="bar-chart-outline"></ion-icon>
            <ion-label>Dashboard</ion-label>
          </ion-segment-button>
          <ion-segment-button value="recintos">
            <ion-icon name="business-outline"></ion-icon>
            <ion-label>Recintos</ion-label>
          </ion-segment-button>
          <ion-segment-button value="coordinadores">
            <ion-icon name="people-outline"></ion-icon>
            <ion-label>Coord.</ion-label>
          </ion-segment-button>
          <ion-segment-button value="avance">
            <ion-icon name="location-outline"></ion-icon>
            <ion-label>Actas/GPS</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="contenedor">
        @if (auth.usuario(); as u) {
          <div class="cabecera-usuario">
            <span>{{ u.nombres }} {{ u.apellidos }} · Cedula {{ u.cedula }}</span>
            <ion-badge color="primary">Pichincha</ion-badge>
          </div>
        }

        <app-estado-vista
          [cargando]="cargando()"
          [error]="error()"
          [vacio]="false"
          (reintentar)="cargarTodo()"
        ></app-estado-vista>

        @if (!cargando() && !error()) {
          @if (pestana() === 'dashboard' && resumen(); as dash) {
            <ion-card>
              <ion-card-content>
                <ion-item lines="none">
                  <ion-select
                    label="Filtrar resultados"
                    labelPlacement="stacked"
                    [value]="recintoFiltro()"
                    (ionChange)="aplicarFiltroRecinto($event.detail.value)"
                  >
                    <ion-select-option value="">Consolidado provincial (todos los recintos)</ion-select-option>
                    @for (r of recintos(); track r.id) {
                      <ion-select-option [value]="r.id">
                        {{ r.nombre }} ({{ r.parroquia }})
                      </ion-select-option>
                    }
                  </ion-select>
                </ion-item>
              </ion-card-content>
            </ion-card>

            <div class="kpi-grid">
              <div class="kpi-card">
                <span class="kpi-label">Recintos</span>
                <strong>{{ dash.total_recintos }}</strong>
              </div>
              <div class="kpi-card">
                <span class="kpi-label">JRV</span>
                <strong>{{ dash.total_jrv }}</strong>
              </div>
              <div class="kpi-card">
                <span class="kpi-label">Actas</span>
                <strong>{{ dash.actas_registradas }} / {{ dash.actas_esperadas }}</strong>
              </div>
              <div class="kpi-card">
                <span class="kpi-label">Avance</span>
                <strong>{{ dash.porcentaje_avance }}%</strong>
              </div>
            </div>

            <ion-card>
              <ion-card-header>
                <ion-card-subtitle>Resultados consolidados</ion-card-subtitle>
                <ion-card-title>Alcaldia</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                @for (item of dash.resultados_alcalde; track item.organizacion_id) {
                  <div class="barra-item">
                    <div class="barra-head">
                      <div>
                        <strong>{{ item.nombre_candidato }}</strong>
                        <span class="sub-org">{{ item.lista }} · {{ item.sigla }}</span>
                      </div>
                      <span class="votos-num">{{ item.votos }} ({{ item.porcentaje }}%)</span>
                    </div>
                    <div class="barra-track">
                      <div
                        class="barra-fill"
                        [style.width.%]="item.porcentaje"
                        [style.background]="item.color_hex"
                      ></div>
                    </div>
                  </div>
                }
                <div class="pie-totales">
                  <span>Nulos: <strong>{{ dash.total_nulos_alcalde }}</strong></span>
                  <span>Blancos: <strong>{{ dash.total_blancos_alcalde }}</strong></span>
                  <span>Sufragantes: <strong>{{ dash.total_sufragantes_alcalde }}</strong></span>
                </div>
              </ion-card-content>
            </ion-card>

            <ion-card>
              <ion-card-header>
                <ion-card-subtitle>Resultados consolidados</ion-card-subtitle>
                <ion-card-title>Prefectura</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                @for (item of dash.resultados_prefecto; track item.organizacion_id) {
                  <div class="barra-item">
                    <div class="barra-head">
                      <div>
                        <strong>{{ item.nombre_candidato }}</strong>
                        <span class="sub-org">{{ item.lista }} · {{ item.sigla }}</span>
                      </div>
                      <span class="votos-num">{{ item.votos }} ({{ item.porcentaje }}%)</span>
                    </div>
                    <div class="barra-track">
                      <div
                        class="barra-fill"
                        [style.width.%]="item.porcentaje"
                        [style.background]="item.color_hex"
                      ></div>
                    </div>
                  </div>
                }
                <div class="pie-totales">
                  <span>Nulos: <strong>{{ dash.total_nulos_prefecto }}</strong></span>
                  <span>Blancos: <strong>{{ dash.total_blancos_prefecto }}</strong></span>
                  <span>Sufragantes: <strong>{{ dash.total_sufragantes_prefecto }}</strong></span>
                </div>
              </ion-card-content>
            </ion-card>

            <ion-card>
              <ion-card-header>
                <ion-card-title>Avance por recinto</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                @for (av of dash.avance_por_recinto; track av.recinto_id) {
                  <div class="avance-row">
                    <div class="barra-head">
                      <span><strong>{{ av.recinto_nombre }}</strong> · {{ av.parroquia }}</span>
                      <span>{{ av.actas_registradas }}/{{ av.actas_esperadas }} ({{ av.porcentaje_avance }}%)</span>
                    </div>
                    <ion-progress-bar [value]="av.porcentaje_avance / 100"></ion-progress-bar>
                  </div>
                }
              </ion-card-content>
            </ion-card>
          }

          @if (pestana() === 'recintos') {
            <ion-card>
              <ion-card-header>
                <ion-card-title>Nuevo recinto electoral</ion-card-title>
                <ion-card-subtitle>Al crearlo se generan automaticamente sus JRV</ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>
                <form [formGroup]="recintoForm" (ngSubmit)="crearRecinto()">
                  <ion-item>
                    <ion-input label="Canton" labelPlacement="stacked" formControlName="canton"></ion-input>
                  </ion-item>
                  <ion-item>
                    <ion-input label="Parroquia" labelPlacement="stacked" formControlName="parroquia" placeholder="Ej. Belisario Quevedo"></ion-input>
                  </ion-item>
                  <ion-item>
                    <ion-input label="Nombre del recinto" labelPlacement="stacked" formControlName="nombre" placeholder="Ej. Unidad Educativa Central"></ion-input>
                  </ion-item>
                  <ion-item>
                    <ion-input label="Cantidad de JRV" labelPlacement="stacked" type="number" min="1" max="100" formControlName="cantidad_jrv"></ion-input>
                  </ion-item>

                  <ion-button
                    type="submit"
                    expand="block"
                    class="ion-margin-top"
                    [disabled]="guardandoRecinto() || recintoForm.invalid"
                  >
                    @if (guardandoRecinto()) {
                      <ion-spinner name="crescent" slot="start"></ion-spinner>
                      Creando...
                    } @else {
                      <ion-icon slot="start" name="add-circle-outline"></ion-icon>
                      Crear recinto
                    }
                  </ion-button>
                </form>
              </ion-card-content>
            </ion-card>

            <ion-list>
              @for (r of recintos(); track r.id) {
                <ion-card>
                  <ion-card-header>
                    <ion-card-subtitle>{{ r.canton }} · {{ r.parroquia }}</ion-card-subtitle>
                    <ion-card-title>{{ r.nombre }}</ion-card-title>
                  </ion-card-header>
                  <ion-card-content>
                    <p><strong>JRV:</strong> {{ r.cantidad_jrv }} (Completas: {{ r.jrv_completas }}, Parciales: {{ r.jrv_parciales }}, Pendientes: {{ r.jrv_pendientes }})</p>
                    <p><strong>Actas:</strong> {{ r.actas_registradas }} / {{ r.actas_esperadas }}</p>
                    <p>
                      <strong>Coordinador:</strong>
                      @if (r.coordinador_nombre) {
                        <ion-badge color="success">{{ r.coordinador_nombre }}</ion-badge>
                      } @else {
                        <ion-badge color="warning">Sin asignar</ion-badge>
                      }
                    </p>
                  </ion-card-content>
                </ion-card>
              }
            </ion-list>
          }

          @if (pestana() === 'coordinadores') {
            <ion-card>
              <ion-card-header>
                <ion-card-title>Crear coordinador de recinto</ion-card-title>
                <ion-card-subtitle>Clave inicial Ecuador2026 con cambio obligatorio</ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>
                <form [formGroup]="coordinadorForm" (ngSubmit)="crearCoordinador()">
                  <ion-item>
                    <ion-input label="Cedula" labelPlacement="stacked" maxlength="10" inputmode="numeric" formControlName="cedula"></ion-input>
                  </ion-item>
                  @if (coordinadorForm.get('cedula')?.touched && coordinadorForm.get('cedula')?.errors) {
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
                  <ion-item>
                    <ion-select label="Asignar recinto" labelPlacement="stacked" formControlName="recinto_id" placeholder="Seleccione recinto disponible">
                      <ion-select-option value="">Sin asignar por ahora</ion-select-option>
                      @for (r of recintos(); track r.id) {
                        <ion-select-option [value]="r.id" [disabled]="!!r.coordinador_id">
                          {{ r.nombre }} {{ r.coordinador_id ? '(Ocupado)' : '' }}
                        </ion-select-option>
                      }
                    </ion-select>
                  </ion-item>

                  <ion-button
                    type="submit"
                    expand="block"
                    class="ion-margin-top"
                    [disabled]="guardandoCoord() || coordinadorForm.invalid"
                  >
                    @if (guardandoCoord()) {
                      <ion-spinner name="crescent" slot="start"></ion-spinner>
                      Creando cuenta...
                    } @else {
                      <ion-icon slot="start" name="add-circle-outline"></ion-icon>
                      Crear coordinador de recinto
                    }
                  </ion-button>
                </form>
              </ion-card-content>
            </ion-card>

            @if (coordinadores().length === 0) {
              <app-estado-vista
                [vacio]="true"
                textoVacio="Aun no existen coordinadores de recinto registrados."
              ></app-estado-vista>
            } @else {
              @for (c of coordinadores(); track c.id) {
                <ion-card>
                  <ion-card-header>
                    <ion-card-subtitle>Cedula: {{ c.cedula }} · {{ c.correo }}</ion-card-subtitle>
                    <ion-card-title>{{ c.nombres }} {{ c.apellidos }}</ion-card-title>
                  </ion-card-header>
                  <ion-card-content>
                    <p>Telefono: {{ c.telefono }}</p>
                    <ion-item lines="none">
                      <ion-select
                        label="Recinto asignado"
                        labelPlacement="stacked"
                        [value]="c.recinto_id ?? ''"
                        (ionChange)="reasignarCoordinador(c.id, $event.detail.value)"
                      >
                        <ion-select-option value="">Sin recinto asignado</ion-select-option>
                        @for (r of recintos(); track r.id) {
                          <ion-select-option [value]="r.id">
                            {{ r.nombre }} ({{ r.parroquia }})
                          </ion-select-option>
                        }
                      </ion-select>
                    </ion-item>
                  </ion-card-content>
                </ion-card>
              }
            }
          }

          @if (pestana() === 'avance') {
            @if (actas().length === 0) {
              <app-estado-vista
                [vacio]="true"
                textoVacio="Todavia no se han registrado actas con evidencia fotografica."
              ></app-estado-vista>
            } @else {
              @for (a of actas(); track a.id) {
                <ion-card>
                  <ion-card-header>
                    <ion-card-subtitle>
                      {{ a.recinto_nombre }} · JRV #{{ a.jrv_numero }} · {{ a.dignidad | uppercase }}
                    </ion-card-subtitle>
                    <ion-card-title>Total sufragantes: {{ a.total_sufragantes }}</ion-card-title>
                  </ion-card-header>
                  <ion-card-content>
                    <p>Nulos: {{ a.nulos }} · Blancos: {{ a.blancos }} · Nitidez: {{ a.puntaje_nitidez }}</p>
                    <p>
                      <strong>GPS:</strong> {{ a.latitud }}, {{ a.longitud }}
                      @if (a.precision_gps !== null) {
                        (±{{ a.precision_gps }} m)
                      }
                    </p>
                    <ion-button
                      size="small"
                      fill="outline"
                      [href]="'https://www.google.com/maps?q=' + a.latitud + ',' + a.longitud"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ion-icon slot="start" name="location-outline"></ion-icon>
                      Ver ubicacion en mapa
                    </ion-button>
                    @if (a.foto_url) {
                      <img [src]="a.foto_url" alt="Foto del acta" class="foto-acta" />
                    }
                  </ion-card-content>
                </ion-card>
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
        max-width: 820px;
        margin: 0 auto;
      }
      .cabecera-usuario {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0.75rem;
        margin-bottom: 0.75rem;
        background: var(--ion-color-light);
        border-radius: 10px;
        font-size: 0.88rem;
      }
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 0.6rem;
        margin: 0.75rem 0.5rem;
      }
      .kpi-card {
        background: var(--ion-card-background, #ffffff);
        border: 1px solid var(--ion-color-light-shade);
        border-radius: 10px;
        padding: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .kpi-label {
        font-size: 0.78rem;
        color: var(--ion-color-medium);
      }
      .kpi-card strong {
        font-size: 1.2rem;
      }
      .barra-item {
        margin-bottom: 0.9rem;
      }
      .barra-head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 0.5rem;
        margin-bottom: 0.25rem;
        font-size: 0.88rem;
      }
      .sub-org {
        display: block;
        font-size: 0.78rem;
        color: var(--ion-color-medium);
      }
      .votos-num {
        font-weight: 600;
        white-space: nowrap;
      }
      .barra-track {
        height: 10px;
        background: var(--ion-color-light);
        border-radius: 999px;
        overflow: hidden;
      }
      .barra-fill {
        height: 100%;
        border-radius: 999px;
        transition: width 0.25s ease;
      }
      .pie-totales {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--ion-color-light-shade);
        font-size: 0.86rem;
      }
      .avance-row {
        margin-bottom: 0.85rem;
      }
      .campo-error {
        display: block;
        padding: 0.25rem 0.75rem;
        font-size: 0.8rem;
      }
      .foto-acta {
        margin-top: 0.75rem;
        width: 100%;
        max-height: 240px;
        object-fit: contain;
        border-radius: 8px;
        border: 1px solid var(--ion-color-light-shade);
      }
    `,
  ],
})
export class ProvincialPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly recintoService = inject(RecintoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly dashboardService = inject(DashboardService);
  private readonly actaService = inject(ActaService);
  private readonly toastCtrl = inject(ToastController);

  readonly pestana = signal<PestanaProvincial>('dashboard');
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly guardandoRecinto = signal(false);
  readonly guardandoCoord = signal(false);

  readonly recintos = signal<RecintoConResumen[]>([]);
  readonly coordinadores = signal<Usuario[]>([]);
  readonly resumen = signal<ResumenAvanceGlobal | null>(null);
  readonly actas = signal<ActaConDetalle[]>([]);
  readonly recintoFiltro = signal<string>('');

  readonly recintoForm = this.fb.group({
    provincia: ['Pichincha', [Validators.required]],
    canton: ['Quito', [Validators.required]],
    parroquia: ['', [Validators.required]],
    nombre: ['', [Validators.required]],
    cantidad_jrv: [4, [Validators.required, Validators.min(1), Validators.max(100)]],
  });

  readonly coordinadorForm = this.fb.group({
    cedula: ['', [Validators.required, cedulaEcuatorianaValidator()]],
    nombres: ['', [Validators.required]],
    apellidos: ['', [Validators.required]],
    telefono: ['', [Validators.required, Validators.minLength(7)]],
    correo: ['', [Validators.required, Validators.email]],
    recinto_id: [''],
  });

  constructor() {
    addIcons({
      barChartOutline,
      businessOutline,
      peopleOutline,
      locationOutline,
      logOutOutline,
      refreshOutline,
      addCircleOutline,
    });
  }

  ngOnInit(): void {
    void this.cargarTodo();
  }

  cambiarPestana(valor: string | number | undefined): void {
    if (
      valor === 'dashboard' ||
      valor === 'recintos' ||
      valor === 'coordinadores' ||
      valor === 'avance'
    ) {
      this.pestana.set(valor);
    }
  }

  async cargarTodo(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const [recintos, coordinadores, resumen, actas] = await Promise.all([
        this.recintoService.listarRecintosConResumen(),
        this.usuarioService.listarCoordinadoresRecinto(),
        this.dashboardService.obtenerResumen(this.recintoFiltro() || null),
        this.actaService.listarActasConUbicacion(),
      ]);
      this.recintos.set(recintos);
      this.coordinadores.set(coordinadores);
      this.resumen.set(resumen);
      this.actas.set(actas);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al cargar datos provinciales.');
    } finally {
      this.cargando.set(false);
    }
  }

  async aplicarFiltroRecinto(recintoId: string): Promise<void> {
    this.recintoFiltro.set(recintoId || '');
    try {
      const resumen = await this.dashboardService.obtenerResumen(recintoId || null);
      this.resumen.set(resumen);
    } catch (err) {
      await this.mostrarToast(
        err instanceof Error ? err.message : 'Error al filtrar resultados',
        'danger'
      );
    }
  }

  async crearRecinto(): Promise<void> {
    if (this.recintoForm.invalid) {
      this.recintoForm.markAllAsTouched();
      return;
    }

    this.guardandoRecinto.set(true);
    try {
      await this.recintoService.crearRecinto({
        provincia: String(this.recintoForm.value.provincia ?? 'Pichincha'),
        canton: String(this.recintoForm.value.canton ?? 'Quito'),
        parroquia: String(this.recintoForm.value.parroquia ?? ''),
        nombre: String(this.recintoForm.value.nombre ?? ''),
        cantidad_jrv: Number(this.recintoForm.value.cantidad_jrv ?? 1),
      });
      this.recintoForm.patchValue({ parroquia: '', nombre: '', cantidad_jrv: 4 });
      await this.mostrarToast('Recinto y JRV creados correctamente.', 'success');
      await this.cargarTodo();
    } catch (err) {
      await this.mostrarToast(
        err instanceof Error ? err.message : 'No se pudo crear el recinto',
        'danger'
      );
    } finally {
      this.guardandoRecinto.set(false);
    }
  }

  async crearCoordinador(): Promise<void> {
    if (this.coordinadorForm.invalid) {
      this.coordinadorForm.markAllAsTouched();
      return;
    }

    this.guardandoCoord.set(true);
    try {
      const resp = await this.usuarioService.crearUsuario({
        cedula: String(this.coordinadorForm.value.cedula ?? '').trim(),
        nombres: String(this.coordinadorForm.value.nombres ?? '').trim(),
        apellidos: String(this.coordinadorForm.value.apellidos ?? '').trim(),
        telefono: String(this.coordinadorForm.value.telefono ?? '').trim(),
        correo: String(this.coordinadorForm.value.correo ?? '').trim(),
        rol: 'recinto',
        recinto_id: this.coordinadorForm.value.recinto_id || null,
      });
      this.coordinadorForm.reset({ recinto_id: '' });
      await this.mostrarToast(resp.mensaje, 'success');
      await this.cargarTodo();
    } catch (err) {
      await this.mostrarToast(
        err instanceof Error ? err.message : 'No se pudo crear el coordinador',
        'danger'
      );
    } finally {
      this.guardandoCoord.set(false);
    }
  }

  async reasignarCoordinador(coordinadorId: string, recintoId: string): Promise<void> {
    try {
      await this.usuarioService.asignarRecintoACoordinador(coordinadorId, recintoId || null);
      await this.mostrarToast('Asignacion de recinto actualizada.', 'success');
      await this.cargarTodo();
    } catch (err) {
      await this.mostrarToast(
        err instanceof Error ? err.message : 'No se pudo actualizar la asignacion',
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
