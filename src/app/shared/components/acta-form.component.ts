import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cameraOutline,
  checkmarkCircleOutline,
  locationOutline,
  saveOutline,
  warningOutline,
} from 'ionicons/icons';
import {
  ActaConDetalle,
  CoordenadasGps,
  GuardarActaPayload,
  ResultadoNitidez,
} from '../../core/models/acta.model';
import { Dignidad, OrganizacionConCandidatura } from '../../core/models/organizacion.model';
import { CameraService } from '../../core/services/camera.service';
import { GeolocationService } from '../../core/services/geolocation.service';
import { ImageQualityService } from '../../core/services/image-quality.service';
import {
  consistenciaActaValidator,
  evaluarCuadreActa,
} from '../validators/consistencia-acta.validator';

@Component({
  selector: 'app-acta-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonNote,
    IonBadge,
    IonButton,
    IonIcon,
    IonSpinner,
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="enviar()">
      <ion-card>
        <ion-card-header>
          <ion-card-subtitle>{{ dignidad === 'alcalde' ? 'Alcaldia' : 'Prefectura' }}</ion-card-subtitle>
          <ion-card-title>
            {{ actaExistente ? 'Corregir acta registrada' : 'Registrar nueva acta' }}
          </ion-card-title>
        </ion-card-header>

        <ion-card-content>
          <ion-list lines="full" formArrayName="votosOrganizaciones">
            @for (ctrl of votosArray.controls; track orgs[$index]?.id) {
              <ion-item [formGroupName]="$index">
                <ion-label position="stacked">
                  <span class="org-chip" [style.background]="orgs[$index].color_hex"></span>
                  <strong>{{ orgs[$index].lista }} · {{ orgs[$index].sigla }}</strong>
                  <div class="cand-nombre">{{ orgs[$index].nombre_candidato }}</div>
                </ion-label>
                <ion-input
                  type="number"
                  inputmode="numeric"
                  min="0"
                  formControlName="votos"
                  placeholder="0"
                ></ion-input>
              </ion-item>
            }
          </ion-list>

          <ion-list lines="full" class="totales-lista">
            <ion-item>
              <ion-label position="stacked">Votos nulos</ion-label>
              <ion-input type="number" inputmode="numeric" min="0" formControlName="nulos"></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Votos blancos</ion-label>
              <ion-input type="number" inputmode="numeric" min="0" formControlName="blancos"></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Total de sufragantes</ion-label>
              <ion-input
                type="number"
                inputmode="numeric"
                min="0"
                formControlName="total_sufragantes"
              ></ion-input>
            </ion-item>
          </ion-list>

          @let cuadre = obtenerResumenCuadre();
          <div class="resumen-cuadre" [class.cuadra]="cuadre.esValido" [class.descuadra]="!cuadre.esValido">
            <div class="cuadre-linea">
              <span>Suma votos + nulos + blancos:</span>
              <strong>{{ cuadre.sumaCalculada }}</strong>
            </div>
            <div class="cuadre-linea">
              <span>Total de sufragantes:</span>
              <strong>{{ cuadre.totalSufragantes }}</strong>
            </div>
            @if (cuadre.contieneValoresInvalidos) {
              <ion-note color="danger">Todos los campos deben ser enteros mayores o iguales a 0.</ion-note>
            } @else if (cuadre.esValido) {
              <ion-badge color="success">
                <ion-icon name="checkmark-circle-outline"></ion-icon> Totales consistentes
              </ion-badge>
            } @else {
              <ion-badge color="danger">
                <ion-icon name="warning-outline"></ion-icon>
                Descuadre de {{ cuadre.diferencia > 0 ? '+' + cuadre.diferencia : cuadre.diferencia }} votos
              </ion-badge>
            }
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-header>
          <ion-card-title>Evidencia fotografica y ubicacion GPS</ion-card-title>
          <ion-card-subtitle>Se verifica nitidez local antes de aceptar la imagen</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <div class="acciones-hardware">
            <ion-button
              type="button"
              expand="block"
              fill="outline"
              [disabled]="capturandoFoto()"
              (click)="capturarFoto()"
            >
              @if (capturandoFoto()) {
                <ion-spinner name="dots" slot="start"></ion-spinner>
              } @else {
                <ion-icon slot="start" name="camera-outline"></ion-icon>
              }
              {{ fotoPreview() ? 'Repetir fotografia del acta' : 'Capturar fotografia del acta' }}
            </ion-button>

            <ion-button
              type="button"
              expand="block"
              fill="outline"
              color="secondary"
              [disabled]="capturandoGps()"
              (click)="capturarGps()"
            >
              @if (capturandoGps()) {
                <ion-spinner name="dots" slot="start"></ion-spinner>
              } @else {
                <ion-icon slot="start" name="location-outline"></ion-icon>
              }
              {{ coordenadas() ? 'Actualizar ubicacion GPS' : 'Obtener ubicacion GPS' }}
            </ion-button>
          </div>

          @if (errorFoto()) {
            <div class="alerta-error">{{ errorFoto() }}</div>
          }

          @if (resultadoNitidez(); as nitidez) {
            <div class="estado-nitidez" [class.ok]="nitidez.esNitida" [class.mal]="!nitidez.esNitida">
              @if (nitidez.esNitida) {
                <ion-icon name="checkmark-circle-outline"></ion-icon>
                <span>Fotografia nitida aceptada (puntaje {{ nitidez.puntaje }} / minimo {{ nitidez.umbral }})</span>
              } @else {
                <ion-icon name="warning-outline"></ion-icon>
                <span>
                  Fotografia borrosa rechazada (puntaje {{ nitidez.puntaje }} / minimo {{ nitidez.umbral }}).
                  Tome una nueva foto enfocada y con buena iluminacion.
                </span>
              }
            </div>
          }

          @if (fotoPreview(); as imgSrc) {
            <img [src]="imgSrc" alt="Vista previa del acta" class="foto-preview" />
          }

          @if (errorGps()) {
            <div class="alerta-error">{{ errorGps() }}</div>
          }

          @if (coordenadas(); as gps) {
            <div class="gps-box">
              <strong>Coordenadas registradas:</strong>
              <span>Lat: {{ gps.latitud }} | Lng: {{ gps.longitud }}</span>
              @if (gps.precision !== null) {
                <span>Precision aprox.: {{ gps.precision }} m</span>
              }
            </div>
          }
        </ion-card-content>
      </ion-card>

      <div class="boton-guardar-wrap">
        <ion-button
          type="submit"
          expand="block"
          color="primary"
          [disabled]="!puedeGuardar()"
        >
          @if (guardando) {
            <ion-spinner name="crescent" slot="start"></ion-spinner>
            Guardando acta...
          } @else {
            <ion-icon slot="start" name="save-outline"></ion-icon>
            {{ actaExistente ? 'Guardar correccion de acta' : 'Guardar acta' }}
          }
        </ion-button>
      </div>
    </form>
  `,
  styles: [
    `
      .org-chip {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-right: 6px;
      }
      .cand-nombre {
        font-size: 0.85rem;
        color: var(--ion-color-medium);
      }
      .totales-lista {
        margin-top: 0.75rem;
      }
      .resumen-cuadre {
        margin-top: 1rem;
        padding: 0.85rem;
        border-radius: 10px;
        background: var(--ion-color-light);
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
      .resumen-cuadre.cuadra {
        border: 1px solid var(--ion-color-success);
      }
      .resumen-cuadre.descuadra {
        border: 1px solid var(--ion-color-danger);
      }
      .cuadre-linea {
        display: flex;
        justify-content: space-between;
        font-size: 0.92rem;
      }
      .acciones-hardware {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }
      .alerta-error {
        margin-top: 0.75rem;
        padding: 0.7rem;
        border-radius: 8px;
        background: rgba(var(--ion-color-danger-rgb), 0.12);
        color: var(--ion-color-danger);
        font-size: 0.88rem;
      }
      .estado-nitidez {
        margin-top: 0.75rem;
        padding: 0.7rem;
        border-radius: 8px;
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        font-size: 0.88rem;
      }
      .estado-nitidez.ok {
        background: rgba(var(--ion-color-success-rgb), 0.14);
        color: var(--ion-color-success-shade);
      }
      .estado-nitidez.mal {
        background: rgba(var(--ion-color-danger-rgb), 0.14);
        color: var(--ion-color-danger);
      }
      .foto-preview {
        margin-top: 0.75rem;
        width: 100%;
        max-height: 280px;
        object-fit: contain;
        border-radius: 8px;
        border: 1px solid var(--ion-color-light-shade);
      }
      .gps-box {
        margin-top: 0.75rem;
        padding: 0.7rem;
        border-radius: 8px;
        background: var(--ion-color-light);
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        font-size: 0.86rem;
      }
      .boton-guardar-wrap {
        padding: 0 1rem 2rem;
      }
    `,
  ],
})
export class ActaFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly camera = inject(CameraService);
  private readonly geolocation = inject(GeolocationService);
  private readonly imageQuality = inject(ImageQualityService);

  @Input({ required: true }) jrvId!: string;
  @Input({ required: true }) recintoId!: string;
  @Input({ required: true }) dignidad!: Dignidad;
  @Input({ required: true }) orgs: OrganizacionConCandidatura[] = [];
  @Input() actaExistente: ActaConDetalle | null = null;
  @Input() guardando = false;

  @Output() guardar = new EventEmitter<GuardarActaPayload>();

  readonly capturandoFoto = signal(false);
  readonly capturandoGps = signal(false);
  readonly errorFoto = signal<string | null>(null);
  readonly errorGps = signal<string | null>(null);
  readonly fotoPreview = signal<string | null>(null);
  readonly fotoNuevaDataUrl = signal<string | null>(null);
  readonly resultadoNitidez = signal<ResultadoNitidez | null>(null);
  readonly coordenadas = signal<CoordenadasGps | null>(null);

  form: FormGroup = this.fb.group(
    {
      votosOrganizaciones: this.fb.array([]),
      nulos: [0, [Validators.required, Validators.min(0)]],
      blancos: [0, [Validators.required, Validators.min(0)]],
      total_sufragantes: [0, [Validators.required, Validators.min(0)]],
    },
    { validators: consistenciaActaValidator() }
  );

  constructor() {
    addIcons({
      cameraOutline,
      checkmarkCircleOutline,
      locationOutline,
      saveOutline,
      warningOutline,
    });
  }

  get votosArray(): FormArray<FormGroup> {
    return this.form.get('votosOrganizaciones') as FormArray<FormGroup>;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['orgs'] || changes['actaExistente']) {
      this.reconstruirFormulario();
    }
  }

  obtenerResumenCuadre() {
    const votosRaw = this.votosArray.controls.map((c) => c.get('votos')?.value);
    return evaluarCuadreActa(
      votosRaw,
      this.form.get('nulos')?.value,
      this.form.get('blancos')?.value,
      this.form.get('total_sufragantes')?.value
    );
  }

  async capturarFoto(): Promise<void> {
    this.errorFoto.set(null);
    this.capturandoFoto.set(true);
    try {
      const dataUrl = await this.camera.capturarFotoActa();
      const nitidez = await this.imageQuality.evaluarNitidez(dataUrl);
      this.resultadoNitidez.set(nitidez);
      this.fotoPreview.set(dataUrl);

      if (nitidez.esNitida) {
        this.fotoNuevaDataUrl.set(dataUrl);
        if (!this.coordenadas()) {
          void this.capturarGps();
        }
      } else {
        this.fotoNuevaDataUrl.set(null);
      }
    } catch (err) {
      this.errorFoto.set(err instanceof Error ? err.message : 'Error al capturar fotografia.');
    } finally {
      this.capturandoFoto.set(false);
    }
  }

  async capturarGps(): Promise<void> {
    this.errorGps.set(null);
    this.capturandoGps.set(true);
    try {
      const coords = await this.geolocation.obtenerUbicacionActual();
      this.coordenadas.set(coords);
    } catch (err) {
      this.errorGps.set(err instanceof Error ? err.message : 'Error al obtener ubicacion GPS.');
    } finally {
      this.capturandoGps.set(false);
    }
  }

  puedeGuardar(): boolean {
    if (this.guardando || this.form.invalid) {
      return false;
    }
    const gps = this.coordenadas();
    if (!gps) {
      return false;
    }
    const nitidez = this.resultadoNitidez();
    if (nitidez && !nitidez.esNitida) {
      return false;
    }
    const tieneFotoValida =
      Boolean(this.fotoNuevaDataUrl()) || Boolean(this.actaExistente?.foto_path);
    return tieneFotoValida;
  }

  enviar(): void {
    if (!this.puedeGuardar()) {
      this.form.markAllAsTouched();
      return;
    }

    const gps = this.coordenadas()!;
    const votos = this.votosArray.controls.map((c) => ({
      organizacion_id: String(c.get('organizacion_id')?.value),
      votos: Number(c.get('votos')?.value),
    }));

    this.guardar.emit({
      jrv_id: this.jrvId,
      recinto_id: this.recintoId,
      dignidad: this.dignidad,
      votos,
      nulos: Number(this.form.get('nulos')?.value),
      blancos: Number(this.form.get('blancos')?.value),
      total_sufragantes: Number(this.form.get('total_sufragantes')?.value),
      foto_data_url: this.fotoNuevaDataUrl() ?? undefined,
      foto_path_existente: this.actaExistente?.foto_path,
      puntaje_nitidez:
        this.resultadoNitidez()?.puntaje ?? Number(this.actaExistente?.puntaje_nitidez ?? 0),
      latitud: gps.latitud,
      longitud: gps.longitud,
      precision_gps: gps.precision,
    });
  }

  private reconstruirFormulario(): void {
    const array = this.fb.array<FormGroup>([]);
    const votosMap = new Map(
      (this.actaExistente?.votos ?? []).map((v) => [v.organizacion_id, Number(v.votos)])
    );

    for (const org of this.orgs) {
      array.push(
        this.fb.group({
          organizacion_id: [org.id],
          votos: [votosMap.get(org.id) ?? 0, [Validators.required, Validators.min(0)]],
        })
      );
    }

    this.form.setControl('votosOrganizaciones', array);
    this.form.patchValue({
      nulos: this.actaExistente?.nulos ?? 0,
      blancos: this.actaExistente?.blancos ?? 0,
      total_sufragantes: this.actaExistente?.total_sufragantes ?? 0,
    });

    this.fotoNuevaDataUrl.set(null);
    this.errorFoto.set(null);
    this.errorGps.set(null);

    if (this.actaExistente) {
      this.fotoPreview.set(this.actaExistente.foto_url ?? null);
      this.resultadoNitidez.set({
        esNitida: true,
        puntaje: Number(this.actaExistente.puntaje_nitidez),
        umbral: this.imageQuality.umbralNitidez,
      });
      this.coordenadas.set({
        latitud: Number(this.actaExistente.latitud),
        longitud: Number(this.actaExistente.longitud),
        precision:
          this.actaExistente.precision_gps !== null
            ? Number(this.actaExistente.precision_gps)
            : null,
      });
    } else {
      this.fotoPreview.set(null);
      this.resultadoNitidez.set(null);
      this.coordenadas.set(null);
    }
  }
}
