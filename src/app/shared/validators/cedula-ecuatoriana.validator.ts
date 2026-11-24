import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function esCedulaEcuatorianaValida(valor: string): boolean {
  const cedula = String(valor ?? '').trim();
  if (!/^[0-9]{10}$/.test(cedula)) {
    return false;
  }

  const provincia = Number(cedula.substring(0, 2));
  if (provincia < 1 || provincia > 24) {
    return false;
  }

  const tercerDigito = Number(cedula[2]);
  if (tercerDigito >= 6) {
    return false;
  }

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;

  for (let i = 0; i < 9; i++) {
    let producto = Number(cedula[i]) * coeficientes[i];
    if (producto >= 10) {
      producto -= 9;
    }
    suma += producto;
  }

  const residuo = suma % 10;
  const digitoVerificador = residuo === 0 ? 0 : 10 - residuo;
  return digitoVerificador === Number(cedula[9]);
}

export function cedulaEcuatorianaValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = String(control.value ?? '').trim();
    if (!raw) {
      return null;
    }
    return esCedulaEcuatorianaValida(raw)
      ? null
      : { cedulaInvalida: 'La cedula ecuatoriana no cumple el algoritmo de verificacion' };
  };
}
