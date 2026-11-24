import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonBackButton,
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
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { mailOutline } from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-recuperar-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
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
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/auth/login"></ion-back-button>
        </ion-buttons>
        <ion-title>Recuperar contrasena</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="panel-wrap">
        <ion-card>
          <ion-card-header>
            <ion-card-title>Restablecer acceso</ion-card-title>
            <ion-card-subtitle>
              Ingrese su cedula o correo registrado para recibir el enlace de recuperacion.
            </ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <form [formGroup]="form" (ngSubmit)="solicitar()">
              <ion-item lines="full">
                <ion-input
                  label="Cedula o correo electronico"
                  labelPlacement="stacked"
                  type="text"
                  placeholder="Ej. 1710034065 o usuario@correo.com"
                  formControlName="identificador"
                ></ion-input>
              </ion-item>
              @if (form.get('identificador')?.touched && form.get('identificador')?.errors) {
                <ion-note color="danger" class="campo-error">
                  Ingrese su cedula o correo electronico.
                </ion-note>
              }

              @if (errorMensaje()) {
                <div class="alerta error">{{ errorMensaje() }}</div>
              }

              @if (exitoMensaje()) {
                <div class="alerta exito">{{ exitoMensaje() }}</div>
              }

              <ion-button
                type="submit"
                expand="block"
                class="ion-margin-top"
                [disabled]="enviando() || form.invalid"
              >
                @if (enviando()) {
                  <ion-spinner name="crescent" slot="start"></ion-spinner>
                  Enviando...
                } @else {
                  <ion-icon slot="start" name="mail-outline"></ion-icon>
                  Enviar enlace de recuperacion
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
      .alerta {
        margin-top: 1rem;
        padding: 0.75rem;
        border-radius: 8px;
        font-size: 0.88rem;
      }
      .alerta.error {
        background: rgba(var(--ion-color-danger-rgb), 0.12);
        color: var(--ion-color-danger);
      }
      .alerta.exito {
        background: rgba(var(--ion-color-success-rgb), 0.14);
        color: var(--ion-color-success-shade);
      }
    `,
  ],
})
export class RecuperarPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly enviando = signal(false);
  readonly errorMensaje = signal<string | null>(null);
  readonly exitoMensaje = signal<string | null>(null);

  readonly form = this.fb.group({
    identificador: ['', [Validators.required]],
  });

  constructor() {
    addIcons({ mailOutline });
  }

  async solicitar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMensaje.set(null);
    this.exitoMensaje.set(null);
    this.enviando.set(true);

    try {
      const msg = await this.auth.solicitarRecuperacion(
        String(this.form.value.identificador ?? '')
      );
      this.exitoMensaje.set(msg);
      this.form.reset();
    } catch (err) {
      this.errorMensaje.set(
        err instanceof Error ? err.message : 'No se pudo enviar el correo de recuperacion.'
      );
    } finally {
      this.enviando.set(false);
    }
  }
}
