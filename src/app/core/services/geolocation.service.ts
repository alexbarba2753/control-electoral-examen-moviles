import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { CoordenadasGps } from '../models/acta.model';

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  async obtenerUbicacionActual(): Promise<CoordenadasGps> {
    if (Capacitor.isNativePlatform()) {
      const permisos = await Geolocation.checkPermissions();
      if (permisos.location !== 'granted' && permisos.coarseLocation !== 'granted') {
        const solicitud = await Geolocation.requestPermissions();
        if (solicitud.location !== 'granted' && solicitud.coarseLocation !== 'granted') {
          throw new Error(
            'Permiso de ubicacion denegado. Habilite el GPS y los permisos de ubicacion para registrar el acta.'
          );
        }
      }
    }

    try {
      const posicion = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 15000,
      });

      return {
        latitud: Number(posicion.coords.latitude.toFixed(6)),
        longitud: Number(posicion.coords.longitude.toFixed(6)),
        precision:
          posicion.coords.accuracy !== undefined && posicion.coords.accuracy !== null
            ? Number(posicion.coords.accuracy.toFixed(1))
            : null,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/denied|permission/i.test(msg)) {
        throw new Error('Permiso de geolocalizacion denegado en el dispositivo o navegador.');
      }
      if (/timeout/i.test(msg)) {
        throw new Error('Tiempo de espera agotado al obtener senal GPS. Verifique que la ubicacion este encendida.');
      }
      throw new Error(`No se pudo obtener la ubicacion GPS: ${msg}`);
    }
  }
}
