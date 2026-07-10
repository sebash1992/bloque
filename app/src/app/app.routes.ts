import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'tabs',
    loadComponent: () => import('./tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('./pages/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'routines',
        loadComponent: () =>
          import('./pages/routines/routines.page').then((m) => m.RoutinesPage),
      },
      {
        path: 'routines/:routineId',
        loadComponent: () =>
          import('./pages/routine-days/routine-days.page').then(
            (m) => m.RoutineDaysPage
          ),
      },
      {
        path: 'progress',
        loadComponent: () =>
          import('./pages/progress/progress.page').then((m) => m.ProgressPage),
      },
      {
        path: 'progress/exercise/:name',
        loadComponent: () =>
          import('./pages/progress-detail/progress-detail.page').then(
            (m) => m.ProgressDetailPage
          ),
      },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
  {
    path: 'workout/:dayId',
    loadComponent: () =>
      import('./pages/workout/workout.page').then((m) => m.WorkoutPage),
  },
  {
    path: 'routine-create',
    loadComponent: () =>
      import('./pages/routine-create/routine-create.page').then(
        (m) => m.RoutineCreatePage
      ),
  },
  {
    path: 'routine-build/:routineId',
    loadComponent: () =>
      import('./pages/routine-build/routine-build.page').then(
        (m) => m.RoutineBuildPage
      ),
  },
  {
    path: 'day-editor/:dayId',
    loadComponent: () =>
      import('./pages/day-editor/day-editor.page').then((m) => m.DayEditorPage),
  },
  {
    path: 'block-create',
    loadComponent: () =>
      import('./pages/block-create/block-create.page').then(
        (m) => m.BlockCreatePage
      ),
  },
  { path: '', redirectTo: 'tabs/home', pathMatch: 'full' },
];
