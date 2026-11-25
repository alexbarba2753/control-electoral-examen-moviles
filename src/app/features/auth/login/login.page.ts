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
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
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
