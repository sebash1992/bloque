import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { rocketOutline, checkmark, flame, trendingUp, trophy } from 'ionicons/icons';
import { Day, Routine } from '../../data/models';
import { WorkoutService, weekBounds } from '../../data/workout.service';

interface WeekBubble {
  label: string;
  state: 'done' | 'today' | 'pending';
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  routine?: Routine;
  nextDay?: Day;
  week: WeekBubble[] = [];
  sessionsCount = 0;
  volumeTons = '0';
  pr?: { weight: number; name: string; reps: number };

  constructor(private svc: WorkoutService, private router: Router) {
    addIcons({ rocketOutline, checkmark, flame, trendingUp, trophy });
  }

  // ngOnInit guarantees the first load (even on cold-start/refresh, where
  // Ionic's ionViewWillEnter may not fire); ionViewWillEnter refreshes on return.
  async ngOnInit() {
    await this.load();
  }

  async ionViewWillEnter() {
    await this.load();
  }

  private async load() {
    this.routine = await this.svc.getActiveRoutine();
    if (!this.routine) {
      return;
    }
    const days = await this.svc.getDays(this.routine.id!);
    this.sessionsCount = await this.svc.getCompletedSessionsCount();
    this.nextDay = days[this.sessionsCount % days.length];

    const volume = await this.svc.getTotalVolume();
    this.volumeTons = (volume / 1000).toFixed(1);

    const best = await this.svc.getBestEverLog();
    this.pr = best
      ? { weight: best.log.weight, name: best.name, reps: best.log.reps }
      : undefined;

    await this.buildWeek();
  }

  private async buildWeek() {
    const labels = ['L', 'M', 'M', 'J', 'V', 'S'];
    const { start } = weekBounds();
    const sessions = await this.svc.getSessionsThisWeek();
    const todayIdx = (new Date().getDay() + 6) % 7; // 0 = Monday

    this.week = labels.map((label, i) => {
      const dayStart = start + i * 86400000;
      const dayEnd = dayStart + 86400000;
      const done = sessions.some(
        (s) => s.completed && s.date >= dayStart && s.date < dayEnd
      );
      let state: WeekBubble['state'] = 'pending';
      if (done) {
        state = 'done';
      } else if (i === todayIdx) {
        state = 'today';
      }
      return { label, state };
    });
  }

  start() {
    if (this.nextDay) {
      this.router.navigateByUrl(`/workout/${this.nextDay.id}`);
    }
  }
}
