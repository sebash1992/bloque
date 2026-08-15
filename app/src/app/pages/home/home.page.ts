import { Component, OnInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent,
  IonIcon,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  rocketOutline,
  checkmark,
  flame,
  trendingUp,
  trophy,
  personCircleOutline,
} from 'ionicons/icons';
import { Day, Routine } from '../../data/models';
import { WorkoutService, weekBounds } from '../../data/workout.service';
import { AuthService } from '../../data/auth.service';
import { LoginSheetComponent } from '../../components/login-sheet.component';

interface WeekBubble {
  label: string;
  state: 'done' | 'today' | 'pending';
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon, LoginSheetComponent],
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

  readonly auth = inject(AuthService);
  private alertCtrl = inject(AlertController);
  loginOpen = false;

  constructor(private svc: WorkoutService, private router: Router) {
    addIcons({
      rocketOutline,
      checkmark,
      flame,
      trendingUp,
      trophy,
      personCircleOutline,
    });

    // Close the login sheet automatically once the user is signed in
    // (e.g. after the OAuth redirect returns).
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.loginOpen = false;
      }
    });
  }

  async onProfile() {
    if (!this.auth.isAuthenticated()) {
      this.loginOpen = true;
      return;
    }
    const alert = await this.alertCtrl.create({
      header: this.auth.username(),
      buttons: [
        { text: 'Cerrar', role: 'cancel' },
        {
          text: 'Cerrar sesión',
          handler: () => this.auth.signOut(),
        },
        {
          text: 'Eliminar cuenta',
          role: 'destructive',
          handler: () => this.confirmDeleteAccount(),
        },
      ],
    });
    await alert.present();
  }

  private async confirmDeleteAccount() {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar cuenta',
      message:
        'Se borrará tu cuenta y todos tus datos en la nube (perfil y rutinas compartidas). Esto no se puede deshacer. Tus rutinas guardadas en este teléfono no se tocan.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar definitivamente',
          role: 'destructive',
          handler: async () => {
            try {
              await this.auth.deleteAccount();
            } catch {
              const err = await this.alertCtrl.create({
                header: 'No se pudo eliminar',
                message: 'Probá de nuevo en un momento.',
                buttons: ['Ok'],
              });
              await err.present();
            }
          },
        },
      ],
    });
    await alert.present();
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
