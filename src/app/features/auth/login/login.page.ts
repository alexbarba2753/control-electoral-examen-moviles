import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonNote,
  IonSpinner,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { keyOutline, logInOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import { cedulaEcuatorianaValidator } from '../../../shared/validators/cedula-ecuatoriana.validator';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
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
    <ion-content class="ion-padding login-bg">
      <div class="login-wrap">
        <div class="brand-header">
          <div class="brand-icon">
            <ion-icon name="shield-checkmark-outline"></ion-icon>
          </div>
          <h1>Control Electoral</h1>
          <p>Pichincha · Registro y seguimiento de escrutinio</p>
        </div>

        <ion-card>
          <ion-card-header>
            <ion-card-title>Iniciar sesion</ion-card-title>
            <ion-card-subtitle>Ingrese con su numero de cedula registrado</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <form [formGroup]="form" (ngSubmit)="ingresar()">
              <ion-item lines="full">
                <ion-input
                  label="Cedula"
                  labelPlacement="stacked"
                  type="text"
                  inputmode="numeric"
                  maxlength="10"
                  placeholder="Ej. 1710034065"
                  formControlName="cedula"
                ></ion-input>
              </ion-item>
              @if (form.get('cedula')?.touched && form.get('cedula')?.errors) {
                <ion-note color="danger" class="campo-error">
                  @if (form.get('cedula')?.errors?.['required']) {
                    La cedula es obligatoria.
                  } @else {
                    Ingrese una cedula ecuatoriana valida de 10 digitos.
                  }
                </ion-note>
              }

              <ion-item lines="full" class="ion-margin-top">
                <ion-input
                  label="Contrasena"
                  labelPlacement="stacked"
                  type="password"
                  placeholder="Ingrese su contrasena"
                  formControlName="password"
                ></ion-input>
              </ion-item>
              @if (form.get('password')?.touched && form.get('password')?.errors) {
                <ion-note color="danger" class="campo-error">
                  Ingrese su contrasena.
                </ion-note>
              }

              @if (errorMensaje()) {
                <div class="error-banner">{{ errorMensaje() }}</div>
              }

              <ion-button
                type="submit"
                expand="block"
                class="ion-margin-top"
                [disabled]="cargando() || form.invalid"
              >
                @if (cargando()) {
                  <ion-spinner name="crescent" slot="start"></ion-spinner>
                  Verificando...
                } @else {
                  <ion-icon slot="start" name="log-in-outline"></ion-icon>
                  Ingresar
                }
              </ion-button>

              <ion-button
                type="button"
                fill="clear"
                expand="block"
                size="small"
                routerLink="/auth/recuperar-password"
                class="ion-margin-top"
              >
                <ion-icon slot="start" name="key-outline"></ion-icon>
                Olvide mi contrasena
              </ion-button>
            </form>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .login-bg {
        --background: #f1f5f9;
      }
      .login-wrap {
        max-width: 440px;
        margin: 2.5rem auto 1rem;
      }
      .brand-header {
        text-align: center;
        margin-bottom: 1.5rem;
      }
      .brand-icon {
        width: 56px;
        height: 56px;
        border-radius: 14px;
        background: var(--ion-color-primary);
        color: #ffffff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 1.8rem;
        margin-bottom: 0.75rem;
      }
      .brand-header h1 {
        margin: 0;
        font-size: 1.45rem;
        font-weight: 700;
        color: #0f172a;
      }
      .brand-header p {
        margin: 0.25rem 0 0;
        color: #475569;
        font-size: 0.9rem;
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
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly cargando = signal(false);
  readonly errorMensaje = signal<string | null>(null);

  readonly form = this.fb.group({
    cedula: ['', [Validators.required, cedulaEcuatorianaValidator()]],
    password: ['', [Validators.required]],
  });

  constructor() {
    addIcons({ shieldCheckmarkOutline, logInOutline, keyOutline });
  }

  async ingresar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMensaje.set(null);
    this.cargando.set(true);

    try {
      const cedula = String(this.form.value.cedula ?? '').trim();
      const password = String(this.form.value.password ?? '');
      const usuario = await this.auth.iniciarSesionConCedula(cedula, password);

      if (usuario.debe_cambiar_password) {
        await this.router.navigateByUrl('/auth/cambiar-password', { replaceUrl: true });
      } else {
        await this.router.navigateByUrl(this.auth.rutaInicioPorRol(usuario.rol), {
          replaceUrl: true,
        });
      }
    } catch (err) {
      this.errorMensaje.set(
        err instanceof Error ? err.message : 'No se pudo iniciar sesion.'
      );
    } finally {
      this.cargando.set(false);
    }
  }
}
