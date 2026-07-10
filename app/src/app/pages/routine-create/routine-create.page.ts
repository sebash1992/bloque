import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonFooter,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, arrowForward } from 'ionicons/icons';
import { WorkoutService } from '../../data/workout.service';

@Component({
  selector: 'app-routine-create',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonFooter,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
  ],
  templateUrl: './routine-create.page.html',
  styleUrls: ['./routine-create.page.scss'],
})
export class RoutineCreatePage {
  name = '';
  frequency = '';
  icon = '⚡';
  readonly icons = ['⚡', '🔥', '💪', '🏋️', '🦵', '🚀'];

  constructor(private svc: WorkoutService, private router: Router) {
    addIcons({ close, arrowForward });
  }

  get canContinue(): boolean {
    return !!this.name.trim();
  }

  async next() {
    if (!this.canContinue) return;
    const id = await this.svc.createDraftRoutine(
      this.name.trim(),
      this.frequency.trim() || 'Sin especificar',
      this.icon
    );
    this.router.navigateByUrl(`/routine-build/${id}`, { replaceUrl: true });
  }

  cancel() {
    this.router.navigateByUrl('/tabs/routines', { replaceUrl: true });
  }
}
