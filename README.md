# Control Electoral — Pichincha

Aplicación móvil desarrollada con **Ionic Angular (Standalone)**, **Capacitor** y **Supabase** para el registro, validación y seguimiento del escrutinio electoral de juntas receptoras del voto (JRV) en la provincia de **Pichincha (cantón Quito)**.

## Requisitos del entorno

- Node.js 24+ (`v24.15.0`)
- npm 11+ (`11.12.1`)
- Ionic CLI 7+ (`7.2.1`)
- Android Studio (para generar el APK desde `android/`)

## Instalación y ejecución local

1. Instalar dependencias:

```bash
npm install
```

2. Crear los archivos de entorno locales a partir del ejemplo (`src/environments/environment.example.ts`):

```bash
cp src/environments/environment.example.ts src/environments/environment.ts
cp src/environments/environment.example.ts src/environments/environment.prod.ts
```

3. Completar `supabaseUrl` y `supabaseAnonKey` en ambos archivos (están ignorados por `.gitignore` para no subir credenciales de entorno al repositorio) y ejecutar:

```bash
ionic serve
```

Compilación de producción y sincronización con Android:

```bash
npm run build
npx cap sync android
```

Para generar el APK instalable, abrir la carpeta `android/` en Android Studio y ejecutar `Build > Build Bundle(s) / APK(s) > Build APK(s)`.

El APK compilado listo para instalar en Android se encuentra disponible en [`apk/control-electoral.apk`](apk/control-electoral.apk).

## Configuración sin secretos

La aplicación cliente utiliza únicamente la URL pública del proyecto y la clave pública `anon` de Supabase, siguiendo `ADR-002`. Las claves administrativas (`service_role`) nunca se incluyen en el código Ionic y operan únicamente dentro de las Edge Functions del servidor.

Archivo de referencia en [src/environments/environment.example.ts](src/environments/environment.example.ts):

```ts
export const environment = {
  production: false,
  supabaseUrl: 'https://tu-proyecto.supabase.co',
  supabaseAnonKey: 'tu-clave-publica-anon',
};
```

Los scripts SQL y funciones del servidor están versionados en:
- `supabase/migrations/001_esquema_electoral.sql` — Tablas relacionales, índices y triggers de generación automática de JRV y actualización de estado.
- `supabase/migrations/002_politicas_rls_y_storage.sql` — Políticas Row Level Security por rol y pertenencia y reglas del bucket privado `actas-fotos`.
- `supabase/migrations/003_datos_iniciales_r1.sql` — Precarga de 6 recintos de Quito (Pichincha), 5 organizaciones políticas y candidaturas de Alcaldía y Prefectura.
- `supabase/functions/login-cedula/index.ts` — Inicio de sesión usando cédula y solicitud de recuperación por correo sin exponer correos a usuarios anónimos.
- `supabase/functions/crear-usuario/index.ts` — Creación jerárquica de cuentas (`provincial -> recinto`, `recinto -> veedor`) con clave inicial `Ecuador2026` sin cerrar la sesión activa del coordinador.

## Arquitectura y ADR

La aplicación sigue la línea base arquitectónica acordada por el Grupo 3 en `docs/adr/`:

- `docs/adr/ADR-001-framework-ionic-angular.md` — Ionic Angular (Standalone) + Capacitor.
- `docs/adr/ADR-002-backend-supabase.md` — Supabase (PostgreSQL, Auth, RLS, Storage).
- `docs/adr/ADR-003-arquitectura-capas-dominios.md` — Separación en `core/`, `shared/` y `features/`.
- `docs/adr/ADR-004-formularios-reactivos-validadores.md` — Reactive Forms y validadores puros en `src/app/shared/validators/`.
- `docs/adr/ADR-005-camara-gps-nitidez-capacitor.md` — `@capacitor/camera`, `@capacitor/geolocation` y análisis local de nitidez en `<canvas>` (varianza del Laplaciano).
- `docs/adr/ADR-006-soporte-offline-opcional.md` — Priorización Online-First (R1–R9) con manejo controlado de errores de conectividad.

Estructura de carpetas bajo `src/app/`:

- `core/models/`: Interfaces del dominio (`Usuario`, `Recinto`, `Jrv`, `Organizacion`, `Acta`, `Dashboard`).
- `core/guards/`: `authGuard`, `passwordChangeGuard` (bloqueo obligatorio de primer acceso) y `roleGuard`.
- `core/services/`: Servicios de acceso a datos (`supabase`, `auth`, `recinto`, `usuario`, `jrv`, `acta`, `dashboard`) y hardware (`camera`, `geolocation`, `image-quality`). Ninguna página (`*.page.ts`) importa `@supabase/supabase-js`.
- `shared/validators/`: Validadores puros (`cedula-ecuatoriana`, `consistencia-acta`, `password-inicial`).
- `shared/components/`: `estado-vista` (carga, error, vacío) y `acta-form` (formulario reactivo compartido entre veedor y coordinador de recinto).
- `features/`: `auth/`, `provincial/`, `recinto/` y `veedor/`.

