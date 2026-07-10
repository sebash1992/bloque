import { Injectable } from '@angular/core';
import { db } from './db';
import { seedIfEmpty } from './seed';
import {
  Block,
  BlockTemplate,
  BlockTemplateExercise,
  Day,
  Exercise,
  ExerciseCategory,
  Routine,
  WorkoutLog,
  WorkoutSession,
} from './models';

export interface BlockWithExercises extends Block {
  exercises: Exercise[];
}

export interface DayDetail {
  day: Day;
  blocks: BlockWithExercises[];
}

export interface BlockTemplateWithExercises extends BlockTemplate {
  exercises: BlockTemplateExercise[];
}

/** A distinct exercise from the catalog, used when linking into a block. */
export interface CatalogExercise {
  name: string;
  category: ExerciseCategory;
  icon: string;
  isTimeBased: boolean;
  targetTimeSeconds: number | null;
}

/** Draft exercise line while building a block (no id yet). */
export interface DraftBlockExercise {
  name: string;
  reps: string;
  category: ExerciseCategory;
  icon: string;
  isTimeBased: boolean;
  targetTimeSeconds: number | null;
}

export interface ExerciseRecord {
  exercise: Exercise;
  record: number | null; // best weight ever, null if no history
}

@Injectable({ providedIn: 'root' })
export class WorkoutService {
  private seeded = false;

  async ready(): Promise<void> {
    if (!this.seeded) {
      await seedIfEmpty();
      this.seeded = true;
    }
  }

  // --------------------------------------------------------------- Routines
  async getActiveRoutine(): Promise<Routine | undefined> {
    await this.ready();
    return db.routines.filter((r) => r.isActive).first();
  }

  async getRoutines(): Promise<Routine[]> {
    await this.ready();
    const all = await db.routines.orderBy('id').reverse().toArray();
    return all.filter((r) => !r.draft);
  }

  /** Get any routine by id, including drafts (getRoutines hides drafts). */
  async getRoutineById(id: number): Promise<Routine | undefined> {
    await this.ready();
    return db.routines.get(id);
  }

  async getDays(routineId: number): Promise<Day[]> {
    await this.ready();
    return db.days.where('routineId').equals(routineId).sortBy('order');
  }

  async getDay(dayId: number): Promise<Day | undefined> {
    await this.ready();
    return db.days.get(dayId);
  }

  // --------------------------------------------------------------- Day detail
  async getDayDetail(dayId: number): Promise<DayDetail | null> {
    await this.ready();
    const day = await db.days.get(dayId);
    if (!day) {
      return null;
    }
    const blocks = await db.blocks.where('dayId').equals(dayId).sortBy('order');
    const blocksWithExercises: BlockWithExercises[] = [];
    for (const block of blocks) {
      const exercises = await db.exercises
        .where('blockId')
        .equals(block.id!)
        .sortBy('order');
      blocksWithExercises.push({ ...block, exercises });
    }
    return { day, blocks: blocksWithExercises };
  }

  // --------------------------------------------------------------- Sessions
  async startSession(routineId: number, dayId: number): Promise<number> {
    return db.sessions.add({
      routineId,
      dayId,
      date: Date.now(),
      completed: false,
    });
  }

  async completeSession(sessionId: number): Promise<void> {
    await db.sessions.update(sessionId, { completed: true });
  }

  /**
   * Find a still-open session for a day to resume (e.g. after the app was
   * closed mid-workout). Only recent sessions (last 12h) count, so an old
   * abandoned session doesn't resurrect stale marks.
   */
  async getResumableSession(
    dayId: number
  ): Promise<WorkoutSession | undefined> {
    await this.ready();
    const cutoff = Date.now() - 12 * 60 * 60 * 1000;
    const sessions = await db.sessions
      .where('dayId')
      .equals(dayId)
      .filter((s) => !s.completed && s.date >= cutoff)
      .toArray();
    sessions.sort((a, b) => b.date - a.date);
    return sessions[0];
  }

  async getSessionLogs(sessionId: number): Promise<WorkoutLog[]> {
    await this.ready();
    return db.workoutLogs.where('sessionId').equals(sessionId).toArray();
  }

  async getSessionsThisWeek(): Promise<WorkoutSession[]> {
    await this.ready();
    const { start } = weekBounds();
    return db.sessions.filter((s) => s.date >= start).toArray();
  }

  async getCompletedSessionsCount(): Promise<number> {
    await this.ready();
    return db.sessions.filter((s) => s.completed).count();
  }

