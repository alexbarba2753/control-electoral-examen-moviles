import { AbstractControl, FormArray, ValidationErrors, ValidatorFn } from '@angular/forms';

export interface EvaluacionCuadreActa {
  esValido: boolean;
  sumaVotosValidos: number;
  sumaCalculada: number;
  totalSufragantes: number;
  diferencia: number;
  contieneValoresInvalidos: boolean;
}

function convertirEnteroNoNegativo(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') {
    return null;
  }
  const numero = Number(valor);
  if (!Number.isFinite(numero) || !Number.isInteger(numero) || numero < 0) {
    return null;
  }
  return numero;
}

export function evaluarCuadreActa(
  votosOrganizaciones: unknown[],
  nulosRaw: unknown,
  blancosRaw: unknown,
  totalSufragantesRaw: unknown
): EvaluacionCuadreActa {
  const nulos = convertirEnteroNoNegativo(nulosRaw);
  const blancos = convertirEnteroNoNegativo(blancosRaw);
  const totalSufragantes = convertirEnteroNoNegativo(totalSufragantesRaw);

  let sumaVotosValidos = 0;
  let contieneValoresInvalidos = nulos === null || blancos === null || totalSufragantes === null;

  for (const voto of votosOrganizaciones) {
    const parsed = convertirEnteroNoNegativo(voto);
    if (parsed === null) {
      contieneValoresInvalidos = true;
    } else {
      sumaVotosValidos += parsed;
    }
  }

  const sumaCalculada = sumaVotosValidos + (nulos ?? 0) + (blancos ?? 0);
  const totalSeguro = totalSufragantes ?? 0;
  const diferencia = sumaCalculada - totalSeguro;

  return {
    esValido: !contieneValoresInvalidos && diferencia === 0,
    sumaVotosValidos,
    sumaCalculada,
    totalSufragantes: totalSeguro,
    diferencia,
    contieneValoresInvalidos,
  };
}

export function consistenciaActaValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const votosArray = group.get('votosOrganizaciones') as FormArray | null;
    const votosRaw = votosArray
      ? votosArray.controls.map((c) => c.get('votos')?.value)
      : [];

    const resultado = evaluarCuadreActa(
      votosRaw,
      group.get('nulos')?.value,
      group.get('blancos')?.value,
      group.get('total_sufragantes')?.value
    );

    if (resultado.contieneValoresInvalidos) {
      return { valoresNumericosInvalidos: true };
    }

    if (!resultado.esValido) {
      return {
        descuadreActa: {
          sumaCalculada: resultado.sumaCalculada,
          totalSufragantes: resultado.totalSufragantes,
          diferencia: resultado.diferencia,
        },
      };
    }

    return null;
  };
}
