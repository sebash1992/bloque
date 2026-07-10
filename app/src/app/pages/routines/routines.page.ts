import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonIcon,
  IonButtons,
  IonButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForward, add } from 'ionicons/icons';
import { Routine } from '../../data/models';
import { WorkoutService } from '../../data/workout.service';

@Component({
  selector: 'app-routines',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonIcon,
    IonButtons,
    IonButton,
  ],
  templateUrl: './routines.page.html',
  styleUrls: ['./routines.page.scss'],
})
export class RoutinesPage implements OnInit {
  active?: Routine;
  history: Routine[] = [];

  constructor(private svc: WorkoutService, private router: Router) {
    addIcons({ chevronForward, add });
    // Reload when returning to this tab from the routine-creation flow.
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe((e) => {
        if (e.urlAfterRedirects.split('?')[0] === '/tabs/routines') {
          this.load();
        }
      });
  }

  newRoutine() {
    this.router.navigateByUrl('/routine-create');
  }

  async ngOnInit() {
    await this.load();
  }

  async ionViewWillEnter() {
    await this.load();
  }

  private async load() {
    const all = await this.svc.getRoutines();
    this.active = all.find((r) => r.isActive);
    this.history = all.filter((r) => !r.isActive);
  }

  open(routine: Routine) {
    this.router.navigateByUrl(`/tabs/routines/${routine.id}`);
  }
}
