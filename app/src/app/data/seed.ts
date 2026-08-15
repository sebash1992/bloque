import { db } from './db';
import { ExerciseCategory } from './models';

/**
 * First-run seed: a neutral catalog of common exercises (no routine).
 *
 * These are standalone catalog entries (blockId 0) so a fresh install still
 * has something to search when building blocks and something to track in
 * Progreso. Each user builds their own routines from here.
 *
 * NOTE: the personal "Sinapsis" routine that shipped during development was
 * removed for the public build — users start with an empty routine list.
 */

interface CatalogEntry {
  name: string;
  category: ExerciseCategory;
  icon: string;
}

const SUP: ExerciseCategory = 'TREN SUPERIOR';
const INF: ExerciseCategory = 'TREN INFERIOR';
const MED: ExerciseCategory = 'ZONA MEDIA';

const CATALOG: CatalogEntry[] = [
  // Tren superior
  { name: 'Press banca', category: SUP, icon: '🏋️' },
  { name: 'Press inclinado', category: SUP, icon: '🏋️' },
  { name: 'Press militar', category: SUP, icon: '🏋️' },
  { name: 'Jalón al pecho', category: SUP, icon: '🏋️' },
  { name: 'Remo con barra', category: SUP, icon: '🏋️' },
  { name: 'Dominadas', category: SUP, icon: '🏋️' },
  { name: 'Aperturas', category: SUP, icon: '🏋️' },
  { name: 'Vuelos laterales', category: SUP, icon: '🏋️' },
  { name: 'Curl de bíceps', category: SUP, icon: '💪' },
  { name: 'Curl martillo', category: SUP, icon: '💪' },
  { name: 'Press francés', category: SUP, icon: '💪' },
  { name: 'Extensión de tríceps', category: SUP, icon: '💪' },
  { name: 'Fondos', category: SUP, icon: '💪' },
  // Tren inferior
  { name: 'Sentadilla', category: INF, icon: '🦵' },
  { name: 'Peso muerto', category: INF, icon: '🦵' },
  { name: 'Prensa', category: INF, icon: '🦵' },
  { name: 'Estocadas', category: INF, icon: '🦵' },
  { name: 'Extensión de cuádriceps', category: INF, icon: '🦵' },
  { name: 'Curl femoral', category: INF, icon: '🦵' },
  { name: 'Hip thrust', category: INF, icon: '🦵' },
  { name: 'Sentadilla búlgara', category: INF, icon: '🦵' },
  { name: 'Gemelos', category: INF, icon: '🦵' },
  // Zona media
  { name: 'Plancha', category: MED, icon: '🧘' },
  { name: 'Crunch', category: MED, icon: '🔥' },
  { name: 'Giros rusos', category: MED, icon: '🌀' },
  { name: 'Elevación de piernas', category: MED, icon: '🔥' },
  { name: 'Bicho muerto', category: MED, icon: '🪱' },
  { name: 'Ab wheel', category: MED, icon: '🔥' },
];

/**
 * Idempotent seed. Loads the neutral exercise catalog once on first launch.
 * Safe to call on every boot.
 */
export async function seedIfEmpty(): Promise<void> {
  const existing = await db.exercises.count();
  if (existing > 0) {
    return;
  }

  await db.transaction('rw', db.exercises, async () => {
    for (const entry of CATALOG) {
      await db.exercises.add({
        blockId: 0,
        name: entry.name,
        order: 0,
        category: entry.category,
        icon: entry.icon,
        targetSeries: 1,
        targetReps: '',
        isTimeBased: false,
        targetTimeSeconds: null,
      });
    }
  });
}
