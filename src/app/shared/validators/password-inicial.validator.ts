import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const PASSWORD_INICIAL = 'Ecuador2026';

export function noPasswordInicialValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = String(control.value ?? '');
    if (!valor) {
      return null;
    }
    if (valor === PASSWORD_INICIAL) {
      return { passwordInicialProhibida: true };
    }
    return null;
  };
}

export function coincidenciaPasswordValidator(
  campoPassword = 'nuevaPassword',
  campoConfirmacion = 'confirmarPassword'
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const pass = String(group.get(campoPassword)?.value ?? '');
    const confirm = String(group.get(campoConfirmacion)?.value ?? '');
    if (!pass || !confirm) {
      return null;
    }
    return pass === confirm ? null : { passwordsNoCoinciden: true };
  };
}
