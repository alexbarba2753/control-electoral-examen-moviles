import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonButton, IonCard, IonCardContent, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline, documentOutline, refreshOutline } from 'ionicons/icons';

@Component({
  selector: 'app-estado-vista',
  standalone: true,
  imports: [CommonModule, IonSpinner, IonCard, IonCardContent, IonButton, IonIcon],
  template: `
    @if (cargando) {
      <div class="estado-box">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p>{{ textoCarga }}</p>
      </div>
    } @else if (error) {
      <ion-card color="danger" class="estado-card">
        <ion-card-content>
          <div class="estado-row">
            <ion-icon name="alert-circle-outline"></ion-icon>
            <div>
              <strong>Error</strong>
              <p>{{ error }}</p>
            </div>
          </div>
          @if (mostrarReintentar) {
            <ion-button fill="outline" color="light" size="small" (click)="reintentar.emit()">
              <ion-icon slot="start" name="refresh-outline"></ion-icon>
              Reintentar
            </ion-button>
          }
        </ion-card-content>
      </ion-card>
    } @else if (vacio) {
      <div class="estado-box">
        <ion-icon name="document-outline" class="icono-vacio"></ion-icon>
        <p>{{ textoVacio }}</p>
      </div>
    }
  `,
  styles: [
    `
      .estado-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem 1rem;
        text-align: center;
        color: var(--ion-color-medium);
        gap: 0.5rem;
      }
      .estado-card {
        margin: 1rem;
      }
      .estado-row {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
      }
      .estado-row ion-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
      }
      .icono-vacio {
        font-size: 2.5rem;
      }
    `,
  ],
})
export class EstadoVistaComponent {
  @Input() cargando = false;
  @Input() error: string | null = null;
  @Input() vacio = false;
  @Input() textoCarga = 'Cargando informacion...';
  @Input() textoVacio = 'No existen registros disponibles.';
  @Input() mostrarReintentar = true;
  @Output() reintentar = new EventEmitter<void>();

  constructor() {
    addIcons({ alertCircleOutline, documentOutline, refreshOutline });
  }
}