  // --------------------------------------------------- Manual / quick entries
  /**
   * Create a standalone exercise not tied to any routine block (blockId 0),
   * so it can be tracked from the Progress tab. Reuses an existing exercise
   * with the same name if one already exists.
   */
  async createOrGetExercise(
    name: string,
    category: ExerciseCategory
  ): Promise<number> {
    await this.ready();
    const clean = name.trim();
    const existing = await db.exercises.where('name').equals(clean).first();
    if (existing) {
      return existing.id!;
    }
    return db.exercises.add({
      blockId: 0,
      name: clean,
      order: 0,
      category,
      icon: '🏋️',
      targetSeries: 1,
      targetReps: '',
      isTimeBased: false,
      targetTimeSeconds: null,
    });
  }

  /** Log a single weight entry outside of a workout session (sessionId 0). */
  async quickLog(
    exerciseName: string,
    reps: number,
    weight: number,
    date: number
  ): Promise<void> {
    await this.ready();
    const ex = await db.exercises.where('name').equals(exerciseName).first();
    if (!ex) {
      return;
    }
    await db.workoutLogs.add({
      exerciseId: ex.id!,
      sessionId: 0,
      date,
      seriesIndex: 0,
      weight,
      reps,
    });
  }

  // --------------------------------------------------------------- Logs
  async logSet(log: WorkoutLog): Promise<void> {
    // Replace any existing log for the same session/exercise/series.
    const existing = await db.workoutLogs
      .where('sessionId')
      .equals(log.sessionId)
      .filter(
        (l) => l.exerciseId === log.exerciseId && l.seriesIndex === log.seriesIndex
      )
      .first();
    if (existing) {
      await db.workoutLogs.update(existing.id!, {
        weight: log.weight,
        reps: log.reps,
        date: log.date,
      });
    } else {
      await db.workoutLogs.add(log);
    }
  }

  async removeSet(
    sessionId: number,
    exerciseId: number,
    seriesIndex: number
  ): Promise<void> {
    const existing = await db.workoutLogs
      .where('sessionId')
      .equals(sessionId)
      .filter(
        (l) => l.exerciseId === exerciseId && l.seriesIndex === seriesIndex
      )
      .first();
    if (existing) {
      await db.workoutLogs.delete(existing.id!);
    }
  }

  /** Best (max) weight ever logged for a given exercise name across the routine. */
  async getRecordForExerciseName(name: string): Promise<number | null> {
    await this.ready();
    const exercises = await db.exercises.where('name').equals(name).toArray();
    const ids = exercises.map((e) => e.id!);
    if (!ids.length) {
      return null;
    }
    const logs = await db.workoutLogs
      .where('exerciseId')
      .anyOf(ids)
      .filter((l) => l.weight > 0)
      .toArray();
    if (!logs.length) {
      return null;
    }
    return Math.max(...logs.map((l) => l.weight));
  }

  /**
   * Last weight logged for an exercise at a given rep count, to pre-fill the
   * next session. Keyed by reps (not series index) so a pyramid remembers each
   * step's weight independently (e.g. 12 reps → 50kg, 8 reps → 60kg).
   */
  async getLastWeightForReps(
    exerciseName: string,
    reps: number
  ): Promise<number | null> {
    await this.ready();
    const exercises = await db.exercises
      .where('name')
      .equals(exerciseName)
      .toArray();
    const ids = exercises.map((e) => e.id!);
    if (!ids.length) {
      return null;
    }
    const logs = await db.workoutLogs
      .where('exerciseId')
      .anyOf(ids)
      .filter((l) => l.reps === reps && l.weight > 0)
      .sortBy('date');
    // sortBy returns ascending by date → the last entry is the most recent.
    return logs.length ? logs[logs.length - 1].weight : null;
  }

  /** Total weight moved across every logged set (reps * weight), for stats. */
  async getTotalVolume(): Promise<number> {
    await this.ready();
    const logs = await db.workoutLogs.toArray();
    return logs.reduce((sum, l) => sum + l.weight * l.reps, 0);
  }

  async getBestEverLog(): Promise<{ log: WorkoutLog; name: string } | null> {
    await this.ready();
    const logs = (await db.workoutLogs.toArray()).filter((l) => l.weight > 0);
    if (!logs.length) {
      return null;
    }
    const best = logs.reduce((a, b) => (b.weight > a.weight ? b : a));
    const ex = await db.exercises.get(best.exerciseId);
    return { log: best, name: ex?.name ?? 'Ejercicio' };
  }

