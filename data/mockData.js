export const issuesData = [
  {
    id: 1,
    title: 'Pothole on Main St',
    description: 'A deep pothole near the intersection of Main St and 2nd Ave. Multiple cars have been damaged. Needs urgent repair before monsoon season.',
    location: 'Downtown, Main St & 2nd Ave',
    votes: 234,
    category: 'Roads',
    urgency: 'high',
    impact: 'high',
    status: 'Open',
    authorId: 'community_user_1',
    authorName: 'Sarah M.',
    createdAt: '2026-05-08T10:30:00.000Z',
    solvers: [],
    comments: [
      { id: 'c1', authorId: 'community_user_2', authorName: 'Alex K.', text: 'I almost blew a tire here yesterday. Very dangerous!', createdAt: '2026-05-08T14:20:00.000Z' },
      { id: 'c2', authorId: 'community_user_3', authorName: 'Marcus T.', text: 'Reported to the city council as well. Lets keep upvoting.', createdAt: '2026-05-09T09:15:00.000Z' }
    ]
  },
  {
    id: 2,
    title: 'Broken Traffic Light',
    description: 'The traffic light at the 5th Ave crossing has been blinking red for 3 days straight. Causing major congestion during rush hour.',
    location: '5th Ave & Park Blvd',
    votes: 156,
    category: 'Safety',
    urgency: 'critical',
    impact: 'critical',
    status: 'In Progress',
    authorId: 'community_user_2',
    authorName: 'Alex K.',
    createdAt: '2026-05-06T08:00:00.000Z',
    solvers: ['community_user_4'],
    comments: [
      { id: 'c3', authorId: 'community_user_4', authorName: 'Elena R.', text: 'I contacted the traffic department. They said a crew is scheduled for this week.', createdAt: '2026-05-07T11:00:00.000Z' }
    ]
  },
  {
    id: 3,
    title: 'Debris on Park Road',
    description: 'Fallen tree branches and construction debris blocking half the walking path near the Central Park entrance. Pedestrians are forced onto the road.',
    location: 'Central Park, North Entrance',
    votes: 89,
    category: 'Environment',
    urgency: 'medium',
    impact: 'medium',
    status: 'Open',
    authorId: 'community_user_3',
    authorName: 'Marcus T.',
    createdAt: '2026-05-09T16:45:00.000Z',
    solvers: [],
    comments: []
  },
  {
    id: 4,
    title: 'Water Leak on Oak Street',
    description: 'A slow but persistent water leak from an underground pipe. The sidewalk has been wet for a week and is getting slippery.',
    location: 'Oak Street, near #42',
    votes: 45,
    category: 'Infrastructure',
    urgency: 'low',
    impact: 'low',
    status: 'Open',
    authorId: 'community_user_5',
    authorName: 'David L.',
    createdAt: '2026-05-10T12:00:00.000Z',
    solvers: [],
    comments: []
  },
];

export const userData = {
  name: 'Jane Doe',
  initials: 'JD',
  title: 'Community Impact Hero 🌟',
  score: 2450,
  rank: 42,
  stats: [
    { icon: '✅', label: 'Solved', value: '8' },
    { icon: '🤝', label: 'Supported', value: '24' },
    { icon: '🔥', label: 'Streak', value: '5d' },
  ],
  achievements: [
    { emoji: '💧', name: 'Water Warrior', desc: 'Solved 3 water issues' },
    { emoji: '🛣️', name: 'Street Savior', desc: 'Solved 5 road issues' },
    { emoji: '⭐', name: 'Rising Star', desc: 'Top 100 solver' },
  ]
};
