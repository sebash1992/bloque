import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonModal,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  close,
  addCircleOutline,
  removeCircleOutline,
  add,
  search,
} from 'ionicons/icons';
import { ExerciseCategory } from '../../data/models';
import {
  WorkoutService,
  CatalogExercise,
  DraftBlockExercise,
} from '../../data/workout.service';

@Component({
  selector: 'app-block-create',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonModal,
  ],
  templateUrl: './block-create.page.html',
  styleUrls: ['./block-create.page.scss'],
})
export class BlockCreatePage implements OnInit {
  mode: 'library' | 'day' = 'library';
  dayId?: number;
  templateId?: number;

  name = '';
  series = 3;
  exercises: DraftBlockExercise[] = [];

  private catalog: CatalogExercise[] = [];

  // add-exercise sheet
  addOpen = false;
  searchName = '';
  newReps = '';
  newCategory: ExerciseCategory = 'TREN SUPERIOR';
  private picked?: CatalogExercise;
  readonly categories: ExerciseCategory[] = [
    'TREN SUPERIOR',
    'TREN INFERIOR',
    'ZONA MEDIA',
    'MOVILIDAD',
  ];

  constructor(
    private svc: WorkoutService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    addIcons({ close, addCircleOutline, removeCircleOutline, add, search });
  }

  async ngOnInit() {
    const q = this.route.snapshot.queryParamMap;
    const dayId = q.get('dayId');
    const templateId = q.get('templateId');
    if (dayId) {
      this.mode = 'day';
      this.dayId = Number(dayId);
    }
    this.catalog = await this.svc.getExerciseCatalog();

    if (templateId) {
      this.templateId = Number(templateId);
      const t = await this.svc.getBlockTemplate(this.templateId);
      if (t) {
        this.name = t.name;
        this.series = t.series;
        this.exercises = t.exercises.map((e) => ({
          name: e.name,
          reps: e.reps,
          category: e.category,
          icon: e.icon,
          isTimeBased: e.isTimeBased,
          targetTimeSeconds: e.targetTimeSeconds,
        }));
      }
    }
  }

  get title(): string {
    if (this.templateId) return 'Editar Bloque';
    return this.mode === 'day' ? 'Nuevo Bloque' : 'Nuevo Bloque Reutilizable';
  }

  adjustSeries(delta: number) {
    this.series = Math.min(10, Math.max(1, this.series + delta));
  }

  // ---------------------------------------------------------- add exercise
  openAdd() {
    this.searchName = '';
    this.newReps = '';
    this.newCategory = 'TREN SUPERIOR';
    this.picked = undefined;
    this.addOpen = true;
  }

  get suggestions(): CatalogExercise[] {
    const q = this.searchName.trim().toLowerCase();
    if (!q) return this.catalog.slice(0, 8);
    return this.catalog
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 8);
  }

  pick(c: CatalogExercise) {
    this.searchName = c.name;
    this.newCategory = c.category;
    this.picked = c;
  }

  onSearchInput() {
    if (this.picked && this.picked.name !== this.searchName) {
      this.picked = undefined;
    }
  }

  get canAdd(): boolean {
    return !!this.searchName.trim() && !!this.newReps.trim();
  }

  confirmAdd() {
    const name = this.searchName.trim();
    const reps = this.newReps.trim();
    if (!name || !reps) return;
    const timeBased = this.picked
      ? this.picked.isTimeBased
      : reps.includes('"');
    const time = this.picked
      ? this.picked.targetTimeSeconds
      : timeBased
        ? parseInt(reps.match(/\d+/)?.[0] ?? '0', 10)
        : null;
    this.exercises.push({
      name,
      reps,
      category: this.picked ? this.picked.category : this.newCategory,
      icon: this.picked ? this.picked.icon : '🏋️',
      isTimeBased: timeBased,
      targetTimeSeconds: time,
    });
    this.addOpen = false;
  }

  removeExercise(i: number) {
    this.exercises.splice(i, 1);
  }

  // ---------------------------------------------------------- save / cancel
  get canSave(): boolean {
    return !!this.name.trim() && this.exercises.length > 0 && this.series > 0;
  }

  async save() {
    if (!this.canSave) return;
    const id = await this.svc.saveBlockTemplate(
      this.name.trim(),
      this.series,
      this.exercises,
      this.templateId
    );
    if (this.mode === 'day' && this.dayId != null && !this.templateId) {
      // contextual: also inject the freshly saved block into the current day
      await this.svc.cloneTemplateIntoDay(id, this.dayId);
      this.router.navigateByUrl(`/day-editor/${this.dayId}`, {
        replaceUrl: true,
      });
    } else {
      this.router.navigateByUrl('/tabs/progress', { replaceUrl: true });
    }
  }

  cancel() {
    if (this.mode === 'day' && this.dayId != null) {
      this.router.navigateByUrl(`/day-editor/${this.dayId}`, {
        replaceUrl: true,
      });
    } else {
      this.router.navigateByUrl('/tabs/progress', { replaceUrl: true });
    }
  }
}
