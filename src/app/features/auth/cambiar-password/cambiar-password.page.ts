import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
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
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { lockClosedOutline, logOutOutline } from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import {
  coincidenciaPasswordValidator,
  noPasswordInicialValidator,
} from '../../../shared/validators/password-inicial.validator';

@Component({
  selector: 'app-cambiar-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonItem,
    IonInput,
    IonNote,
    IonButton,
    IonSpinner,
    IonIcon,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Cambio de contrasena</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="salir()">
            <ion-icon slot="icon-only" name="log-out-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="panel-wrap">
        <ion-card>
          <ion-card-header>
            <ion-card-title>Actualice su contrasena</ion-card-title>
            <ion-card-subtitle>
              Por seguridad debe definir una nueva clave personal distinta a la contrasena inicial.
            </ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <form [formGroup]="form" (ngSubmit)="actualizar()">
              <ion-item lines="full">
                <ion-input
                  label="Nueva contrasena"
                  labelPlacement="stacked"
                  type="password"
                  placeholder="Minimo 8 caracteres"
                  formControlName="nuevaPassword"
                ></ion-input>
              </ion-item>
              @if (form.get('nuevaPassword')?.touched && form.get('nuevaPassword')?.errors) {
                <ion-note color="danger" class="campo-error">
                  @if (form.get('nuevaPassword')?.errors?.['passwordInicialProhibida']) {
                    No puede reutilizar la contrasena inicial Ecuador2026.
                  } @else if (form.get('nuevaPassword')?.errors?.['minlength']) {
                    Debe tener al menos 8 caracteres.
                  } @else {
                    Ingrese una nueva contrasena.
                  }
                </ion-note>
              }

              <ion-item lines="full" class="ion-margin-top">
                <ion-input
                  label="Confirmar contrasena"
                  labelPlacement="stacked"
                  type="password"
                  placeholder="Repita la nueva contrasena"
                  formControlName="confirmarPassword"
                ></ion-input>
              </ion-item>
              @if (form.touched && form.errors?.['passwordsNoCoinciden']) {
                <ion-note color="danger" class="campo-error">
                  Las contrasenas no coinciden.
                </ion-note>
              }

              @if (errorMensaje()) {
                <div class="error-banner">{{ errorMensaje() }}</div>
              }

              <ion-button
                type="submit"
                expand="block"
                class="ion-margin-top"
                [disabled]="guardando() || form.invalid"
              >
                @if (guardando()) {
                  <ion-spinner name="crescent" slot="start"></ion-spinner>
                  Guardando...
                } @else {
                  <ion-icon slot="start" name="lock-closed-outline"></ion-icon>
                  Guardar nueva contrasena
                }
              </ion-button>
            </form>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .panel-wrap {
        max-width: 460px;
        margin: 1.5rem auto;
      }
      .campo-error {
        display: block;
        padding: 0.3rem 0.75rem 0;
        font-size: 0.8rem;
      }
      .error-banner {
        margin-top: 1rem;
        padding: 0.75rem;
        border-radius: 8px;
        background: rgba(var(--ion-color-danger-rgb), 0.12);
        color: var(--ion-color-danger);
        font-size: 0.88rem;
      }
    `,
  ],
})
export class CambiarPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastCtrl = inject(ToastController);

  readonly guardando = signal(false);
  readonly errorMensaje = signal<string | null>(null);

  readonly form = this.fb.group(
    {
      nuevaPassword: [
        '',
        [Validators.required, Validators.minLength(8), noPasswordInicialValidator()],
      ],
      confirmarPassword: ['', [Validators.required]],
    },
    { validators: coincidenciaPasswordValidator() }
  );

  constructor() {
    addIcons({ lockClosedOutline, logOutOutline });
  }

  async actualizar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMensaje.set(null);
    this.guardando.set(true);

    try {
      await this.auth.cambiarPassword(String(this.form.value.nuevaPassword ?? ''));
      const toast = await this.toastCtrl.create({
        message: 'Contrasena actualizada correctamente.',
        duration: 2500,
        color: 'success',
      });
      await toast.present();

      const usuario = this.auth.usuario();
      if (usuario) {
        await this.router.navigateByUrl(this.auth.rutaInicioPorRol(usuario.rol), {
          replaceUrl: true,
        });
      } else {
        await this.router.navigateByUrl('/auth/login', { replaceUrl: true });
      }
    } catch (err) {
      this.errorMensaje.set(
        err instanceof Error ? err.message : 'No se pudo cambiar la contrasena.'
      );
    } finally {
      this.guardando.set(false);
    }
  }

  async salir(): Promise<void> {
    await this.auth.cerrarSesion();
  }
}
