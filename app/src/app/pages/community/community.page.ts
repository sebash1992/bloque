import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  ToastController,
  ActionSheetController,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { link, ellipsisHorizontal, createOutline } from 'ionicons/icons';
import { AuthService } from '../../data/auth.service';
import {
  CommunityService,
  Contact,
  ReceivedRoutine,
} from '../../data/community.service';
import { WorkoutService } from '../../data/workout.service';

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
  ],
  templateUrl: './community.page.html',
  styleUrls: ['./community.page.scss'],
})
export class CommunityPage implements OnInit {
  readonly auth = inject(AuthService);
  private community = inject(CommunityService);
  private svc = inject(WorkoutService);
  private toastCtrl = inject(ToastController);
  private actionSheetCtrl = inject(ActionSheetController);
  private alertCtrl = inject(AlertController);
  private router = inject(Router);

  inbox: ReceivedRoutine[] = [];
  contacts: Contact[] = [];
  loading = true;

  constructor() {
    addIcons({ link, ellipsisHorizontal, createOutline });
  }

  async editUsername() {
    const alert = await this.alertCtrl.create({
      header: 'Tu usuario',
      message: 'Así te encuentran para compartirte rutinas.',
      inputs: [
        {
          name: 'username',
          type: 'text',
          value: this.auth.username().replace(/^@/, ''),
          placeholder: 'usuario',
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            const result = await this.auth.changeUsername(data.username || '');
            const messages: Record<string, string> = {
              ok: 'Usuario actualizado ✅',
              taken: 'Ese usuario ya está en uso.',
              invalid: 'Usá al menos 3 caracteres (letras, números, . o _).',
              error: 'No se pudo guardar. Probá de nuevo.',
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

  async load(event?: CustomEvent) {
    this.loading = true;
    [this.inbox, this.contacts] = await Promise.all([
      this.community.getInbox(),
      this.community.getContacts(),
    ]);
    this.loading = false;
    (event?.target as HTMLIonRefresherElement | undefined)?.complete();
  }

  async importRoutine(r: ReceivedRoutine) {
    await this.svc.importRoutineTree(r.routine);
    await this.community.accept(r.id);
    this.inbox = this.inbox.filter((x) => x.id !== r.id);
    await this.toast(`"${r.routine.name}" importada ✅`);
  }

  async reject(r: ReceivedRoutine) {
    await this.community.reject(r.id);
    this.inbox = this.inbox.filter((x) => x.id !== r.id);
  }

  async openActions(r: ReceivedRoutine) {
    const sheet = await this.actionSheetCtrl.create({
      header: r.fromUsername,
      buttons: [
        {
          text: 'Rechazar',
          handler: () => {
            this.reject(r);
          },
        },
        {
          text: 'Reportar contenido',
          role: 'destructive',
          handler: () => {
            this.report(r);
          },
        },
        {
          text: 'Bloquear usuario',
          role: 'destructive',
          handler: () => {
            this.block(r);
          },
        },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  private async report(r: ReceivedRoutine) {
    await this.community.report(r.id, r.fromUserId);
    this.inbox = this.inbox.filter((x) => x.id !== r.id);
    await this.toast('Gracias, reportamos el contenido.');
  }

  private async block(r: ReceivedRoutine) {
    await this.community.block(r.fromUserId);
    await this.community.reject(r.id);
    this.inbox = this.inbox.filter((x) => x.id !== r.id);
    await this.toast(`${r.fromUsername} bloqueado.`);
  }

  async signOut() {
    await this.auth.signOut();
    this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
  }

  async confirmDeleteAccount() {
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
              this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
            } catch {
              const t = await this.toastCtrl.create({
                message: 'No se pudo eliminar. Probá de nuevo.',
                duration: 2500,
                color: 'medium',
              });
              await t.present();
            }
          },
        },
      ],
    });
    await alert.present();
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'success',
    });
    await t.present();
  }
}
