import { Injectable } from '@angular/core';
import { ResultadoNitidez } from '../models/acta.model';

@Injectable({ providedIn: 'root' })
export class ImageQualityService {
  readonly umbralNitidez = 80;

  async evaluarNitidez(dataUrl: string, umbral = this.umbralNitidez): Promise<ResultadoNitidez> {
    const imagen = await this.cargarImagen(dataUrl);

    const maxAncho = 500;
    const escala = imagen.width > maxAncho ? maxAncho / imagen.width : 1;
    const ancho = Math.max(3, Math.round(imagen.width * escala));
    const alto = Math.max(3, Math.round(imagen.height * escala));

    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No se pudo inicializar el analizador de imagen en el dispositivo.');
    }

    ctx.drawImage(imagen, 0, 0, ancho, alto);
    const { data } = ctx.getImageData(0, 0, ancho, alto);

    const gris = new Float32Array(ancho * alto);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      gris[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    const totalInternos = (ancho - 2) * (alto - 2);
    const laplaciano = new Float32Array(totalInternos);
    let suma = 0;
    let idx = 0;

    for (let y = 1; y < alto - 1; y++) {
      const fila = y * ancho;
      for (let x = 1; x < ancho - 1; x++) {
        const valor =
          gris[fila - ancho + x] +
          gris[fila + ancho + x] +
          gris[fila + x - 1] +
          gris[fila + x + 1] -
          4 * gris[fila + x];
        laplaciano[idx++] = valor;
        suma += valor;
      }
    }

    const media = suma / totalInternos;
    let sumaCuadrados = 0;
    for (let i = 0; i < totalInternos; i++) {
      const diff = laplaciano[i] - media;
      sumaCuadrados += diff * diff;
    }

    const varianza = sumaCuadrados / totalInternos;
    const puntaje = Math.round(varianza * 100) / 100;

    return {
      esNitida: puntaje >= umbral,
      puntaje,
      umbral,
    };
  }

  dataUrlABlob(dataUrl: string): Blob {
    const [cabecera, base64] = dataUrl.split(',');
    const mimeMatch = cabecera.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binario = atob(base64);
    const arreglo = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) {
      arreglo[i] = binario.charCodeAt(i);
    }
    return new Blob([arreglo], { type: mime });
  }

  private cargarImagen(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
      img.src = dataUrl;
    });
  }
}
