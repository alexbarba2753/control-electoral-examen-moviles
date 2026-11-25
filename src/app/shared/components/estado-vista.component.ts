import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonButton, IonCard, IonCardContent, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline, documentOutline, refreshOutline } from 'ionicons/icons';

@Component({
  selector: 'app-estado-vista',
  standalone: true,
  imports: [CommonModule, IonSpinner, IonCard, IonCardContent, IonButton, IonIcon],
  templateUrl: './estado-vista.component.html',
  styleUrls: ['./estado-vista.component.scss'],
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
