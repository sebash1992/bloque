import { Component, inject } from '@angular/core';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { home, barbell, statsChart, people } from 'ionicons/icons';
import { AuthService } from '../data/auth.service';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home">
          <ion-icon name="home"></ion-icon>
          <ion-label>Inicio</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="routines">
          <ion-icon name="barbell"></ion-icon>
          <ion-label>Rutinas</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="progress">
          <ion-icon name="stats-chart"></ion-icon>
          <ion-label>Progreso</ion-label>
        </ion-tab-button>
        @if (auth.isAuthenticated()) {
          <ion-tab-button tab="community">
            <ion-icon name="people"></ion-icon>
            <ion-label>Amigos</ion-label>
          </ion-tab-button>
        }
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class TabsPage {
  readonly auth = inject(AuthService);

  constructor() {
    addIcons({ home, barbell, statsChart, people });
  }
}
