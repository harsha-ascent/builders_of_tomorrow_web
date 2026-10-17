import type { Assumption } from './assumptions'

export const BRIDGE_ASSUMPTIONS: Assumption[] = [
  {
    id: 'pins',
    title: 'Every joint is a perfect pin',
    assume: 'Pieces only push or pull along their length; joints cannot pass on any bending.',
    reality: 'Glued joints are a bit stiff, which usually helps a little — but a blob of glue is also where real bridges tear apart.',
    effect: 'medium',
  },
  {
    id: 'glue',
    title: 'Tension strength is set by the glue joint, not the material',
    assume: 'A craft stick joint lets go at about 150 N (15 kg) of pull; a straw tape joint at 40 N.',
    reality: 'Joint strength varies hugely with glue type, overlap and drying time. Sloppy joints halve these numbers.',
    effect: 'large',
  },
  {
    id: 'euler',
    title: 'Pushed pieces fail by Euler buckling with pinned ends',
    assume: 'P = π²EI/L², capped at the crushing load. Laminating doubles thickness, so I grows eight-fold.',
    reality: 'Real pieces are slightly bent to start with, so they buckle 10–30 % earlier than the formula says.',
    effect: 'medium',
  },
  {
    id: 'linear',
    title: 'Everything is linear until the first piece fails',
    assume: 'Double the load, double every force and deflection. The first failure ends the test.',
    reality: 'A real bridge sometimes survives the first crack as neighbours take over the load — or collapses in a chain reaction.',
    effect: 'medium',
  },
  {
    id: '2d',
    title: 'Two identical flat trusses, loaded evenly',
    assume: 'The 3-D bridge is two copies of your 2-D drawing, each carrying half the load. No twisting.',
    reality: 'A load that sits off-centre or a truss that leans makes one side work harder.',
    effect: 'medium',
  },
  {
    id: 'supports',
    title: 'Left end pinned, right end free to slide',
    assume: 'The classic textbook support: one end cannot move, the other can roll sideways.',
    reality: 'Bridges wedged tight between two tables get extra arch-like strength; bridges that can slip off a table get none.',
    effect: 'small',
  },
  {
    id: 'selfweight',
    title: 'Self-weight is included as small loads at each joint',
    assume: 'Half of every piece’s weight hangs from each of its ends.',
    reality: 'Close enough; model bridges weigh grams and hold kilograms.',
    effect: 'small',
  },
  {
    id: 'deck',
    title: 'The road only carries load at its joints',
    assume: 'A truck between two joints shares its weight between them by the lever rule.',
    reality: 'Real decking also bends between joints; thin decks can fail before the truss does.',
    effect: 'small',
  },
]

export const BRIDGE_ACCURACY_NOTE =
  'Model-bridge results are mostly about the joints. Expect real bridges to hold anywhere from half to about the same as the simulator, depending on how carefully they are glued.'
