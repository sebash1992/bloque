import { db } from './db';
import { ExerciseCategory } from './models';

/**
 * Seed definition for the "Rutina Sinapsis Gym" transcribed from the
 * "RUTINA S. HERRERA" PDF. Days 1-4 (day 5 was empty in the source).
 *
 * Each block is a super-set/circuit. `series` is shared across the block;
 * `reps` are per exercise. Time-based exercises use `time` (seconds) instead.
 */

interface SeedExercise {
  name: string;
  reps: string;
  category: ExerciseCategory;
  icon?: string;
  time?: number; // seconds -> time based
}

interface SeedBlock {
  name: string;
  series: number;
  exercises: SeedExercise[];
}

interface SeedDay {
  name: string;
  blocks: SeedBlock[];
}

const SUP: ExerciseCategory = 'TREN SUPERIOR';
const INF: ExerciseCategory = 'TREN INFERIOR';
const MED: ExerciseCategory = 'ZONA MEDIA';
const MOV: ExerciseCategory = 'MOVILIDAD';

// TODO(store): This is Sebastian's personal "Sinapsis" routine. Before
// publishing to the App Store, remove this seed data (and the seeding call in
// `seedIfEmpty` below) so the app ships with an empty library and each user
// builds their own routine. The exercise catalog is currently derived from
// these exercises, so consider seeding a neutral exercise catalog instead.
const SINAPSIS_DAYS: SeedDay[] = [
  {
    name: 'Día 1: Tren Superior + Zona Media',
    blocks: [
      {
        name: 'Movilidad',
        series: 3,
        exercises: [
          { name: 'Aperturas c/ banda', reps: '10', category: MOV, icon: '🤸' },
          { name: 'Rotación torácica en cuadrupedia', reps: '10', category: MOV, icon: '🤸' },
          { name: 'Plancha baja', reps: '30"', category: MOV, icon: '⏱️', time: 30 },
        ],
      },
      {
        name: 'Bloque 1',
        series: 4,
        exercises: [
          { name: 'Press plano c/barra', reps: '10-8-6-4', category: SUP, icon: '🏋️' },
          { name: 'Bicep concentrado', reps: '8/8', category: SUP, icon: '💪' },
          { name: 'Bicho muerto', reps: '12', category: MED, icon: '🪱' },
        ],
      },
      {
        name: 'Bloque 2',
        series: 3,
        exercises: [
          { name: 'Jalón al pecho en polea alta', reps: '12', category: SUP, icon: '🏋️' },
          { name: 'Press francés', reps: '10', category: SUP, icon: '💪' },
          { name: 'Giros rusos', reps: '12', category: MED, icon: '🌀' },
        ],
      },
      {
        name: 'Bloque 3',
        series: 3,
        exercises: [
          { name: 'Vuelos lat. en polea', reps: '8/8', category: SUP, icon: '🏋️' },
          { name: 'Bicep martillo c/mancuerna + isomet.', reps: '6/6', category: SUP, icon: '💪' },
          { name: 'Pasaje plancha alta/baja', reps: '12', category: MED, icon: '🧘' },
        ],
      },
      {
        name: 'Bloque 4',
        series: 3,
        exercises: [
          { name: 'Rompe cráneo en w', reps: '10', category: SUP, icon: '💪' },
          { name: 'Fly en banco', reps: '10', category: SUP, icon: '🏋️' },
          { name: 'Remo unilat c/m', reps: '8/8', category: SUP, icon: '🏋️' },
        ],
      },
    ],
  },
  {
    name: 'Día 2: Full Body',
    blocks: [
      {
        name: 'Movilidad',
        series: 3,
        exercises: [
          { name: 'Bicep c/ banda', reps: '10', category: MOV, icon: '🤸' },
          { name: 'Puente de glúteo', reps: '10', category: MOV, icon: '🤸' },
          { name: 'Apertura en estocada', reps: '10', category: MOV, icon: '🤸' },
        ],
      },
      {
        name: 'Bloque 1',
        series: 4,
        exercises: [
          { name: 'Press militar c/b', reps: '12-10-8-6', category: SUP, icon: '🏋️' },
          { name: 'Peso muerto c/m', reps: '10', category: INF, icon: '🏋️' },
          { name: 'Estocadas lat. c/m', reps: '6/6', category: INF, icon: '🦵' },
        ],
      },
      {
        name: 'Bloque 2',
        series: 3,
        exercises: [
          { name: 'Step up en hacka a 1p', reps: '8/8', category: INF, icon: '🦵' },
          { name: 'Press Arnold', reps: '12', category: SUP, icon: '🏋️' },
          { name: 'Sent. isométrica en pared', reps: '30"', category: INF, icon: '⏱️', time: 30 },
        ],
      },
      {
        name: 'Bloque 3',
        series: 3,
        exercises: [
          { name: 'Curl araña en inclinado', reps: '10', category: SUP, icon: '💪' },
          { name: 'Cruzados en polea p/pectorales', reps: '12', category: SUP, icon: '🏋️' },
          { name: 'Gemelos unilat. c/m', reps: '8/8', category: INF, icon: '🦵' },
        ],
      },
      {
        name: 'Bloque 4',
        series: 3,
        exercises: [
          { name: 'Fondos al cajón', reps: '10', category: SUP, icon: '💪' },
          { name: 'Sumo en prensa', reps: '10', category: INF, icon: '🦵' },
          { name: 'Floor press c/m', reps: '10', category: SUP, icon: '🏋️' },
        ],
      },
    ],
  },
  {
    name: 'Día 3: Tren Inferior + Zona Media',
    blocks: [
      {
        name: 'Movilidad',
        series: 3,
        exercises: [
          { name: 'Movilidad de cadera a 90°', reps: '10', category: MOV, icon: '🤸' },
          { name: 'Buenos días c/ pelota', reps: '10', category: MOV, icon: '🤸' },
          { name: 'Estiramiento del psoas', reps: '10', category: MOV, icon: '🤸' },
        ],
      },
      {
        name: 'Bloque 1',
        series: 4,
        exercises: [
          { name: 'Sent. c/b', reps: '12-10-8-6', category: INF, icon: '🦵' },
          { name: 'Abducciones c/disco', reps: '8/8', category: INF, icon: '🦵' },
        ],
      },
      {
        name: 'Bloque 2',
        series: 4,
        exercises: [
          { name: 'Peso muerto c/b', reps: '10-8-6-4', category: INF, icon: '🏋️' },
          { name: 'Estocadas caminando', reps: '10', category: INF, icon: '🦵' },
          { name: 'Sit ups', reps: '12', category: MED, icon: '🔥' },
        ],
      },
      {
        name: 'Bloque 3',
        series: 3,
        exercises: [
          { name: 'Subidas al cajón', reps: '10', category: INF, icon: '🦵' },
          { name: 'Gemelos en prensa', reps: '12', category: INF, icon: '🦵' },
          { name: 'Abs toque talón', reps: '12', category: MED, icon: '🔥' },
        ],
      },
      {
        name: 'Bloque 4',
        series: 3,
        exercises: [
          { name: 'Puente de glúteo a 1p', reps: '8/8', category: INF, icon: '🦵' },
          { name: 'Sent. copa c/m (disco en talones)', reps: '10', category: INF, icon: '🦵' },
          { name: 'Plancha alta toque adelante', reps: '6/6', category: MED, icon: '🧘' },
        ],
      },
    ],
  },
  {
    name: 'Día 4: Bonus Track!!',
    blocks: [
      {
        name: 'Movilidad',
        series: 3,
        exercises: [
          { name: 'Remo en trx', reps: '10', category: MOV, icon: '🤸' },
          { name: 'Sent. OH c/disco', reps: '10', category: MOV, icon: '🤸' },
          { name: 'Gato bueno/malo', reps: '10', category: MOV, icon: '🐈' },
        ],
      },
      {
        name: 'Bloque 1',
        series: 3,
        exercises: [
          { name: 'Remo c/b', reps: '10-8-6', category: SUP, icon: '🏋️' },
          { name: 'Curl bicep alt. c/m', reps: '8/8', category: SUP, icon: '💪' },
          { name: 'Búlgaras', reps: '8/8', category: INF, icon: '🦵' },
        ],
      },
      {
        name: 'Bloque 2',
        series: 4,
        exercises: [
          { name: 'Press en landmine unilat.', reps: '6/6', category: SUP, icon: '🏋️' },
          { name: 'Sillón de cuádriceps', reps: '10', category: INF, icon: '🦵' },
          { name: 'Abs OH c/disco', reps: '12', category: MED, icon: '🔥' },
        ],
      },
      {
        name: 'Bloque 3',
        series: 3,
        exercises: [
          { name: 'Aperturas inclinado c/m', reps: '12', category: SUP, icon: '🏋️' },
          { name: 'Prensa', reps: '10', category: INF, icon: '🦵' },
          { name: 'Abs in and out', reps: '12', category: MED, icon: '🔥' },
        ],
      },
      {
        name: 'Bloque 4',
        series: 3,
        exercises: [
          { name: 'Dominadas c/ banda', reps: 'Al fallo', category: SUP, icon: '🏋️' },
        ],
      },
    ],
  },
];

