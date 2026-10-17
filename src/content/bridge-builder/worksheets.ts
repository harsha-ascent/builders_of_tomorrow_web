import type { Worksheet } from '../water-rocket/worksheets'

export const BRIDGE_WORKSHEETS: Worksheet[] = [
  {
    id: 'bridge-detective',
    title: 'Bridge Detective: Push or Pull?',
    emoji: '🕵️',
    level: 'Explorer',
    minutes: 15,
    summary: 'Every piece of a bridge is either being squashed or stretched. Find out which.',
    intro: 'Watch “Squash and Stretch” in the Learn tab, then look at any bridge in the Build tab: red pieces are pulled (tension), blue pieces are pushed (compression).',
    cycleStep: 'ask',
    sections: [
      {
        heading: 'Clue 1: Two kinds of force',
        emoji: '🔍',
        items: [
          { key: 'b1', type: 'choice', prompt: 'Stretching a piece is called…', options: ['Compression', 'Tension', 'Torsion', 'Friction'], answer: 1, explain: 'Tension pulls the ends apart, like a tug-of-war rope.' },
          { key: 'b2', type: 'choice', prompt: 'When you push on the ends of a long thin straw it suddenly bows sideways. That is called…', options: ['Melting', 'Buckling', 'Stretching', 'Bouncing'], answer: 1, explain: 'Buckling is how long thin pieces fail in compression, long before they are crushed.' },
          { key: 'b3', type: 'text', prompt: 'Name something at home that works in tension, and something that works in compression.', lines: 3 },
        ],
      },
      {
        heading: 'Clue 2: Look at a real truss',
        emoji: '🌉',
        items: [
          { key: 'b4', type: 'text', prompt: 'Load the Warren truss template. Which pieces are blue (pushed)? Top, bottom, or diagonals?', lines: 2 },
          { key: 'b5', type: 'text', prompt: 'Which pieces are red (pulled)?', lines: 2 },
          { key: 'b6', type: 'choice', prompt: 'A bridge with the triangles BELOW the road: is the road pushed or pulled?', options: ['Pushed (compression)', 'Pulled (tension)', 'Neither'], answer: 0, explain: 'Flip the truss and the forces flip too: the road becomes the top chord and gets squashed.' },
        ],
      },
    ],
  },
  {
    id: 'triangle-power',
    title: 'Triangle Power',
    emoji: '🔺',
    level: 'Explorer',
    minutes: 15,
    summary: 'Why do engineers love triangles so much?',
    intro: 'Play with “Why triangles?” in the Learn tab, then try to build a bridge WITHOUT triangles in the Build tab and see what the simulator says.',
    cycleStep: 'imagine',
    sections: [
      {
        heading: 'Shapes under pressure',
        items: [
          { key: 't1', type: 'choice', prompt: 'Push sideways on the top of a square frame with pin joints. What happens?', options: ['Nothing, squares are strong', 'It leans over into a parallelogram', 'It gets taller', 'It turns into a circle'], answer: 1, explain: 'The sides can swing about the joints: a square is a mechanism until you add a diagonal.' },
          { key: 't2', type: 'choice', prompt: 'Why can a triangle not change shape without a side changing length?', options: ['Because it has three sides', 'Because three lengths fix all three angles', 'Because glue is strong', 'Because it is pointy'], answer: 1, explain: 'Three side lengths completely decide a triangle. To bend it you must stretch or squash a side.' },
          { key: 't3', type: 'text', prompt: 'Build the “Flat beam” template and press Test. What message do you get, and what does it mean?', lines: 3 },
        ],
      },
      {
        heading: 'Triangle hunt',
        items: [
          { key: 't4', type: 'checklist', prompt: 'Where have you seen triangles holding things up?', options: ['Roof trusses', 'Bicycle frame', 'Cranes', 'Electricity pylons', 'Bridges', 'Shelf brackets', 'Tent poles'] },
          { key: 't5', type: 'rating', prompt: 'How confident are you about why triangles are strong?', max: 5 },
        ],
      },
    ],
  },
  {
    id: 'strongest-shape',
    title: 'The Strongest Shape Test',
    emoji: '🧪',
    level: 'Builder',
    minutes: 25,
    summary: 'Same material, same budget: which truss pattern holds the most?',
    intro: 'Use craft sticks for every template. Keep the load mode the same. Predict first, then test each one and fill in the table.',
    cycleStep: 'test',
    sections: [
      {
        heading: 'Predict',
        items: [
          { key: 's1', type: 'choice', prompt: 'Which pattern do you think will hold the MOST?', options: ['Warren (zig-zag)', 'Pratt', 'Howe', 'Under-deck', 'King post'] },
          { key: 's2', type: 'text', prompt: 'Why do you think so?', lines: 2 },
        ],
      },
      {
        heading: 'Test every template',
        items: [
          { key: 's3', type: 'table', prompt: 'Record the results from the Test tab.', columns: ['Pattern', 'Holds (kg)', 'Mass (g)', 'First piece to fail', 'How it failed'], rows: 5, prefill: [['Warren', null, null, null, null], ['Pratt', null, null, null, null], ['Howe', null, null, null, null], ['Under-deck', null, null, null, null], ['King post', null, null, null, null]] },
          { key: 's4', type: 'text', prompt: 'Was your prediction right? Which pattern won, and by how much?', lines: 3 },
          { key: 's5', type: 'choice', prompt: 'Almost every bridge failed by buckling. What is the best fix for a piece that buckles?', options: ['Make it longer', 'Make it thicker (double it up) or shorter', 'Paint it', 'Pull on it instead'], answer: 1, explain: 'Buckling strength grows with thickness cubed and drops with length squared. Shorter and thicker wins.' },
        ],
      },
    ],
  },
  {
    id: 'budget-engineer',
    title: 'Budget Engineer',
    emoji: '💰',
    level: 'Engineer',
    minutes: 30,
    summary: 'Hold the most weight for the fewest coins and the lightest bridge.',
    intro: 'Real engineers never have unlimited money or material. Your score is efficiency: how many times its own weight the bridge holds. Spend your coins where they matter.',
    cycleStep: 'improve',
    sections: [
      {
        heading: 'Where does the money go?',
        items: [
          { key: 'e1', type: 'number', prompt: 'Cost of your starting bridge', unit: 'coins' },
          { key: 'e2', type: 'number', prompt: 'How much does it hold?', unit: 'kg' },
          { key: 'e3', type: 'number', prompt: 'Efficiency score (holds × its own weight)', unit: '×' },
        ],
      },
      {
        heading: 'Improve, one change at a time',
        items: [
          { key: 'e4', type: 'table', prompt: 'Each row: change ONE thing (double a piece, remove a piece, swap a material, move a joint).', columns: ['Change I made', 'Holds (kg)', 'Mass (g)', 'Coins', 'Efficiency'], rows: 5 },
          { key: 'e5', type: 'text', prompt: 'Which change gave the biggest improvement for the fewest coins? Why?', lines: 3 },
          { key: 'e6', type: 'choice', prompt: 'A piece shows almost white (very low force) in the colour view. What should a budget engineer do with it?', options: ['Double it up', 'Consider removing or thinning it — it is barely working', 'Make it longer', 'Nothing'], answer: 1, explain: 'Pieces carrying almost no force add weight and cost but little strength. Just check the bridge is still not wobbly afterwards.' },
        ],
      },
    ],
  },
  {
    id: 'bridge-journal',
    title: 'Bridge Design Journal',
    emoji: '📓',
    level: 'Engineer',
    minutes: 30,
    summary: 'Go round the whole design cycle and record every step.',
    intro: 'Fill in each stage as you go round the cycle: Ask → Imagine → Plan → Create → Test → Improve.',
    cycleStep: 'improve',
    sections: [
      { heading: '🤔 Ask', items: [{ key: 'j1', type: 'text', prompt: 'The challenge (test mode, budget, materials):', lines: 2 }] },
      { heading: '💡 Imagine', items: [{ key: 'j2', type: 'text', prompt: 'Three shapes I considered and one thing I like about each:', lines: 4 }] },
      { heading: '📝 Plan', items: [{ key: 'j3', type: 'text', prompt: 'My chosen design, materials and which pieces I doubled:', lines: 3 }, { key: 'j4', type: 'number', prompt: 'Predicted load', unit: 'kg' }] },
      { heading: '🔧 Create', items: [{ key: 'j5', type: 'text', prompt: 'My bridge’s name and what made it tricky to build:', lines: 2 }] },
      { heading: '🧪 Test', items: [{ key: 'j6', type: 'table', prompt: 'Test log:', columns: ['Version', 'Holds (kg)', 'First to fail', 'Sag (mm)', 'Efficiency'], rows: 4, prefill: [['1', null, null, null, null], ['2', null, null, null, null], ['3', null, null, null, null], ['4', null, null, null, null]] }] },
      {
        heading: '📈 Improve',
        items: [
          { key: 'j7', type: 'text', prompt: 'What was the weakest link each time, and how did you fix it?', lines: 3 },
          { key: 'j8', type: 'number', prompt: 'How much stronger is the final bridge than version 1?', unit: 'kg' },
          { key: 'j9', type: 'rating', prompt: 'How proud are you of your bridge?', max: 5 },
        ],
      },
    ],
  },
  {
    id: 'bridge-math',
    title: 'Bridge Math Challenge',
    emoji: '🧮',
    level: 'Engineer',
    minutes: 30,
    summary: 'For ages 12+: work out buckling loads and member forces by hand, then check with the simulator.',
    intro: 'Open “The Math” tab. You will need a calculator. Use g = 9.81 m/s² and the material numbers from the Math tab.',
    cycleStep: 'plan',
    sections: [
      {
        heading: 'Step 1: Euler buckling',
        emoji: '📏',
        items: [
          { key: 'bm1', type: 'number', prompt: 'Length of your longest pushed (blue) piece', unit: 'cm' },
          { key: 'bm2', type: 'number', prompt: 'Buckling load P = π² × E × I ÷ L² (convert cm to m first!)', unit: 'N' },
          { key: 'bm3', type: 'number', prompt: 'If you halve the length, how many times bigger is the buckling load?', unit: '×' },
          { key: 'bm4', type: 'choice', prompt: 'Gluing two sticks face to face doubles the thickness. The buckling load becomes about…', options: ['2 × bigger', '4 × bigger', '8 × bigger', 'The same'], answer: 2, explain: 'I grows with thickness cubed: 2³ = 8.' },
        ],
      },
      {
        heading: 'Step 2: A king post by hand',
        emoji: '⛺',
        items: [
          { key: 'bm5', type: 'info', emoji: '💡', text: 'King post: two sloping pieces from the cliffs meet at a peak above the middle of the road. A load W hangs from the middle. By symmetry each sloping piece carries W ÷ (2 sin θ), where θ is its angle to the road.' },
          { key: 'bm6', type: 'number', prompt: 'Angle θ of the sloping piece for a peak 15 cm high over a 40 cm gap (tan θ = 15 ÷ 20)', unit: '°' },
          { key: 'bm7', type: 'number', prompt: 'With W = 50 N, force in each sloping piece = 50 ÷ (2 sin θ)', unit: 'N' },
          { key: 'bm8', type: 'text', prompt: 'Is the sloping piece pushed or pulled? Is the road piece pushed or pulled? Check against the colours in the Build tab.', lines: 3 },
        ],
      },
      {
        heading: 'Think bigger',
        emoji: '🧠',
        items: [
          { key: 'bm9', type: 'text', prompt: 'A taller truss makes the top and bottom forces smaller but the pieces longer. Explain the trade-off using the buckling formula.', lines: 4 },
          { key: 'bm10', type: 'rating', prompt: 'How confident are you with these equations now?', max: 5 },
        ],
      },
    ],
  },
]

export function findBridgeWorksheet(id: string | undefined) {
  return BRIDGE_WORKSHEETS.find((w) => w.id === id)
}
