import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class CameraService {
  async capturarFotoActa(): Promise<string> {
    if (Capacitor.isNativePlatform()) {
      const permisos = await Camera.checkPermissions();
      if (permisos.camera !== 'granted') {
        const solicitud = await Camera.requestPermissions({ permissions: ['camera'] });
        if (solicitud.camera !== 'granted') {
          throw new Error(
            'Permiso de camara denegado. Habilite el acceso a la camara en la configuracion del dispositivo.'
          );
        }
      }
    }

    try {
      const foto = await Camera.getPhoto({
        quality: 80,
        width: 1280,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: Capacitor.isNativePlatform() ? CameraSource.Camera : CameraSource.Prompt,
        promptLabelHeader: 'Fotografia del acta',
        promptLabelPhoto: 'Elegir archivo',
        promptLabelPicture: 'Tomar foto',
        promptLabelCancel: 'Cancelar',
      });

      if (!foto.dataUrl) {
        throw new Error('No se pudo obtener la imagen capturada.');
      }

      return foto.dataUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/cancel/i.test(msg)) {
        throw new Error('Captura de fotografia cancelada por el usuario.');
      }
      if (/denied|permission/i.test(msg)) {
        throw new Error('No se otorgaron permisos para usar la camara.');
      }
      throw new Error(`Error al acceder a la camara: ${msg}`);
    }
  }
}