## Modelo de datos y seguridad (R8)

- `recintos` (1) -> (N) `jrv`: al insertar un recinto, un trigger genera automáticamente las mesas `1..cantidad_jrv`.
- `usuarios`: perfil vinculado a `auth.users` con `cedula` única, `rol` (`provincial`, `recinto`, `veedor`), `recinto_id` e índice único parcial que garantiza un solo coordinador por recinto.
- `organizaciones` y `candidaturas`: 5 organizaciones políticas con 5 candidaturas para `alcalde` y 5 para `prefecto`.
- `actas` y `acta_votos`: registro por `(jrv_id, dignidad)` con votos por organización, nulos, blancos, total de sufragantes, ruta de foto en Storage privado, puntaje de nitidez y coordenadas GPS (`latitud`, `longitud`, `precision_gps`).
- **Políticas RLS:** todas las tablas tienen Row Level Security activo. Un veedor únicamente puede leer sus JRV asignadas (`veedor_id = auth.uid()`) y únicamente puede insertar/actualizar actas y fotografías de sus propias mesas; cualquier intento sobre una mesa ajena es rechazado por PostgreSQL con código `42501`.

## Pruebas y verificación

- **Validaciones de formularios (R2, R3, R6):** comprobación manual de cédula ecuatoriana válida e inválida, rechazo de reutilización de `Ecuador2026` y bloqueo del guardado cuando la suma de votos, nulos y blancos no coincide con el total de sufragantes.
- **Seguridad RLS en backend (R8):** verificación iniciando sesión con Veedor 1 (`1710034081`) y Veedor 2 (`1710034099`) comprobando que cada uno visualiza únicamente su JRV asignada y que PostgreSQL rechaza con código `42501` cualquier intento de escritura en una mesa ajena.
- **Cámara, nitidez y GPS (R7):** captura desde cámara, rechazo de fotografías borrosas bajo el umbral calibrado del Laplaciano y registro de coordenadas `latitud`, `longitud` y `precision_gps`.

## Credenciales de demostración (datos ficticios de prueba)

| Rol | Cédula | Contraseña | Alcance |
| :--- | :--- | :--- | :--- |
| Coordinador Provincial | `1710034065` | `Provincial2026!` | Todos los recintos de Pichincha (Quito) |
| Coordinador de Recinto | `1710034073` | `Recinto2026!` | Colegio Nacional Benalcázar |
| Veedor 1 | `1710034081` | `Veedor12026!` | JRV #1 de Colegio Nacional Benalcázar |
| Veedor 2 | `1710034099` | `Veedor22026!` | JRV #2 de Colegio Nacional Benalcázar |

*(Las cuentas nuevas creadas desde la aplicación por un coordinador inician con la clave `Ecuador2026` y obligan a cambiarla en el primer acceso).*

## Uso de herramientas de inteligencia artificial

- **Herramientas utilizadas:** Gemini y Microsoft Copilot como apoyo en análisis de alternativas arquitectónicas, redacción de consultas SQL/RLS, estructura de validadores en Angular Reactive Forms y depuración de compilación.
- **Ejemplos de consultas realizadas:**
  1. Contraste entre Firebase, Supabase y Appwrite considerando creación jerárquica de usuarios sin exponer claves administrativas y reportes consolidados relacionales.
  2. Diseño de políticas Row Level Security en PostgreSQL evitando recursión sobre la tabla `usuarios` y asegurando bloqueo de lectura/escritura entre veedores.
  3. Implementación de detección local de nitidez en cliente usando HTML5 `<canvas>` y varianza del operador Laplaciano sin librerías externas.
- **Qué se aceptó, qué se descartó y cómo se validó:**
  - Se aceptó el uso de Edge Functions en Supabase para el inicio de sesión por cédula y la creación de usuarios con `service_role` exclusivamente en servidor.
  - Se descartó el uso de librerías pesadas de estado global (NgRx) y de análisis de imágenes (OpenCV.js) para mantener el proyecto liviano y manejable en el plazo del examen.
  - Se corrigieron incompatibilidades detectadas al compilar con Ionic 9 / Angular 22 (importaciones standalone directas desde `@ionic/angular` y tipado estricto de promesas en `AuthService`).
  - Todo el comportamiento se validó ejecutando `npm run build`, sincronización con Android (`npx cap sync android`) y pruebas funcionales de los tres roles y aislamiento RLS en Supabase.
