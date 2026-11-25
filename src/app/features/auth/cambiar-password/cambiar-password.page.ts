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
  templateUrl: './cambiar-password.page.html',
  styleUrls: ['./cambiar-password.page.scss'],
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