/**
 * Idempotent seed. Runs once on first launch to load the Sinapsis routine
 * into the local DB. Safe to call on every boot.
 */
export async function seedIfEmpty(): Promise<void> {
  const existing = await db.routines.count();
  if (existing > 0) {
    return;
  }

  // TODO(store): Remove this whole block to stop seeding the personal Sinapsis
  // routine when shipping to the store (see note on SINAPSIS_DAYS above).
  await db.transaction(
    'rw',
    db.routines,
    db.days,
    db.blocks,
    db.exercises,
    async () => {
      const routineId = await db.routines.add({
        name: 'Rutina Sinapsis Gym',
        frequency: '3 veces x sem + Bonus Track',
        isActive: true,
        draft: false,
        icon: '⚡',
        createdAt: Date.now(),
        finishedAt: null,
      });

      for (let d = 0; d < SINAPSIS_DAYS.length; d++) {
        const day = SINAPSIS_DAYS[d];
        const dayId = await db.days.add({
          routineId,
          name: day.name,
          order: d,
        });

        for (let b = 0; b < day.blocks.length; b++) {
          const block = day.blocks[b];
          const blockId = await db.blocks.add({
            dayId,
            name: block.name,
            order: b,
          });

          for (let e = 0; e < block.exercises.length; e++) {
            const ex = block.exercises[e];
            await db.exercises.add({
              blockId,
              name: ex.name,
              order: e,
              category: ex.category,
              icon: ex.icon ?? '🏋️',
              targetSeries: block.series,
              targetReps: ex.reps,
              isTimeBased: ex.time != null,
              targetTimeSeconds: ex.time ?? null,
            });
          }
        }
      }
    }
  );
}
