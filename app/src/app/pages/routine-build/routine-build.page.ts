import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonReorder,
  IonReorderGroup,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  AlertController,
  ItemReorderEventDetail,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, chevronForward, trash, reorderThreeOutline } from 'ionicons/icons';
import { Day, Routine } from '../../data/models';
import { WorkoutService } from '../../data/workout.service';

interface DayRow {
  day: Day;
  blockCount: number;
}

@Component({
  selector: 'app-routine-build',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonReorder,
    IonReorderGroup,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
  ],
  templateUrl: './routine-build.page.html',
  styleUrls: ['./routine-build.page.scss'],
})
export class RoutineBuildPage implements OnInit {
  routineId!: number;
  routine?: Routine;
  rows: DayRow[] = [];

  constructor(
    private svc: WorkoutService,
    private route: ActivatedRoute,
    private router: Router,
    private alertCtrl: AlertController
  ) {
    addIcons({ arrowBack, chevronForward, trash, reorderThreeOutline });
  }

  async ngOnInit() {
    this.routineId = Number(this.route.snapshot.paramMap.get('routineId'));
    await this.load();
  }

  async ionViewWillEnter() {
    if (this.routineId) {
      await this.load();
    }
  }

  private async load() {
    this.routine = await this.svc.getRoutineById(this.routineId);
    const days = await this.svc.getDays(this.routineId);
    // Build into a local array and assign atomically — ngOnInit and
    // ionViewWillEnter can both call load(), and awaiting mid-loop would
    // otherwise let two runs interleave and duplicate rows.
    const rows: DayRow[] = [];
    for (const day of days) {
      const blockCount = await this.svc.countBlocksInDay(day.id!);
      rows.push({ day, blockCount });
    }
    this.rows = rows;
  }

  openDay(row: DayRow) {
    this.router.navigateByUrl(`/day-editor/${row.day.id}`);
  }

  async addDay() {
    const n = this.rows.length + 1;
    const alert = await this.alertCtrl.create({
      header: 'Nuevo día',
      inputs: [
        {
          name: 'name',
          type: 'text',
          value: `Día ${n}: `,
          placeholder: 'Ej: Día 1: Tren Superior',
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Agregar',
          handler: async (data) => {
            const name = (data.name || '').trim();
            if (!name) return;
            await this.svc.addDay(this.routineId, name);
            await this.load();
          },
        },
      ],
    });
    await alert.present();
  }

  async deleteDay(row: DayRow, sliding: IonItemSliding) {
    await sliding.close();
    const alert = await this.alertCtrl.create({
      header: 'Eliminar día',
      message: `¿Borrar "${row.day.name}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.svc.deleteDay(row.day.id!);
            await this.load();
          },
        },
      ],
    });
    await alert.present();
  }

  async handleReorder(ev: CustomEvent<ItemReorderEventDetail>) {
    const moved = this.rows.splice(ev.detail.from, 1)[0];
    this.rows.splice(ev.detail.to, 0, moved);
    ev.detail.complete();
    await this.svc.reorderDays(this.rows.map((r) => r.day.id!));
  }

  async finalize() {
    if (!this.rows.length) {
      const a = await this.alertCtrl.create({
        header: 'Falta algo',
        message: 'Agregá al menos un día antes de finalizar.',
        buttons: ['Ok'],
      });
      await a.present();
      return;
    }
    await this.svc.finalizeRoutine(this.routineId);
    this.router.navigateByUrl('/tabs/routines', { replaceUrl: true });
  }

  async back() {
    const alert = await this.alertCtrl.create({
      header: 'Salir sin publicar',
      message: 'Esta rutina todavía no se publicó. ¿Qué querés hacer?',
      buttons: [
        { text: 'Seguir editando', role: 'cancel' },
        {
          text: 'Descartar',
          role: 'destructive',
          handler: async () => {
            await this.svc.deleteRoutineCascade(this.routineId);
            this.router.navigateByUrl('/tabs/routines', { replaceUrl: true });
          },
        },
      ],
    });
    await alert.present();
  }
}