  // --------------------------------------------------------------- Progress
  /**
   * Distinct trackable exercises (deduplicated by name, weight-relevant only)
   * grouped by category, each with its all-time record.
   */
  async getProgressCatalog(): Promise<Record<string, ExerciseRecord[]>> {
    await this.ready();
    const all = await db.exercises.toArray();
    const byName = new Map<string, Exercise>();
    for (const ex of all) {
      if (ex.category === 'MOVILIDAD') {
        continue;
      }
      if (!byName.has(ex.name)) {
        byName.set(ex.name, ex);
      }
    }

    const grouped: Record<string, ExerciseRecord[]> = {};
    for (const ex of byName.values()) {
      const record = await this.getRecordForExerciseName(ex.name);
      const bucket = (grouped[ex.category] ??= []);
      bucket.push({ exercise: ex, record });
    }
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => a.exercise.name.localeCompare(b.exercise.name));
    }
    return grouped;
  }

  /** All logs for an exercise name, chronological, for the detail chart. */
  async getHistoryForExerciseName(name: string): Promise<WorkoutLog[]> {
    await this.ready();
    const exercises = await db.exercises.where('name').equals(name).toArray();
    const ids = exercises.map((e) => e.id!);
    if (!ids.length) {
      return [];
    }
    return db.workoutLogs.where('exerciseId').anyOf(ids).sortBy('date');
  }

  // ------------------------------------------------------- Exercise catalog
  /**
   * Distinct exercises (by name) known to the app, for searching when linking
   * exercises into a block. Includes routine exercises and standalone ones.
   */
  async getExerciseCatalog(): Promise<CatalogExercise[]> {
    await this.ready();
    const all = await db.exercises.toArray();
    const byName = new Map<string, CatalogExercise>();
    for (const ex of all) {
      if (!byName.has(ex.name)) {
        byName.set(ex.name, {
          name: ex.name,
          category: ex.category,
          icon: ex.icon,
          isTimeBased: ex.isTimeBased,
          targetTimeSeconds: ex.targetTimeSeconds,
        });
      }
    }
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  // ------------------------------------------------------- Block templates
  async getBlockTemplates(): Promise<BlockTemplateWithExercises[]> {
    await this.ready();
    const templates = await db.blockTemplates.orderBy('name').toArray();
    const out: BlockTemplateWithExercises[] = [];
    for (const t of templates) {
      const exercises = await db.blockTemplateExercises
        .where('templateId')
        .equals(t.id!)
        .sortBy('order');
      out.push({ ...t, exercises });
    }
    return out;
  }

  async getBlockTemplate(
    id: number
  ): Promise<BlockTemplateWithExercises | null> {
    await this.ready();
    const t = await db.blockTemplates.get(id);
    if (!t) {
      return null;
    }
    const exercises = await db.blockTemplateExercises
      .where('templateId')
      .equals(id)
      .sortBy('order');
    return { ...t, exercises };
  }

  async saveBlockTemplate(
    name: string,
    series: number,
    exercises: DraftBlockExercise[],
    existingId?: number
  ): Promise<number> {
    await this.ready();
    return db.transaction(
      'rw',
      db.blockTemplates,
      db.blockTemplateExercises,
      async () => {
        let templateId: number;
        if (existingId) {
          templateId = existingId;
          await db.blockTemplates.update(existingId, { name, series });
          await db.blockTemplateExercises
            .where('templateId')
            .equals(existingId)
            .delete();
        } else {
          templateId = await db.blockTemplates.add({
            name,
            series,
            createdAt: Date.now(),
          });
        }
        for (let i = 0; i < exercises.length; i++) {
          const ex = exercises[i];
          await db.blockTemplateExercises.add({
            templateId,
            name: ex.name,
            reps: ex.reps,
            category: ex.category,
            icon: ex.icon,
            isTimeBased: ex.isTimeBased,
            targetTimeSeconds: ex.targetTimeSeconds,
            order: i,
          });
        }
        return templateId;
      }
    );
  }

  async deleteBlockTemplate(id: number): Promise<void> {
    await this.ready();
    await db.transaction(
      'rw',
      db.blockTemplates,
      db.blockTemplateExercises,
      async () => {
        await db.blockTemplateExercises
          .where('templateId')
          .equals(id)
          .delete();
        await db.blockTemplates.delete(id);
      }
    );
  }

  // ------------------------------------------------------- Routine authoring
  async createDraftRoutine(
    name: string,
    frequency: string,
    icon: string
  ): Promise<number> {
    await this.ready();
    return db.routines.add({
      name,
      frequency,
      icon,
      isActive: false,
      draft: true,
      createdAt: Date.now(),
      finishedAt: null,
    });
  }

  async updateRoutineHeader(
    id: number,
    name: string,
    frequency: string,
    icon: string
  ): Promise<void> {
    await db.routines.update(id, { name, frequency, icon });
  }

  /** Finalize a draft: make it the active routine and archive the previous. */
  async finalizeRoutine(id: number): Promise<void> {
    await this.ready();
    const others = await db.routines.filter((r) => r.isActive).toArray();
    for (const o of others) {
      if (o.id !== id) {
        await db.routines.update(o.id!, {
          isActive: false,
          finishedAt: Date.now(),
        });
      }
    }
    await db.routines.update(id, { isActive: true, draft: false });
  }

  /** Delete a routine and everything under it (days, blocks, exercises). */
  async deleteRoutineCascade(routineId: number): Promise<void> {
    await this.ready();
    await db.transaction(
      'rw',
      db.routines,
      db.days,
      db.blocks,
      db.exercises,
      async () => {
        const days = await db.days
          .where('routineId')
          .equals(routineId)
          .toArray();
        for (const day of days) {
          await this.deleteDayInternal(day.id!);
        }
        await db.routines.delete(routineId);
      }
    );
  }

  // ------------------------------------------------------- Day authoring
  async addDay(routineId: number, name: string): Promise<number> {
    await this.ready();
    const count = await db.days.where('routineId').equals(routineId).count();
    return db.days.add({ routineId, name, order: count });
  }

  async renameDay(dayId: number, name: string): Promise<void> {
    await db.days.update(dayId, { name });
  }

  async deleteDay(dayId: number): Promise<void> {
    await this.ready();
    await db.transaction('rw', db.days, db.blocks, db.exercises, async () => {
      await this.deleteDayInternal(dayId);
    });
  }

  private async deleteDayInternal(dayId: number): Promise<void> {
    const blocks = await db.blocks.where('dayId').equals(dayId).toArray();
    for (const block of blocks) {
      await db.exercises.where('blockId').equals(block.id!).delete();
    }
    await db.blocks.where('dayId').equals(dayId).delete();
    await db.days.delete(dayId);
  }

  async reorderDays(orderedIds: number[]): Promise<void> {
    await db.transaction('rw', db.days, async () => {
      for (let i = 0; i < orderedIds.length; i++) {
        await db.days.update(orderedIds[i], { order: i });
      }
    });
  }

  async countBlocksInDay(dayId: number): Promise<number> {
    await this.ready();
    return db.blocks.where('dayId').equals(dayId).count();
  }

  // ------------------------------------------------------- Block authoring (in a day)
  /** Clone a library template into a day as a concrete block + exercises. */
  async cloneTemplateIntoDay(
    templateId: number,
    dayId: number
  ): Promise<void> {
    await this.ready();
    const template = await this.getBlockTemplate(templateId);
    if (!template) {
      return;
    }
    await db.transaction('rw', db.blocks, db.exercises, async () => {
      const order = await db.blocks.where('dayId').equals(dayId).count();
      const blockId = await db.blocks.add({
        dayId,
        name: template.name,
        order,
      });
      for (let i = 0; i < template.exercises.length; i++) {
        const ex = template.exercises[i];
        await db.exercises.add({
          blockId,
          name: ex.name,
          order: i,
          category: ex.category,
          icon: ex.icon,
          targetSeries: template.series,
          targetReps: ex.reps,
          isTimeBased: ex.isTimeBased,
          targetTimeSeconds: ex.targetTimeSeconds,
        });
      }
    });
  }

  /** Create a concrete block directly in a day (contextual "nuevo bloque"). */
  async addBlockToDay(
    dayId: number,
    name: string,
    series: number,
    exercises: DraftBlockExercise[]
  ): Promise<void> {
    await this.ready();
    await db.transaction('rw', db.blocks, db.exercises, async () => {
      const order = await db.blocks.where('dayId').equals(dayId).count();
      const blockId = await db.blocks.add({ dayId, name, order });
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        await db.exercises.add({
          blockId,
          name: ex.name,
          order: i,
          category: ex.category,
          icon: ex.icon,
          targetSeries: series,
          targetReps: ex.reps,
          isTimeBased: ex.isTimeBased,
          targetTimeSeconds: ex.targetTimeSeconds,
        });
      }
    });
  }

  async deleteBlock(blockId: number): Promise<void> {
    await this.ready();
    await db.transaction('rw', db.blocks, db.exercises, async () => {
      await db.exercises.where('blockId').equals(blockId).delete();
      await db.blocks.delete(blockId);
    });
  }

  async reorderBlocks(orderedIds: number[]): Promise<void> {
    await db.transaction('rw', db.blocks, async () => {
      for (let i = 0; i < orderedIds.length; i++) {
        await db.blocks.update(orderedIds[i], { order: i });
      }
    });
  }
}

/** Monday 00:00 -> Sunday 23:59 bounds of the current week. */
export function weekBounds(): { start: number; end: number } {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // 0 = Monday
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start: start.getTime(), end: end.getTime() };
}

/** Expand a rep scheme into a per-series list of rep labels. */
export function repsPerSeries(reps: string, series: number): string[] {
  const trimmed = reps.trim();
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-').map((p) => p.trim());
    const out: string[] = [];
    for (let i = 0; i < series; i++) {
      out.push(parts[i] ?? parts[parts.length - 1]);
    }
    return out;
  }
  return Array.from({ length: series }, () => trimmed);
}

/** Numeric rep count for logging (first number found, 0 if none/AF). */
export function repsToNumber(repLabel: string): number {
  const m = repLabel.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}
