import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { ActaConDetalle, GuardarActaPayload } from '../../../core/models/acta.model';
import { JrvConDetalles } from '../../../core/models/jrv.model';
import { Dignidad, OrganizacionConCandidatura } from '../../../core/models/organizacion.model';
import { ActaService } from '../../../core/services/acta.service';
import { AuthService } from '../../../core/services/auth.service';
import { JrvService } from '../../../core/services/jrv.service';
import { ActaFormComponent } from '../../../shared/components/acta-form.component';
import { EstadoVistaComponent } from '../../../shared/components/estado-vista.component';

@Component({
  selector: 'app-registrar-acta',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    EstadoVistaComponent,
    ActaFormComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button [defaultHref]="rutaRetorno()"></ion-back-button>
        </ion-buttons>
        <ion-title>
          @if (jrv(); as mesa) {
            JRV #{{ mesa.numero }} · {{ dignidad() === 'alcalde' ? 'Alcalde' : 'Prefecto' }}
          } @else {
            Registro de acta
          }
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="contenedor">
        <app-estado-vista
          [cargando]="cargando()"
          [error]="error()"
          [vacio]="false"
          (reintentar)="cargarDatos()"
        ></app-estado-vista>

        @if (!cargando() && !error() && jrv(); as mesa) {
          <app-acta-form
            [jrvId]="mesa.id"
            [recintoId]="mesa.recinto_id"
            [dignidad]="dignidad()"
            [orgs]="organizaciones()"
            [actaExistente]="actaExistente()"
            [guardando]="guardando()"
            (guardar)="guardarActa($event)"
          ></app-acta-form>
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
    `,
  ],
})
export class RegistrarActaPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly jrvService = inject(JrvService);
  private readonly actaService = inject(ActaService);
  private readonly toastCtrl = inject(ToastController);

  readonly jrvId = signal<string>('');
  readonly dignidad = signal<Dignidad>('alcalde');
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  readonly jrv = signal<JrvConDetalles | null>(null);
  readonly organizaciones = signal<OrganizacionConCandidatura[]>([]);
  readonly actaExistente = signal<ActaConDetalle | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('jrvId') ?? '';
    const digParam = this.route.snapshot.paramMap.get('dignidad');
    this.jrvId.set(id);
    this.dignidad.set(digParam === 'prefecto' ? 'prefecto' : 'alcalde');
    void this.cargarDatos();
  }

  rutaRetorno(): string {
    return this.auth.rol() === 'recinto' ? '/recinto' : '/veedor';
  }

  async cargarDatos(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);

    try {
      const usuario = this.auth.usuario();
      const mesas =
        usuario?.rol === 'recinto' && usuario.recinto_id
          ? await this.jrvService.listarMesasRecinto(usuario.recinto_id)
          : await this.jrvService.listarMisMesasAsignadas();

      const mesa = mesas.find((m) => m.id === this.jrvId()) ?? null;
      if (!mesa) {
        throw new Error('No tiene autorizacion para acceder a esta mesa o no existe.');
      }

      const [orgs, acta] = await Promise.all([
        this.actaService.listarOrganizacionesPorDignidad(this.dignidad()),
        this.actaService.obtenerActa(mesa.id, this.dignidad()),
      ]);

      this.jrv.set(mesa);
      this.organizaciones.set(orgs);
      this.actaExistente.set(acta);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al cargar el formulario de acta.');
    } finally {
      this.cargando.set(false);
    }
  }

  async guardarActa(payload: GuardarActaPayload): Promise<void> {
    this.guardando.set(true);
    try {
      await this.actaService.guardarActa(payload);
      const toast = await this.toastCtrl.create({
        message: 'Acta guardada y validada correctamente.',
        duration: 2800,
        color: 'success',
      });
      await toast.present();
      await this.router.navigateByUrl(this.rutaRetorno(), { replaceUrl: true });
    } catch (err) {
      const toast = await this.toastCtrl.create({
        message: err instanceof Error ? err.message : 'No se pudo guardar el acta.',
        duration: 3500,
        color: 'danger',
      });
      await toast.present();
    } finally {
      this.guardando.set(false);
    }
  }
}
