/**
 * Domain models for the Bloque workout tracker.
 * Persisted locally through Dexie (IndexedDB). All schema in English.
 */

export type ExerciseCategory =
  | 'TREN SUPERIOR'
  | 'TREN INFERIOR'
  | 'ZONA MEDIA'
  | 'MOVILIDAD';

export interface Routine {
  id?: number;
  name: string;
  frequency: string;
  isActive: boolean;
  /** Draft routines are hidden from the list until finalized. */
  draft: boolean;
  /** Emoji identifier shown on the routine card. */
  icon: string;
  createdAt: number;
  finishedAt: number | null;
}

export interface Day {
  id?: number;
  routineId: number;
  name: string;
  order: number;
}

export interface Block {
  id?: number;
  dayId: number;
  name: string;
  order: number;
}

export interface Exercise {
  id?: number;
  blockId: number;
  name: string;
  order: number;
  category: ExerciseCategory;
  icon: string;
  /** Number of working series (pips). */
  targetSeries: number;
  /** Rep scheme as shown to the user, e.g. "10-8-6-4", "12", "8/8", "Al fallo". */
  targetReps: string;
  isTimeBased: boolean;
  targetTimeSeconds: number | null;
}

/**
 * One completed working set. The history that powers Progress analytics.
 */
export interface WorkoutLog {
  id?: number;
  exerciseId: number;
  sessionId: number;
  date: number;
  seriesIndex: number;
  weight: number;
  reps: number;
}

/**
 * A workout session = the act of training one Day on a given date.
 * Powers the weekly tracker and streaks.
 */
export interface WorkoutSession {
  id?: number;
  routineId: number;
  dayId: number;
  date: number;
  completed: boolean;
}

/**
 * A reusable block ("Lego piece") living in the user's library, independent
 * of any routine. Cloned into a day when building a routine.
 */
export interface BlockTemplate {
  id?: number;
  name: string;
  /** Series of the circuit, shared across its exercises. */
  series: number;
  createdAt: number;
}

/** An exercise line inside a reusable BlockTemplate. */
export interface BlockTemplateExercise {
  id?: number;
  templateId: number;
  name: string;
  reps: string;
  category: ExerciseCategory;
  icon: string;
  isTimeBased: boolean;
  targetTimeSeconds: number | null;
  order: number;
}
