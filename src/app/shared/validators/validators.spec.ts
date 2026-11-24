import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import {
  cedulaEcuatorianaValidator,
  esCedulaEcuatorianaValida,
} from './cedula-ecuatoriana.validator';
import {
  consistenciaActaValidator,
  evaluarCuadreActa,
} from './consistencia-acta.validator';
import {
  coincidenciaPasswordValidator,
  noPasswordInicialValidator,
  PASSWORD_INICIAL,
} from './password-inicial.validator';

describe('Validadores de negocio electoral', () => {
  describe('cedulaEcuatorianaValidator', () => {
    it('acepta cedulas ecuatorianas validas', () => {
      expect(esCedulaEcuatorianaValida('1710034065')).toBe(true);
      expect(esCedulaEcuatorianaValida('1710034073')).toBe(true);

      const control = new FormControl('1710034065', [cedulaEcuatorianaValidator()]);
      expect(control.valid).toBe(true);
    });

    it('rechaza provincia fuera de rango, tercer digito invalido y verificador incorrecto', () => {
      expect(esCedulaEcuatorianaValida('2510034065')).toBe(false);
      expect(esCedulaEcuatorianaValida('1760034065')).toBe(false);
      expect(esCedulaEcuatorianaValida('1710034064')).toBe(false);
      expect(esCedulaEcuatorianaValida('17100340')).toBe(false);

      const control = new FormControl('1710034064', [cedulaEcuatorianaValidator()]);
      expect(control.errors?.['cedulaInvalida']).toBeTruthy();
    });
  });

  describe('consistenciaActaValidator', () => {
    it('valida cuadre exacto convirtiendo strings de IonInput a numero', () => {
      const evaluacion = evaluarCuadreActa(['40', '35', '25', '15', '10'], '8', '7', '140');
      expect(evaluacion.esValido).toBe(true);
      expect(evaluacion.sumaCalculada).toBe(140);
      expect(evaluacion.diferencia).toBe(0);
    });

    it('detecta descuadre de totales en FormGroup', () => {
      const form = new FormGroup(
        {
          votosOrganizaciones: new FormArray([
            new FormGroup({ votos: new FormControl('20') }),
            new FormGroup({ votos: new FormControl('30') }),
            new FormGroup({ votos: new FormControl('10') }),
            new FormGroup({ votos: new FormControl('5') }),
            new FormGroup({ votos: new FormControl('5') }),
          ]),
          nulos: new FormControl('4'),
          blancos: new FormControl('6'),
          total_sufragantes: new FormControl('90'),
        },
        { validators: consistenciaActaValidator() }
      );

      expect(form.valid).toBe(false);
      expect(form.errors?.['descuadreActa']).toEqual({
        sumaCalculada: 80,
        totalSufragantes: 90,
        diferencia: -10,
      });
    });

    it('rechaza valores negativos o decimales', () => {
      const evaluacion = evaluarCuadreActa([10, -2, 5, 0, 0], 1, 1, 15);
      expect(evaluacion.esValido).toBe(false);
      expect(evaluacion.contieneValoresInvalidos).toBe(true);
    });
  });

  describe('passwordInicialValidator', () => {
    it('impide reutilizar la contrasena inicial Ecuador2026', () => {
      const control = new FormControl(PASSWORD_INICIAL, [noPasswordInicialValidator()]);
      expect(control.errors?.['passwordInicialProhibida']).toBe(true);
    });

    it('verifica coincidencia entre nueva contrasena y confirmacion', () => {
      const form = new FormGroup(
        {
          nuevaPassword: new FormControl('NuevaClave2026!'),
          confirmarPassword: new FormControl('OtraClave2026!'),
        },
        { validators: coincidenciaPasswordValidator() }
      );
      expect(form.errors?.['passwordsNoCoinciden']).toBe(true);
    });
  });
});
