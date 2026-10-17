export interface Workshop {
  slug: string
  title: string
  emoji: string
  tagline: string
  description: string
  ages: string
  status: 'live' | 'soon'
  accent: string
  path: string
  skills: string[]
}

export const WORKSHOPS: Workshop[] = [
  {
    slug: 'water-rocket',
    title: 'Water Rocket Lab',
    emoji: '🚀',
    tagline: 'Design it. Pump it. Launch it. Make it better.',
    description:
      'Discover how squeezed air and a splash of water can shoot a bottle higher than a house. Build your own rocket in 3-D, test it on the launch pad, and work like a real engineer.',
    ages: 'Ages 8 – 14',
    status: 'live',
    accent: 'from-skyblue to-grape',
    path: '/workshops/water-rocket',
    skills: ['Forces & motion', 'Air pressure', 'Fair tests', 'Engineering design cycle'],
  },
  {
    slug: 'paper-plane-wind-tunnel',
    title: 'Paper Plane Wind Tunnel',
    emoji: '✈️',
    tagline: 'Fold, fly, and find out why wings work.',
    description: 'Shape wings and test them in a virtual wind tunnel to learn about lift and drag.',
    ages: 'Ages 8 – 12',
    status: 'soon',
    accent: 'from-sun to-rocket',
    path: '#',
    skills: ['Lift & drag', 'Shapes', 'Measurement'],
  },
  {
    slug: 'bridge-builder',
    title: 'Bridge Builder',
    emoji: '🌉',
    tagline: 'Glue sticks into triangles. Then load it until it creaks.',
    description:
      'Design a model bridge from craft sticks, straws, balsa or spaghetti, then watch a 3-D load test find the weakest piece. Learn why triangles rule and how engineers do more with less.',
    ages: 'Ages 9 – 14',
    status: 'live',
    accent: 'from-grass to-skyblue',
    path: '/workshops/bridge-builder',
    skills: ['Tension & compression', 'Triangles', 'Buckling', 'Budgets & efficiency'],
  },
  {
    slug: 'solar-oven',
    title: 'Solar Oven',
    emoji: '☀️',
    tagline: 'Cook with sunshine.',
    description: 'Angle mirrors, pick materials and bake a virtual s’more using only the Sun.',
    ages: 'Ages 8 – 12',
    status: 'soon',
    accent: 'from-sun to-grass',
    path: '#',
    skills: ['Heat & light', 'Materials', 'Angles'],
  },
]
