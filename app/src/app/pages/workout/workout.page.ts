import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonModal,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmark,
  playOutline,
  removeCircleOutline,
  addCircleOutline,
  optionsOutline,
  lockClosed,
} from 'ionicons/icons';
import { Haptics } from '@capacitor/haptics';
import { Exercise, WorkoutLog } from '../../data/models';
import {
  WorkoutService,
  repsPerSeries,
  repsToNumber,
} from '../../data/workout.service';

interface SeriesPip {
  index: number;
  repLabel: string;
  reps: number;
  weight: number;
  done: boolean;
}

interface ExerciseVM {
  ex: Exercise;
  weightless: boolean;
  pips: SeriesPip[];
  // active countdown state for time-based exercises
  remaining: number | null;
}

interface BlockVM {
  id: number;
  name: string;
  exercises: ExerciseVM[];
}

@Component({
  selector: 'app-workout',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonModal,
  ],
  templateUrl: './workout.page.html',
  styleUrls: ['./workout.page.scss'],
})
export class WorkoutPage implements OnInit, OnDestroy {
  dayName = '';
  blocks: BlockVM[] = [];
  sessionId!: number;
  routineId!: number;

  // blocks the user chose to unlock ahead of order (per session)
  private unlockedBlocks = new Set<number>();

  // weight bottom sheet
  sheetOpen = false;
  private sheetPip: SeriesPip | null = null;
  private sheetEx: ExerciseVM | null = null;

  private timers = new Map<Exercise, any>();

  constructor(
    private svc: WorkoutService,
    private route: ActivatedRoute,
    private router: Router,
    private alertCtrl: AlertController
  ) {
    addIcons({
      checkmark,
      playOutline,
      removeCircleOutline,
      addCircleOutline,
      optionsOutline,
      lockClosed,
    });
  }

  async ngOnInit() {
    const dayId = Number(this.route.snapshot.paramMap.get('dayId'));
    const detail = await this.svc.getDayDetail(dayId);
    if (!detail) {
      return;
    }
    this.dayName = detail.day.name;
    this.routineId = detail.day.routineId;

    // Resume a still-open session for this day (e.g. app was closed
    // mid-workout); otherwise start a fresh one.
    const resumable = await this.svc.getResumableSession(dayId);
    let logs: WorkoutLog[] = [];
    if (resumable) {
      this.sessionId = resumable.id!;
      logs = await this.svc.getSessionLogs(this.sessionId);
    } else {
      this.sessionId = await this.svc.startSession(this.routineId, dayId);
    }
    const logMap = new Map<string, WorkoutLog>();
    for (const l of logs) {
      logMap.set(`${l.exerciseId}:${l.seriesIndex}`, l);
    }

    this.blocks = [];
    for (const block of detail.blocks) {
      const exercises: ExerciseVM[] = [];
      for (const ex of block.exercises) {
        exercises.push(await this.buildExerciseVM(ex, logMap));
      }
      this.blocks.push({ id: block.id!, name: block.name, exercises });
    }
  }

  ngOnDestroy() {
    this.timers.forEach((t) => clearInterval(t));
  }

  private async buildExerciseVM(
    ex: Exercise,
    logMap: Map<string, WorkoutLog>
  ): Promise<ExerciseVM> {
    const weightless = ex.isTimeBased || ex.category === 'MOVILIDAD';
    const labels = repsPerSeries(ex.targetReps, ex.targetSeries);
    const pips: SeriesPip[] = [];
    for (let i = 0; i < ex.targetSeries; i++) {
      const reps = repsToNumber(labels[i]);
      const existing = logMap.get(`${ex.id}:${i}`);
      let weight: number;
      if (existing) {
        // resumed series: restore the weight that was logged
        weight = existing.weight;
      } else {
        // Pre-fill with the last weight used for this rep count; fall back to
        // the previous series' weight, then a sensible default.
        const last = weightless
          ? 0
          : await this.svc.getLastWeightForReps(ex.name, reps);
        weight = last ?? (i > 0 ? pips[i - 1].weight : weightless ? 0 : 20);
      }
      pips.push({
        index: i,
        repLabel: labels[i],
        reps,
        weight,
        done: !!existing,
      });
    }
    return { ex, weightless, pips, remaining: null };
  }

  // ------------------------------------------------------------- derived state
  focusIndex(vm: ExerciseVM): number {
    const idx = vm.pips.findIndex((p) => !p.done);
    return idx === -1 ? vm.pips.length : idx;
  }

  isExerciseDone(vm: ExerciseVM): boolean {
    return vm.pips.every((p) => p.done);
  }

  isBlockDone(block: BlockVM): boolean {
    return block.exercises.every((e) => this.isExerciseDone(e));
  }

  isBlockLocked(index: number): boolean {
    if (index === 0 || this.unlockedBlocks.has(index)) {
      return false;
    }
    // A block that already has logged series (e.g. a resumed session) stays
    // open so you can keep going without unlocking again.
    const block = this.blocks[index];
    if (block.exercises.some((e) => e.pips.some((p) => p.done))) {
      return false;
    }
    return !this.isBlockDone(this.blocks[index - 1]);
  }

  unlockBlock(index: number) {
    this.unlockedBlocks.add(index);
  }

