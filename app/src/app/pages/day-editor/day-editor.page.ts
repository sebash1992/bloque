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
  IonReorder,
  IonReorderGroup,
  AlertController,
  ItemReorderEventDetail,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBack,
  createOutline,
  trashOutline,
  reorderThreeOutline,
  add,
} from 'ionicons/icons';
import { Day } from '../../data/models';
import {
  WorkoutService,
  BlockWithExercises,
  BlockTemplateWithExercises,
} from '../../data/workout.service';

@Component({
  selector: 'app-day-editor',
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
    IonReorder,
    IonReorderGroup,
  ],
  templateUrl: './day-editor.page.html',
  styleUrls: ['./day-editor.page.scss'],
})
export class DayEditorPage implements OnInit {
  dayId!: number;
  day?: Day;
  blocks: BlockWithExercises[] = [];
  templates: BlockTemplateWithExercises[] = [];

  constructor(
    private svc: WorkoutService,
    private route: ActivatedRoute,
    private router: Router,
    private alertCtrl: AlertController
  ) {
    addIcons({
      arrowBack,
      createOutline,
      trashOutline,
      reorderThreeOutline,
      add,
    });
  }

  async ngOnInit() {
    this.dayId = Number(this.route.snapshot.paramMap.get('dayId'));
    await this.load();
  }

  async ionViewWillEnter() {
    if (this.dayId) {
      await this.load();
    }
  }

  private async load() {
    const detail = await this.svc.getDayDetail(this.dayId);
    if (detail) {
      this.day = detail.day;
      this.blocks = detail.blocks;
    }
    this.templates = await this.svc.getBlockTemplates();
  }

  async cloneTemplate(t: BlockTemplateWithExercises) {
    await this.svc.cloneTemplateIntoDay(t.id!, this.dayId);
    await this.load();
  }

  newBlock() {
    this.router.navigateByUrl(`/block-create?dayId=${this.dayId}`);
  }

  async deleteBlock(block: BlockWithExercises) {
    const alert = await this.alertCtrl.create({
      header: 'Quitar bloque',
      message: `¿Sacar "${block.name}" de este día?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Quitar',
          role: 'destructive',
          handler: async () => {
            await this.svc.deleteBlock(block.id!);
            await this.load();
          },
        },
      ],
    });
    await alert.present();
  }

  async handleReorder(ev: CustomEvent<ItemReorderEventDetail>) {
    const moved = this.blocks.splice(ev.detail.from, 1)[0];
    this.blocks.splice(ev.detail.to, 0, moved);
    ev.detail.complete();
    await this.svc.reorderBlocks(this.blocks.map((b) => b.id!));
  }

  async renameDay() {
    const alert = await this.alertCtrl.create({
      header: 'Nombre del día',
      inputs: [
        { name: 'name', type: 'text', value: this.day?.name ?? '' },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            const name = (data.name || '').trim();
            if (!name) return;
            await this.svc.renameDay(this.dayId, name);
            await this.load();
          },
        },
      ],
    });
    await alert.present();
  }

  back() {
    if (this.day) {
      this.router.navigateByUrl(`/routine-build/${this.day.routineId}`, {
        replaceUrl: true,
      });
    } else {
      this.router.navigateByUrl('/tabs/routines', { replaceUrl: true });
    }
  }
}
