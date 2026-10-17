export interface CycleStep {
  id: string
  title: string
  emoji: string
  color: string
  bg: string
  question: string
  description: string
  inTheLab: string
  checklist: string[]
  link: { label: string; to: string }
}

/** The Engineering Design Cycle, written for kids. Based on the widely used Ask → Imagine → Plan → Create → Test → Improve loop. */
export const CYCLE_STEPS: CycleStep[] = [
  {
    id: 'ask',
    title: 'Ask',
    emoji: '🤔',
    color: '#845ec2',
    bg: 'bg-grape/15',
    question: 'What is the problem? What do we need?',
    description:
      'Engineers start by understanding the challenge. What should the rocket do: fly highest, fly furthest, or land on a target? What rules do we have to follow?',
    inTheLab: 'Pick a goal in the Launch tab: highest flight, longest distance, or hit the target ring.',
    checklist: ['I can say the goal in one sentence.', 'I know the rules (max pressure, bottle size).', 'I know how we will measure success.'],
    link: { label: 'Set a goal on the launch pad', to: '/workshops/water-rocket/launch' },
  },
  {
    id: 'imagine',
    title: 'Imagine',
    emoji: '💡',
    color: '#ffd93d',
    bg: 'bg-sun/25',
    question: 'What are ALL the ways we could do it?',
    description:
      'Brainstorm lots of ideas, even silly ones. More water or less? Pointy nose or round? Three fins or four? There is no wrong answer yet.',
    inTheLab: 'Play with every slider in the Build tab and watch the prediction numbers change.',
    checklist: ['I wrote down at least 3 different ideas.', 'I listened to a friend’s idea too.'],
    link: { label: 'Try ideas on the workbench', to: '/workshops/water-rocket/build' },
  },
  {
    id: 'plan',
    title: 'Plan',
    emoji: '📝',
    color: '#4cc9f0',
    bg: 'bg-skyblue/15',
    question: 'Which idea will we try first, and how?',
    description:
      'Choose one idea and draw it. Decide exactly what you will change (one thing at a time!) and what you will keep the same. That is called a fair test.',
    inTheLab: 'Use the “Fair Test” worksheet to choose one variable to change.',
    checklist: ['I chose ONE thing to change.', 'Everything else stays the same.', 'I predicted what will happen.'],
    link: { label: 'Open the Fair Test worksheet', to: '/workshops/water-rocket/worksheets/fair-test' },
  },
  {
    id: 'create',
    title: 'Create',
    emoji: '🔧',
    color: '#ff6b6b',
    bg: 'bg-rocket/15',
    question: 'Let’s build it!',
    description: 'Follow your plan and build the rocket. Give it a name. Save it so you can come back to it later.',
    inTheLab: 'Set the sliders to match your plan, name your rocket and press Save.',
    checklist: ['My rocket matches my plan.', 'I saved it with a name.'],
    link: { label: 'Build and save a rocket', to: '/workshops/water-rocket/build' },
  },
  {
    id: 'test',
    title: 'Test',
    emoji: '🧪',
    color: '#6bcb77',
    bg: 'bg-grass/20',
    question: 'Does it work? How well?',
    description:
      'Launch it and measure! Write the numbers in your flight log. Test more than once, because one launch can be lucky or unlucky.',
    inTheLab: 'Launch at least 3 times and save each result to your flight log.',
    checklist: ['I launched at least 3 times.', 'I wrote down height, distance and time.', 'I compared with my prediction.'],
    link: { label: 'Go to the launch pad', to: '/workshops/water-rocket/launch' },
  },
  {
    id: 'improve',
    title: 'Improve',
    emoji: '📈',
    color: '#ff9f43',
    bg: 'bg-orange-100',
    question: 'What could make it even better?',
    description:
      'Look at your results. What worked? What did not? Change one thing and go round the cycle again. Real engineers loop many, many times.',
    inTheLab: 'Open your rocket in the Hangar, change one setting, and test again.',
    checklist: ['I found one thing to change.', 'I can explain WHY I think it will help.', 'I went round the cycle again!'],
    link: { label: 'Open the Hangar', to: '/workshops/water-rocket/hangar' },
  },
]