  get totalSeries(): number {
    return this.blocks.reduce(
      (sum, b) => sum + b.exercises.reduce((s, e) => s + e.pips.length, 0),
      0
    );
  }

  get doneSeries(): number {
    return this.blocks.reduce(
      (sum, b) =>
        sum +
        b.exercises.reduce(
          (s, e) => s + e.pips.filter((p) => p.done).length,
          0
        ),
      0
    );
  }

  get progressPct(): number {
    return this.totalSeries ? Math.round((this.doneSeries / this.totalSeries) * 100) : 0;
  }

  // --------------------------------------------------------------- pip actions
  async togglePip(vm: ExerciseVM, pip: SeriesPip) {
    if (vm.ex.isTimeBased) {
      return; // time-based pips are completed by the timer
    }
    pip.done = !pip.done;
    if (pip.done) {
      await this.svc.logSet({
        exerciseId: vm.ex.id!,
        sessionId: this.sessionId,
        date: Date.now(),
        seriesIndex: pip.index,
        weight: pip.weight,
        reps: pip.reps,
      });
    } else {
      await this.svc.removeSet(this.sessionId, vm.ex.id!, pip.index);
    }
    await this.maybeFinish();
  }

  /** Reopen a completed exercise by undoing its last marked series. */
  async reopenExercise(vm: ExerciseVM) {
    for (let i = vm.pips.length - 1; i >= 0; i--) {
      if (vm.pips[i].done) {
        vm.pips[i].done = false;
        await this.svc.removeSet(this.sessionId, vm.ex.id!, vm.pips[i].index);
        break;
      }
    }
  }

  // ---------------------------------------------------------------- timer flow
  startTimer(vm: ExerciseVM) {
    if (this.timers.has(vm.ex)) {
      return;
    }
    const pip = vm.pips[this.focusIndex(vm)];
    if (!pip) {
      return;
    }
    vm.remaining = vm.ex.targetTimeSeconds ?? 30;
    const t = setInterval(async () => {
      vm.remaining = (vm.remaining ?? 1) - 1;
      if (vm.remaining <= 0) {
        clearInterval(t);
        this.timers.delete(vm.ex);
        vm.remaining = null;
        pip.done = true;
        // Capacitor Haptics works on iOS/Android native (navigator.vibrate
        // is a no-op inside iOS WKWebView); resolves harmlessly on web.
        Haptics.vibrate({ duration: 300 }).catch(() => {});
        await this.svc.logSet({
          exerciseId: vm.ex.id!,
          sessionId: this.sessionId,
          date: Date.now(),
          seriesIndex: pip.index,
          weight: 0,
          reps: vm.ex.targetTimeSeconds ?? 0,
        });
        await this.maybeFinish();
      }
    }, 1000);
    this.timers.set(vm.ex, t);
  }

  // ---------------------------------------------------------- weight bottomsheet
  openWeight(vm: ExerciseVM) {
    const pip = vm.pips[Math.min(this.focusIndex(vm), vm.pips.length - 1)];
    this.sheetEx = vm;
    this.sheetPip = pip;
    this.sheetOpen = true;
  }

  get sheetLabel(): string {
    if (!this.sheetEx || !this.sheetPip) {
      return '';
    }
    return `${this.sheetEx.ex.name} · Serie ${this.sheetPip.index + 1}`;
  }

  get sheetWeight(): number {
    return this.sheetPip?.weight ?? 0;
  }

  adjustWeight(delta: number) {
    if (!this.sheetEx || !this.sheetPip) {
      return;
    }
    // Move the edited series and every pending series that currently shares its
    // weight (they're "linked"), leaving series with a different, deliberately
    // set weight independent. Completed series keep their logged value.
    const base = this.sheetPip.weight;
    const next = Math.max(0, Math.round((base + delta) * 10) / 10);
    for (const pip of this.sheetEx.pips) {
      if (!pip.done && pip.weight === base) {
        pip.weight = next;
      }
    }
  }

  async closeSheet() {
    this.sheetOpen = false;
    // persist the new weight if the pip was already completed
    if (this.sheetEx && this.sheetPip && this.sheetPip.done) {
      await this.svc.logSet({
        exerciseId: this.sheetEx.ex.id!,
        sessionId: this.sessionId,
        date: Date.now(),
        seriesIndex: this.sheetPip.index,
        weight: this.sheetPip.weight,
        reps: this.sheetPip.reps,
      });
    }
  }

  // -------------------------------------------------------------- finish flow
  private async maybeFinish() {
    const allDone = this.blocks.every((b) => this.isBlockDone(b));
    if (allDone) {
      await this.finish(true);
    }
  }

  async finish(auto = false) {
    if (!auto && this.doneSeries === 0) {
      this.router.navigateByUrl('/tabs/home');
      return;
    }
    await this.svc.completeSession(this.sessionId);
    const alert = await this.alertCtrl.create({
      header: auto ? '¡Sesión completada! 💪' : 'Sesión guardada',
      message: `Registraste ${this.doneSeries} series. ¡Bien ahí!`,
      buttons: [
        {
          text: 'Listo',
          handler: () => this.router.navigateByUrl('/tabs/home'),
        },
      ],
    });
    await alert.present();
  }
}
