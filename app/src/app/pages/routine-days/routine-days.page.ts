import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForward, flame, shareSocialOutline } from 'ionicons/icons';
import { Day, Routine } from '../../data/models';
import { WorkoutService } from '../../data/workout.service';
import { AuthService } from '../../data/auth.service';
import { CommunityService } from '../../data/community.service';

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
    IonButton,
    IonIcon,
  ],
  templateUrl: './routine-days.page.html',
  styleUrls: ['./routine-days.page.scss'],
})
export class RoutineDaysPage implements OnInit {
  routine?: Routine;
  days: Day[] = [];

  readonly auth = inject(AuthService);
  private community = inject(CommunityService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  constructor(
    private svc: WorkoutService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    addIcons({ chevronForward, flame, shareSocialOutline });
  }

  async share() {
    if (!this.routine) {
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Compartir rutina',
      message: `Enviar "${this.routine.name}" a un usuario.`,
      inputs: [
        { name: 'username', type: 'text', placeholder: '@usuario' },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Enviar',
          handler: async (data) => {
            const username = (data.username || '').trim();
            if (!username) {
              return;
            }
            const payload = await this.svc.exportRoutineTree(this.routine!.id!);
            if (!payload) {
              return;
            }
            const result = await this.community.share(payload, username);
            const at = username.startsWith('@') ? username : '@' + username;
            const messages: Record<string, string> = {
              ok: `Rutina enviada a ${at} 📨`,
              not_found: `No existe el usuario ${at}.`,
              self: 'No podés compartirte una rutina a vos mismo 🙂',
              error: 'No se pudo compartir. Probá de nuevo.',
            };
            const t = await this.toastCtrl.create({
              message: messages[result],
              duration: 2200,
              color: result === 'ok' ? 'success' : 'medium',
            });
            await t.present();
          },
        },
      ],
    });
    await alert.present();
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
