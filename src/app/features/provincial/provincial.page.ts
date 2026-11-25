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
  templateUrl: './provincial.page.html',
  styleUrls: ['./provincial.page.scss'],
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
