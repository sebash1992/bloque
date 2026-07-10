import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForward, flame } from 'ionicons/icons';
import { Day, Routine } from '../../data/models';
import { WorkoutService } from '../../data/workout.service';

@Component({
  selector: 'app-routine-days',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonIcon,
  ],
  templateUrl: './routine-days.page.html',
  styleUrls: ['./routine-days.page.scss'],
})
export class RoutineDaysPage implements OnInit {
  routine?: Routine;
  days: Day[] = [];

  constructor(
    private svc: WorkoutService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    addIcons({ chevronForward, flame });
  }

  async ngOnInit() {
    await this.load();
  }

  async ionViewWillEnter() {
    await this.load();
  }

  private async load() {
    const id = Number(this.route.snapshot.paramMap.get('routineId'));
    const routines = await this.svc.getRoutines();
    this.routine = routines.find((r) => r.id === id);
    this.days = await this.svc.getDays(id);
  }

  isBonus(day: Day): boolean {
    return /bonus/i.test(day.name);
  }

  open(day: Day) {
    this.router.navigateByUrl(`/workout/${day.id}`);
  }
}
