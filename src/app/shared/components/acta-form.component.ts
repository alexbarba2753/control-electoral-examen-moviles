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
  templateUrl: './acta-form.component.html',
  styleUrls: ['./acta-form.component.scss'],
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
