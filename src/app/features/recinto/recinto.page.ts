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
  templateUrl: './recinto.page.html',
  styleUrls: ['./recinto.page.scss'],
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
