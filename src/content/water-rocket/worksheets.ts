export type WorksheetItem =
  | { key: string; type: 'info'; text: string; emoji?: string }
  | { key: string; type: 'text'; prompt: string; placeholder?: string; lines?: number }
  | { key: string; type: 'number'; prompt: string; unit?: string; placeholder?: string }
  | { key: string; type: 'choice'; prompt: string; options: string[]; answer?: number; explain?: string }
  | { key: string; type: 'checklist'; prompt: string; options: string[] }
  | { key: string; type: 'table'; prompt: string; columns: string[]; rows: number; prefill?: (string | null)[][] }
  | { key: string; type: 'rating'; prompt: string; max?: number }

export interface WorksheetSection {
  heading: string
  emoji?: string
  items: WorksheetItem[]
}

export interface Worksheet {
  id: string
  title: string
  emoji: string
  level: 'Explorer' | 'Builder' | 'Engineer'
  minutes: number
  summary: string
  intro: string
  cycleStep?: string
  sections: WorksheetSection[]
}

export const WORKSHEETS: Worksheet[] = [
  {
    id: 'rocket-detective',
    title: 'Rocket Detective: What makes it fly?',
    emoji: '🕵️',
    level: 'Explorer',
    minutes: 15,
    summary: 'Discover the push-and-push-back secret behind every rocket.',
    intro:
      'Watch the “Push Back!” animation in the Learn tab, then become a detective. Look for clues about WHY the rocket goes up.',
    cycleStep: 'ask',
    sections: [
      {
        heading: 'Clue 1: The push',
        emoji: '🔍',
        items: [
          { key: 'd1', type: 'choice', prompt: 'When the water shoots DOWN out of the nozzle, which way does the rocket go?', options: ['Down', 'Sideways', 'Up', 'It stays still'], answer: 2, explain: 'Every push has an equal push back the other way. Water down, rocket up!' },
          { key: 'd2', type: 'text', prompt: 'Have you ever felt a push-back like this? (Think: jumping off a skateboard, letting go of a balloon…)', lines: 3 },
        ],
      },
      {
        heading: 'Clue 2: The squeeze',
        emoji: '🫧',
        items: [
          { key: 'd3', type: 'choice', prompt: 'What does pumping air into the bottle do?', options: ['Makes the bottle lighter', 'Squeezes more air molecules into the same space', 'Cools the water down', 'Nothing'], answer: 1, explain: 'More molecules bumping into the walls = higher pressure. That pressure pushes the water out fast.' },
          { key: 'd4', type: 'text', prompt: 'Describe what the air molecules looked like in the “Squeeze the Air” animation when you pumped more.', lines: 3 },
        ],
      },
      {
        heading: 'Clue 3: Name the parts',
        emoji: '🧩',
        items: [
          { key: 'd5', type: 'table', prompt: 'Match each part to its job.', columns: ['Part', 'Its job'], rows: 4, prefill: [['Nose cone', null], ['Fins', null], ['Nozzle', null], ['Body (bottle)', null]] },
          { key: 'd6', type: 'rating', prompt: 'How confident do you feel explaining how a water rocket works?', max: 5 },
        ],
      },
    ],
  },
  {
    id: 'water-experiment',
    title: 'The Water Experiment',
    emoji: '💧',
    level: 'Builder',
    minutes: 25,
    summary: 'Too little water? Too much? Find the sweet spot.',
    intro:
      'Keep the pressure and angle the SAME every time. Only change the water. Use the Build and Launch tabs to test, and write the results here.',
    cycleStep: 'test',
    sections: [
      {
        heading: 'Before you start',
        emoji: '📝',
        items: [
          { key: 'w1', type: 'number', prompt: 'Pressure I will use every time', unit: 'psi' },
          { key: 'w2', type: 'number', prompt: 'Angle I will use every time', unit: '°' },
          { key: 'w3', type: 'text', prompt: 'My prediction: how much water will fly highest, and why?', lines: 3 },
        ],
      },
      {
        heading: 'Results',
        emoji: '📊',
        items: [
          { key: 'w4', type: 'table', prompt: 'Launch with each amount of water and record the results.', columns: ['Water (%)', 'Predicted height (m)', 'Actual height (m)', 'Flight time (s)'], rows: 6, prefill: [['0', null, null, null], ['20', null, null, null], ['35', null, null, null], ['50', null, null, null], ['65', null, null, null], ['80', null, null, null]] },
        ],
      },
      {
        heading: 'Think about it',
        emoji: '🧠',
        items: [
          { key: 'w5', type: 'number', prompt: 'Which water amount flew highest?', unit: '%' },
          { key: 'w6', type: 'choice', prompt: 'Why does TOO MUCH water make the rocket fly lower?', options: ['Water is heavy and there is less squeezed air to push it', 'Water leaks out', 'The bottle gets cold', 'The fins get wet'], answer: 0, explain: 'Water is the stuff being pushed out, but squeezed air is what does the pushing. Too much water = heavy rocket and not enough push.' },
          { key: 'w7', type: 'text', prompt: 'Was your prediction right? What surprised you?', lines: 3 },
        ],
      },
    ],
  },
  {
    id: 'pressure-power',
    title: 'Pressure Power',
    emoji: '💪',
    level: 'Builder',
    minutes: 20,
    summary: 'Does double the pressure mean double the height?',
    intro: 'Keep water and angle the same. Only change the pressure. Then look for a pattern in your numbers.',
    cycleStep: 'test',
    sections: [
      {
        heading: 'Setup',
        items: [
          { key: 'p1', type: 'number', prompt: 'Water I will use every time', unit: '%' },
          { key: 'p2', type: 'number', prompt: 'Angle I will use every time', unit: '°' },
          { key: 'p3', type: 'choice', prompt: 'Prediction: if I double the pressure, the height will…', options: ['Stay the same', 'Double exactly', 'Go up, but maybe not double', 'Go down'] },
        ],
      },
      {
        heading: 'Results',
        items: [
          { key: 'p4', type: 'table', prompt: 'Record your launches.', columns: ['Pressure (psi)', 'Height (m)', 'Top speed (m/s)'], rows: 5, prefill: [['20', null, null], ['40', null, null], ['60', null, null], ['80', null, null], ['100', null, null]] },
          { key: 'p5', type: 'text', prompt: 'Describe the pattern you see. Does each extra 20 psi add the same amount of height?', lines: 3 },
          { key: 'p6', type: 'info', emoji: '⚠️', text: 'Safety: real fizzy-drink bottles should never be pumped above the pressure your grown-up helper sets (often 40–60 psi). More pressure is NOT always better — and never safe without a launch cord and a safe distance.' },
        ],
      },
    ],
  },
  {
    id: 'angle-explorer',
    title: 'Angle Explorer',
    emoji: '📐',
    level: 'Builder',
    minutes: 20,
    summary: 'Which angle sends your rocket the furthest?',
    intro: 'Same water, same pressure, different angles. Discover why 45° is famous — and why rockets with drag like a little less.',
    cycleStep: 'test',
    sections: [
      {
        heading: 'Prediction',
        items: [{ key: 'a1', type: 'choice', prompt: 'Which angle do you think will go the FURTHEST along the ground?', options: ['30°', '45°', '60°', '90° (straight up)'] }],
      },
      {
        heading: 'Results',
        items: [
          { key: 'a2', type: 'table', prompt: 'Record height AND distance for each angle.', columns: ['Angle (°)', 'Height (m)', 'Distance (m)'], rows: 5, prefill: [['30', null, null], ['45', null, null], ['60', null, null], ['75', null, null], ['90', null, null]] },
          { key: 'a3', type: 'number', prompt: 'Best angle for DISTANCE', unit: '°' },
          { key: 'a4', type: 'number', prompt: 'Best angle for HEIGHT', unit: '°' },
          { key: 'a5', type: 'text', prompt: 'A friend wants to hit a target 30 m away. What advice would you give?', lines: 3 },
        ],
      },
    ],
  },
  {
    id: 'fair-test',
    title: 'Fair Test & Variables',
    emoji: '⚖️',
    level: 'Engineer',
    minutes: 15,
    summary: 'Change one thing. Measure one thing. Keep everything else the same.',
    intro: 'Scientists and engineers use fair tests so they know exactly what caused a change. Plan your own fair test here.',
    cycleStep: 'plan',
    sections: [
      {
        heading: 'Vocabulary',
        items: [
          { key: 'f1', type: 'choice', prompt: 'The ONE thing you change on purpose is called the…', options: ['Dependent variable', 'Independent variable', 'Controlled variable', 'Random variable'], answer: 1, explain: 'You are in charge of it — it is independent of the result.' },
          { key: 'f2', type: 'choice', prompt: 'The thing you MEASURE to see the effect is the…', options: ['Dependent variable', 'Independent variable', 'Controlled variable', 'Lucky variable'], answer: 0, explain: 'It depends on what you changed.' },
          { key: 'f3', type: 'choice', prompt: 'Things you keep the SAME every time are…', options: ['Dependent variables', 'Independent variables', 'Controlled variables', 'Boring variables'], answer: 2, explain: 'Controlling them makes the test fair.' },
        ],
      },
      {
        heading: 'My fair test plan',
        items: [
          { key: 'f4', type: 'text', prompt: 'My question (e.g. “Does a pointy nose make the rocket fly higher?”)', lines: 2 },
          { key: 'f5', type: 'text', prompt: 'I will CHANGE (independent variable):' },
          { key: 'f6', type: 'text', prompt: 'I will MEASURE (dependent variable):' },
          { key: 'f7', type: 'checklist', prompt: 'I will KEEP THE SAME (controlled variables):', options: ['Water amount', 'Pressure', 'Launch angle', 'Bottle size', 'Nose shape', 'Number of fins', 'Rocket weight'] },
          { key: 'f8', type: 'number', prompt: 'How many times will I repeat each test?', placeholder: '3' },
        ],
      },
    ],
  },
  {
    id: 'design-journal',
    title: 'Engineering Design Journal',
    emoji: '📓',
    level: 'Engineer',
    minutes: 30,
    summary: 'Go around the whole design cycle and record every step.',
    intro: 'Real engineers keep a journal. Fill in each stage as you go round the cycle: Ask → Imagine → Plan → Create → Test → Improve.',
    cycleStep: 'improve',
    sections: [
      {
        heading: '🤔 Ask',
        items: [{ key: 'j1', type: 'text', prompt: 'The challenge I chose (highest / furthest / hit the target) and the rules:', lines: 2 }],
      },
      {
        heading: '💡 Imagine',
        items: [{ key: 'j2', type: 'text', prompt: 'Three different ideas I had:', lines: 4 }],
      },
      {
        heading: '📝 Plan',
        items: [
          { key: 'j3', type: 'text', prompt: 'The idea I chose and why:', lines: 3 },
          { key: 'j4', type: 'text', prompt: 'My rocket settings (bottle, nose, fins, water, pressure, angle):', lines: 3 },
        ],
      },
      {
        heading: '🔧 Create',
        items: [{ key: 'j5', type: 'text', prompt: 'My rocket’s name and what it looks like:', lines: 2 }],
      },
      {
        heading: '🧪 Test',
        items: [{ key: 'j6', type: 'table', prompt: 'My flight log:', columns: ['Launch #', 'Height (m)', 'Distance (m)', 'Notes'], rows: 4, prefill: [['1', null, null, null], ['2', null, null, null], ['3', null, null, null], ['4', null, null, null]] }],
      },
      {
        heading: '📈 Improve',
        items: [
          { key: 'j7', type: 'text', prompt: 'What worked well?', lines: 2 },
          { key: 'j8', type: 'text', prompt: 'ONE change I will make next, and why I think it will help:', lines: 3 },
          { key: 'j9', type: 'number', prompt: 'How much better was version 2? (difference in metres)', unit: 'm' },
          { key: 'j10', type: 'rating', prompt: 'How proud are you of your rocket?', max: 5 },
        ],
      },
    ],
  },
  {
    id: 'safety-captain',
    title: 'Safety Captain Checklist',
    emoji: '🦺',
    level: 'Explorer',
    minutes: 10,
    summary: 'For the day you launch a REAL water rocket outside.',
    intro: 'Simulations are safe. Real launches need a Safety Captain. Could that be you? Tick every box before anyone pumps.',
    sections: [
      {
        heading: 'Before launch',
        items: [
          { key: 's1', type: 'checklist', prompt: 'Check each item:', options: ['A grown-up helper is with us', 'Everyone wears safety glasses', 'We use only fizzy-drink bottles (never water bottles or glass)', 'The bottle has no cracks or dents', 'The launch area is clear — 10 big steps back', 'Nobody stands over the rocket while pumping', 'We know the maximum safe pressure', 'We use a launch cord so nobody is near the rocket'] },
          { key: 's2', type: 'text', prompt: 'What will you shout before pulling the cord?', placeholder: '3… 2… 1… LAUNCH!' },
          { key: 's3', type: 'text', prompt: 'If a rocket does not launch after pulling the cord, what should you do? (Hint: wait, then let the grown-up release the pressure.)', lines: 3 },
        ],
      },
    ],
  },
]

export function findWorksheet(id: string | undefined) {
  return WORKSHEETS.find((w) => w.id === id)
}
