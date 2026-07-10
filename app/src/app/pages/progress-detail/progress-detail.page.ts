import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonModal,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, removeCircleOutline, addCircleOutline } from 'ionicons/icons';
import { WorkoutLog } from '../../data/models';
import { WorkoutService, repsPerSeries } from '../../data/workout.service';
import { db } from '../../data/db';

interface ChartPoint {
  x: number;
  y: number;
  weight: number;
  dateLabel: string;
}

interface HistoryRow {
  date: number;
  weight: number;
}

@Component({
  selector: 'app-progress-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonModal,
  ],
  templateUrl: './progress-detail.page.html',
  styleUrls: ['./progress-detail.page.scss'],
})
export class ProgressDetailPage implements OnInit {
  name = '';
  repChips: number[] = [];
  selectedReps = 0;

  private logs: WorkoutLog[] = [];

  // chart state
  points: ChartPoint[] = [];
  path = '';
  yLabels: { y: number; value: number }[] = [];
  history: HistoryRow[] = [];

  // log-entry sheet
  logSheetOpen = false;
  logReps = 10;
  logWeight = 20;
  logDate = todayInput();

  constructor(private svc: WorkoutService, private route: ActivatedRoute) {
    addIcons({ add, removeCircleOutline, addCircleOutline });
  }

  async ngOnInit() {
    this.name = decodeURIComponent(
      this.route.snapshot.paramMap.get('name') ?? ''
    );
    await this.reload();
  }

  async ionViewWillEnter() {
    if (this.name) {
      await this.reload();
    }
  }

  private async reload() {
    const ex = await db.exercises.where('name').equals(this.name).first();
    this.logs = await this.svc.getHistoryForExerciseName(this.name);

    // Rep chips = scheme reps (if any) ∪ reps present in the history.
    const chipSet = new Set<number>();
    if (ex && ex.targetReps) {
      for (const label of repsPerSeries(ex.targetReps, ex.targetSeries)) {
        const n = parseInt(label.match(/\d+/)?.[0] ?? '', 10);
        if (!Number.isNaN(n)) {
          chipSet.add(n);
        }
      }
    }
    for (const l of this.logs) {
      if (l.reps > 0) {
        chipSet.add(l.reps);
      }
    }
    this.repChips = [...chipSet].sort((a, b) => b - a);
    if (!this.repChips.includes(this.selectedReps)) {
      this.selectedReps = this.repChips[0] ?? 0;
    }
    this.rebuild();
  }

  selectRep(reps: number) {
    this.selectedReps = reps;
    this.rebuild();
  }

  // ------------------------------------------------------------- log entry
  openLog() {
    this.logReps = this.selectedReps || 10;
    this.logWeight =
      this.history.length ? this.history[0].weight : this.logWeight || 20;
    this.logDate = todayInput();
    this.logSheetOpen = true;
  }

  adjustLogWeight(delta: number) {
    this.logWeight = Math.max(0, Math.round((this.logWeight + delta) * 10) / 10);
  }

  async saveLog() {
    const reps = Math.max(1, Math.round(Number(this.logReps) || 0));
    const weight = Math.max(0, Number(this.logWeight) || 0);
    const date = new Date(`${this.logDate}T12:00:00`).getTime();
    await this.svc.quickLog(this.name, reps, weight, date);
    this.logSheetOpen = false;
    this.selectedReps = reps;
    await this.reload();
  }

  private rebuild() {
    const byDay = new Map<string, { date: number; weight: number }>();
    for (const l of this.logs) {
      if (l.reps !== this.selectedReps) {
        continue;
      }
      const key = new Date(l.date).toISOString().slice(0, 10);
      const prev = byDay.get(key);
      if (!prev || l.weight > prev.weight) {
        byDay.set(key, { date: l.date, weight: l.weight });
      }
    }
    const series = [...byDay.values()].sort((a, b) => a.date - b.date);

    this.history = [...series]
      .sort((a, b) => b.date - a.date)
      .map((s) => ({ date: s.date, weight: s.weight }));

    this.buildChart(series);
  }

  private buildChart(series: { date: number; weight: number }[]) {
    const W = 300;
    const H = 170;
    const padL = 42;
    const padR = 12;
    const padT = 18;
    const padB = 26;

    if (!series.length) {
      this.points = [];
      this.path = '';
      this.yLabels = [];
      return;
    }

    const weights = series.map((s) => s.weight);
    let min = Math.min(...weights);
    let max = Math.max(...weights);
    if (min === max) {
      min = Math.max(0, min - 5);
      max = max + 5;
    }

    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const xFor = (i: number) =>
      series.length === 1
        ? padL + plotW / 2
        : padL + (i / (series.length - 1)) * plotW;
    const yFor = (w: number) =>
      padT + plotH - ((w - min) / (max - min)) * plotH;

    this.points = series.map((s, i) => ({
      x: xFor(i),
      y: yFor(s.weight),
      weight: s.weight,
      dateLabel: new Date(s.date).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
      }),
    }));

    this.path = this.points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    this.yLabels = [0, 0.5, 1].map((t) => ({
      y: padT + plotH - t * plotH,
      value: Math.round(min + t * (max - min)),
    }));
  }
}

/** Today as a yyyy-mm-dd string for <input type="date">. */
function todayInput(): string {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}
