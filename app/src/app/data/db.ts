import Dexie, { Table } from 'dexie';
import {
  Block,
  BlockTemplate,
  BlockTemplateExercise,
  Day,
  Exercise,
  Routine,
  WorkoutLog,
  WorkoutSession,
} from './models';

/**
 * Local, offline-first database for Bloque.
 * Client-side only — no backend, no auth, no remote sync.
 */
export class BloqueDatabase extends Dexie {
  routines!: Table<Routine, number>;
  days!: Table<Day, number>;
  blocks!: Table<Block, number>;
  exercises!: Table<Exercise, number>;
  workoutLogs!: Table<WorkoutLog, number>;
  sessions!: Table<WorkoutSession, number>;
  blockTemplates!: Table<BlockTemplate, number>;
  blockTemplateExercises!: Table<BlockTemplateExercise, number>;

  constructor() {
    super('bloque');
    this.version(1).stores({
      routines: '++id, isActive',
      days: '++id, routineId, order',
      blocks: '++id, dayId, order',
      exercises: '++id, blockId, category, name',
      workoutLogs: '++id, exerciseId, sessionId, date, seriesIndex',
      sessions: '++id, routineId, dayId, date',
    });

    // v2: reusable block library + routine icon/draft fields.
    this.version(2)
      .stores({
        routines: '++id, isActive, draft',
        blockTemplates: '++id, name',
        blockTemplateExercises: '++id, templateId, order',
      })
      .upgrade(async (tx) => {
        await tx
          .table('routines')
          .toCollection()
          .modify((r: Routine) => {
            if (r.icon === undefined) {
              r.icon = '⚡';
            }
            if (r.draft === undefined) {
              r.draft = false;
            }
          });
      });
  }
}

export const db = new BloqueDatabase();
