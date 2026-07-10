1. Documento de Flujo de Usuario (Dev Handoff)
Proyecto: Bloque

Estado: Prototipado Visual (SVG Integrado)

Temática Visual: Modo Oscuro de Alto Rendimiento (Slate + Esmeralda)

🧭 Arquitectura de Navegación General
La aplicación utiliza una Bottom Navigation Bar con 3 pestañas globales fijas:

[🏠 Inicio] | [🏋️ Mi Rutina] | [📊 Progreso]

🕹️ Detalle de Flujo por Pantalla
PANTALLA 1: Inicio (Dashboard Principal)
Trigger de Entrada: Apertura de la app o clic en tab 🏠.

Componentes:

Header: Saludo personalizado dinámico.

Weekly Tracker: Fila de 5 burbujas de asistencia semanal (L, M, M, J, V, S) adaptada a frecuencia de 3 días + Bonus Track. Estados: Hecho (🟢 + check), Hoy (borde esmeralda animado), Pendiente (gris oscuro).

Quick Start Card: Tarjeta destacada con borde esmeralda que indica el día de entrenamiento correspondiente (Ej: Día 1). Contiene botón gigante: 🚀 EMPEZAR SESIÓN NOW.

Trigger de Salida: Al hacer clic en el botón de la tarjeta, redirige directamente a la Pantalla 3 (Modo Entrenamiento Activo) del día correspondiente.

PANTALLA 2: Mi Rutina (Selector de Planes y Días)
Trigger de Entrada: Clic en tab 🏋️ desde la barra inferior o botón "Atrás" desde un entrenamiento.

Sub-nivel 2.1: Lista de Rutinas Históricas

Muestra una lista de tarjetas horizontales con las rutinas cargadas (Ej: "Rutina Sinapsis Gym").

La rutina activa lleva un tag EN PROGRESO con opacidad verde.

Al hacer clic en la tarjeta activa, avanza al Sub-nivel 2.2.

Sub-nivel 2.2: Distribución Semanal de Días

Desglose de tarjetas por cada día del PDF de Sinapsis: DÍA 1: Tren Superior, DÍA 2: Full Body, DÍA 3: Tren Inferior y DÍA 4: BONUS TRACK!!.

Al hacer clic en cualquier día, abre la Pantalla 3 (Modo Entrenamiento Activo) de ese día específico.

PANTALLA 3: Modo Entrenamiento Activo (Ejecución)
Trigger de Entrada: Desde el Quick Start de Home o seleccionando un Día en la pestaña Mi Rutina.

Lógica de Interacción de las Cards de Ejercicio:

Agrupación: Las tarjetas de ejercicios se agrupan dentro de contenedores visuales llamados 📦 BLOQUE X (respetando las biseries/circuitos del PDF original).

Mecánica de Series (Pips Táctiles): En lugar de checkboxes, cada tarjeta tiene una cuadrícula de botones para marcar las series necesarias (Ej: 4 series para la pirámide 10-8-6-4).

Estados de Serie por Clic:

Toque simple en Serie: Pasa de Inactivo (gris/blanco) a Completado (fondo esmeralda, texto oscuro).

Siguiente Serie: El foco visual (borde esmeralda activo) se mueve automáticamente a la siguiente serie del ejercicio.

Estado de Tarjeta Completa: Al marcar la última serie del ejercicio, toda la tarjeta reduce su opacidad al 60% y se le activa un borde de 2px sólido esmeralda (#10B981).

Ejercicios de Tiempo (Ej: Plancha Baja / Isométricos): En lugar de pips de peso, la tarjeta incluye un botón integrado [▶️ Iniciar X"]. Al finalizar la cuenta regresiva, el dispositivo emite feedback háptico (vibración) y marca la serie como completada automáticamente.

Modificación de Cargas: Cada tarjeta activa incluye un botón secundario ⚖️ Modificar peso. Al accionarlo, levanta un panel inferior (BottomSheet) con un selector de rueda digital de paso +2.5kg / -2.5kg.

PANTALLA 4: Progreso (Módulo de Analíticas)
Trigger de Entrada: Clic en tab 📊.

Componentes:

Buscador: Input nativo superior con filtro reactivo de texto.

Lista: Tarjetas simples agrupadas por categorías (TREN SUPERIOR, TREN INFERIOR, ZONA MEDIA) mostrando el ejercicio y su récord histórico absoluto registrado.

Vista Detalle (Clic en Ejercicio): Abre pantalla con fila horizontal de chips filtrables por repetición (12 reps, 10 reps, 8 reps, 6 reps). Abajo renderiza un gráfico de líneas vectoriales con la curva ascendente de cargas y un feed cronológico con las fechas de los pesajes.


Nota Técnica para los Devs: Estructura de la DB Local
Para ayudarlos a arrancar con la base de datos local (Client-Side), diles que la estructura relacional básica en memoria/local de la app debería seguir este esquema en inglés:

Routines Table: id, name (ej: "Sinapsis Gym"[cite: 1]), is_active (boolean), created_at.

Days Table: id, routine_id, name (ej: "Día 1: Tren Superior"[cite: 1]), order.

Blocks Table: id, day_id, name (ej: "Bloque 1"[cite: 1]), order.

Exercises Table: id, block_id, name (ej: "Press plano c/barra"[cite: 1]), target_series (int), target_reps (string, ej: "10-8-6-4"[cite: 1]), is_time_based (boolean), target_time_seconds (int).

WorkoutLogs Table (El Historial): id, exercise_id, date, series_index (int), weight_lifted (float), reps_completed (int).