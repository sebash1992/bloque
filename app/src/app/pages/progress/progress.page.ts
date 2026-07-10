import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonIcon,
  IonFab,
  IonFabButton,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { search, chevronForward, add, trashOutline } from 'ionicons/icons';
import { ExerciseCategory } from '../../data/models';
import {
  ExerciseRecord,
  BlockTemplateWithExercises,
} from '../../data/workout.service';
import { WorkoutService } from '../../data/workout.service';

interface Group {
  category: string;
  icon: string;
  items: ExerciseRecord[];
}

const CATEGORY_ICONS: Record<string, string> = {
  'TREN SUPERIOR': '🏋️',
  'TREN INFERIOR': '🦵',
  'ZONA MEDIA': '🔥',
};

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonIcon,
    IonFab,
    IonFabButton,
    IonModal,
    IonSegment,
    IonSegmentButton,
    IonLabel,
  ],
  templateUrl: './progress.page.html',
  styleUrls: ['./progress.page.scss'],
})
export class ProgressPage implements OnInit {
  view: 'ejercicios' | 'bloques' = 'ejercicios';
  query = '';
  private groups: Group[] = [];
  templates: BlockTemplateWithExercises[] = [];

  // create-exercise sheet
  createOpen = false;
  newName = '';
  newCategory: ExerciseCategory = 'TREN SUPERIOR';
  readonly categories: ExerciseCategory[] = [
    'TREN SUPERIOR',
    'TREN INFERIOR',
    'ZONA MEDIA',
  ];

  constructor(
    private svc: WorkoutService,
    private router: Router,
    private alertCtrl: AlertController
  ) {
    addIcons({ search, chevronForward, add, trashOutline });
    // Tab pages are cached by Ionic, so ionViewWillEnter doesn't fire when
    // returning from a full-screen route (block-create). Reload on every
    // navigation that lands back on this tab.
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe((e) => {
        if (e.urlAfterRedirects.split('?')[0] === '/tabs/progress') {
          this.load();
        }
      });
  }

  async ngOnInit() {
    await this.load();
  }

  async ionViewWillEnter() {
    await this.load();
  }

  private async load() {
    const catalog = await this.svc.getProgressCatalog();
    const order = ['TREN SUPERIOR', 'TREN INFERIOR', 'ZONA MEDIA'];
    this.groups = order
      .filter((c) => catalog[c]?.length)
      .map((c) => ({
        category: c,
        icon: CATEGORY_ICONS[c] ?? '🏋️',
        items: catalog[c],
      }));
    this.templates = await this.svc.getBlockTemplates();
  }

  get filteredGroups(): Group[] {
    const q = this.query.trim().toLowerCase();
    if (!q) {
      return this.groups;
    }
    return this.groups
      .map((g) => ({
        ...g,
        items: g.items.filter((i) =>
          i.exercise.name.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.items.length);
  }

  open(name: string) {
    this.router.navigateByUrl(
      `/tabs/progress/exercise/${encodeURIComponent(name)}`
    );
  }

  // ---------------------------------------------------------- FAB (contextual)
  onFab() {
    if (this.view === 'bloques') {
      this.newBlock();
    } else {
      this.openCreate();
    }
  }

  // ---------------------------------------------------------- Block library
  newBlock() {
    this.router.navigateByUrl('/block-create');
  }

  editBlock(id: number) {
    this.router.navigateByUrl(`/block-create?templateId=${id}`);
  }

  async deleteBlock(t: BlockTemplateWithExercises, ev: Event) {
    ev.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: 'Eliminar bloque',
      message: `¿Borrar "${t.name}" de tu biblioteca?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.svc.deleteBlockTemplate(t.id!);
            await this.load();
          },
        },
      ],
    });
    await alert.present();
  }

  // ---------------------------------------------------------- Create exercise
  openCreate() {
    this.newName = '';
    this.newCategory = 'TREN SUPERIOR';
    this.createOpen = true;
  }

  async saveCreate() {
    const name = this.newName.trim();
    if (!name) {
      return;
    }
    await this.svc.createOrGetExercise(name, this.newCategory);
    this.createOpen = false;
    this.open(name);
  }
}
