// Demo content shown when Supabase isn't configured (local dev, preview
// builds), so every site renders with something real-looking. Fictional people
// and projects; the live sites read from the database instead.
import type {
  CreditView, Division, Media, Moment, Opening, Person, PodcastEpisode, Project, PressKit, Trivia,
} from './types';

const ORG = 'demo-org';
const now = '2026-11-01T12:00:00Z';

export const demoDivisions: Division[] = [
  { id: 'd-prod', org_id: ORG, slug: 'productions', name: 'Northem Productions', tagline: 'The parts of people nobody films.', description: 'Films, documentaries and commercials about the people at the edge of the frame.', theme: {}, sort: 1, is_public: true },
  { id: 'd-dev', org_id: ORG, slug: 'development', name: 'Northem Development', tagline: 'Tools that get out of the way.', description: 'Websites, apps, tools and platforms, many of them built for filmmakers.', theme: {}, sort: 2, is_public: true },
  { id: 'd-spec', org_id: ORG, slug: 'specprod', name: 'Specprod', tagline: 'Shots from places cameras should not go.', description: 'Specialist crews for storms, volcanoes, glaciers and minus thirty.', theme: {}, sort: 3, is_public: true },
  { id: 'd-so', org_id: ORG, slug: 'sonorthem', name: 'SoNorthem', tagline: 'Made for the feed, built to last.', description: 'Social-first series, formats and channels that people actually follow.', theme: {}, sort: 4, is_public: true },
];

const P = (p: Partial<Project> & Pick<Project, 'id' | 'slug' | 'title' | 'division_id' | 'kind'>): Project => ({
  org_id: ORG, status: 'released', logline: null, synopsis: null, year: 2026, release_date: null, runtime_minutes: null,
  locations: [], genres: [], poster_url: null, cover_url: null, trailer_url: null, client: null, visibility: 'public',
  published_at: now, theme_id: null, theme_overrides: {}, page_blocks: [], stats: {}, created_by: null,
  created_at: now, updated_at: now, ...p,
});

export const demoProjects: Project[] = [
  P({ id: 'p1', slug: 'white-silence', title: 'White Silence', division_id: 'd-spec', kind: 'feature', status: 'post_production', year: 2026,
      logline: 'A climber, a camera and nineteen days at minus thirty-one.', runtime_minutes: 94, locations: ['Svalbard', 'Lyngen Alps'], genres: ['Adventure', 'Documentary'],
      synopsis: 'We followed Ada up an unclimbed north face through the polar night. The cameras froze, the batteries died in pockets, and the story that came back was not the one we planned to tell.',
      stats: { 'Coldest day': '−31 °C', 'Batteries lost': 41, 'Days on the wall': 19, 'Frozen lenses': 7 },
      theme_overrides: { accent: '#9fd8ff', texture: 'frost' } }),
  P({ id: 'p2', slug: 'ash-line', title: 'Ash Line', division_id: 'd-spec', kind: 'commercial', year: 2025, client: 'Outdoor brand',
      logline: 'A forty-second spot shot two hundred metres from flowing lava.', locations: ['Reykjanes, Iceland'], genres: ['Commercial'],
      synopsis: 'Gas masks, heat shields on the drone and a six-minute window between wind shifts.',
      stats: { 'Closest to lava': '18 m', 'Drone props melted': 3, 'Takes': 11 }, theme_overrides: { accent: '#ff6a2b', texture: 'ash' } }),
  P({ id: 'p3', slug: 'eye-of-the-low', title: 'Eye of the Low', division_id: 'd-spec', kind: 'short', year: 2025,
      logline: 'Chasing a hurricane-force low along the Lofoten coast.', locations: ['Lofoten'], stats: { 'Peak gust': '41 m/s' } }),
  P({ id: 'p4', slug: 'nattevakt', title: 'Nattevakt', division_id: 'd-prod', kind: 'documentary', year: 2026,
      logline: 'The people who keep a city running while it sleeps.', runtime_minutes: 72, genres: ['Documentary'], locations: ['Oslo'],
      synopsis: 'Bus drivers, night nurses, bakers and a man who has cleaned the same tunnel for thirty years. One night, six lives, no narrator.',
      stats: { 'Nights filmed': 38, 'Cups of coffee': '∞' } }),
  P({ id: 'p5', slug: 'saltvann', title: 'Saltvann', division_id: 'd-prod', kind: 'short', year: 2025, runtime_minutes: 17,
      logline: 'A fisherman teaches his daughter the boat he is about to sell.', genres: ['Drama'], locations: ['Senja'] }),
  P({ id: 'p6', slug: 'screenplay-studio', title: 'Screenplay Studio', division_id: 'd-dev', kind: 'platform', status: 'live', year: 2024,
      logline: 'Free screenwriting and pre-production suite.', trailer_url: null, stats: { 'Platforms': 'Web, desktop, mobile' } }),
  P({ id: 'p7', slug: 'graphite', title: 'Graphite', division_id: 'd-dev', kind: 'app', status: 'live', year: 2025, logline: 'Linked notes and databases for teams.' }),
  P({ id: 'p8', slug: 'micron', title: 'Micron', division_id: 'd-dev', kind: 'app', status: 'beta', year: 2026, logline: 'Parametric CAD for 3D printing, for the Mac.' }),
  P({ id: 'p9', slug: '30-days-north', title: '30 Days North', division_id: 'd-so', kind: 'social', status: 'production', year: 2026,
      logline: 'One creator, one month, travelling north until the road ends.', stats: { 'Episodes': 30, 'Avg. watch time': '71%' } }),
  P({ id: 'p10', slug: 'frost-fridays', title: 'Frost Fridays', division_id: 'd-so', kind: 'social', status: 'live', year: 2025, logline: 'A weekly cold-weather experiment, filmed vertical.' }),
];

export const demoPeople: Person[] = [
  { id: 'pe1', org_id: ORG, slug: 'ada-lien', name: 'Ada Lien', known_for: 'Climber, lead', bio: 'Climbs things in the dark. Has never once been warm on a shoot.', photo_url: null, links: [], profile_id: null, is_public: true },
  { id: 'pe2', org_id: ORG, slug: 'jonas-hagen', name: 'Jonas Hagen', known_for: 'Director', bio: 'Makes films about people who would never ask to be in one.', photo_url: null, links: [], profile_id: null, is_public: true },
  { id: 'pe3', org_id: ORG, slug: 'mira-solberg', name: 'Mira Solberg', known_for: 'Cinematographer', bio: 'Shoots in places where the camera needs a sleeping bag.', photo_url: null, links: [], profile_id: null, is_public: true },
  { id: 'pe4', org_id: ORG, slug: 'emil-dahl', name: 'Emil Dahl', known_for: 'Drone pilot', bio: 'Has melted three propellers and regrets none of them.', photo_url: null, links: [], profile_id: null, is_public: true },
  { id: 'pe5', org_id: ORG, slug: 'sara-nyborg', name: 'Sara Nyborg', known_for: 'Sound', bio: 'Records the wind so you can hear the people.', photo_url: null, links: [], profile_id: null, is_public: true },
  { id: 'pe6', org_id: ORG, slug: 'liv-aas', name: 'Liv Aas', known_for: 'Producer', bio: 'Keeps everyone alive, fed, insured and roughly on schedule.', photo_url: null, links: [], profile_id: null, is_public: true },
];

const credit = (id: string, project_id: string, person: string, department: string, job: string, billing: number, extra: Partial<CreditView> = {}): CreditView => {
  const pe = demoPeople.find((x) => x.id === person)!;
  return { id, project_id, person_id: person, department, job, character_name: null, billing, note: null, is_public: true,
    person: { id: pe.id, slug: pe.slug, name: pe.name, photo_url: pe.photo_url, known_for: pe.known_for, profile_id: pe.profile_id }, ...extra };
};

export const demoCredits: CreditView[] = [
  credit('c1', 'p1', 'pe2', 'directing', 'Director', 1),
  credit('c2', 'p1', 'pe1', 'cast', 'Herself', 2, { character_name: 'Herself' }),
  credit('c3', 'p1', 'pe3', 'camera', 'Cinematographer', 3),
  credit('c4', 'p1', 'pe4', 'drone', 'Drone pilot', 4),
  credit('c5', 'p1', 'pe5', 'sound', 'Sound recordist', 5, { note: 'and chief snow-melter' }),
  credit('c6', 'p1', 'pe6', 'producing', 'Producer', 6),
  credit('c7', 'p2', 'pe3', 'camera', 'Cinematographer', 1),
  credit('c8', 'p2', 'pe4', 'drone', 'Drone pilot', 2),
  credit('c9', 'p4', 'pe2', 'directing', 'Director', 1),
  credit('c10', 'p4', 'pe5', 'sound', 'Sound', 2),
  credit('c11', 'p5', 'pe2', 'writing', 'Writer', 1),
  credit('c12', 'p5', 'pe6', 'producing', 'Producer', 2),
  credit('c13', 'p9', 'pe1', 'cast', 'Host', 1),
  credit('c14', 'p3', 'pe3', 'camera', 'Camera', 1),
];

export const demoTrivia: Trivia[] = [
  { id: 't1', project_id: 'p1', kind: 'trivia', body: 'Batteries rode inside the crew\'s sleeping bags every night. Two of them still have the dents.', person_id: null, sort: 1, is_public: true },
  { id: 't2', project_id: 'p1', kind: 'goof', body: 'In the summit shot you can see a thermos lid rolling off the ledge. It was never found.', person_id: null, sort: 2, is_public: true },
  { id: 't3', project_id: 'p1', kind: 'quote', body: '"If you can feel your fingers, you are not high enough yet."', person_id: 'pe1', sort: 3, is_public: true },
  { id: 't4', project_id: 'p1', kind: 'confession', body: 'The "wolf" in the night scene was Emil in a down jacket.', person_id: 'pe4', sort: 4, is_public: true },
  { id: 't5', project_id: 'p2', kind: 'fun_fact', body: 'The lava was hot enough to warm our lunch. We did not try.', person_id: null, sort: 1, is_public: true },
  { id: 't6', project_id: 'p4', kind: 'trivia', body: 'Every interview was recorded between 01:00 and 05:00.', person_id: null, sort: 1, is_public: true },
];

export const demoMedia: Media[] = [
  { id: 'm1', project_id: 'p1', kind: 'bts', storage_path: null, external_url: 'demo:frost-1', caption: 'Base camp, day 4', story: 'The tent poles snapped at −28. We fixed them with gaffer tape and stubbornness.', taken_at: '2026-01-14', location: 'Lyngen', sort: 1, is_public: true, uploaded_by: null, created_at: now },
  { id: 'm2', project_id: 'p1', kind: 'still', storage_path: null, external_url: 'demo:frost-2', caption: 'The north face at 11:00, which is still night', story: null, taken_at: '2026-01-16', location: 'Lyngen', sort: 2, is_public: true, uploaded_by: null, created_at: now },
  { id: 'm3', project_id: 'p1', kind: 'blooper', storage_path: null, external_url: 'demo:blooper-1', caption: 'Mira vs. the frozen tripod, round 3', story: 'The tripod won.', taken_at: '2026-01-18', location: null, sort: 3, is_public: true, uploaded_by: null, created_at: now },
  { id: 'm4', project_id: 'p1', kind: 'blooper', storage_path: null, external_url: 'demo:blooper-2', caption: 'Slate frozen to the clapper', story: null, taken_at: null, location: null, sort: 4, is_public: true, uploaded_by: null, created_at: now },
  { id: 'm5', project_id: 'p2', kind: 'bts', storage_path: null, external_url: 'demo:ash-1', caption: 'Gas masks on, coffee off', story: null, taken_at: null, location: 'Reykjanes', sort: 1, is_public: true, uploaded_by: null, created_at: now },
  { id: 'm6', project_id: 'p4', kind: 'still', storage_path: null, external_url: 'demo:night-1', caption: 'Tunnel, 03:12', story: null, taken_at: null, location: 'Oslo', sort: 1, is_public: true, uploaded_by: null, created_at: now },
];

export const demoMoments: Moment[] = [
  { id: 'mo1', project_id: 'p1', happened_on: '2026-01-10', title: 'We land in the dark', body: 'Polar night. The sun will not rise for another three weeks.', mood: '🌑', media_ids: [], is_public: true },
  { id: 'mo2', project_id: 'p1', happened_on: '2026-01-15', title: 'First attempt, turned back', body: 'Wind at 25 m/s on the ridge. Nobody argued.', mood: '🌬️', media_ids: [], is_public: true },
  { id: 'mo3', project_id: 'p1', happened_on: '2026-01-28', title: 'Summit', body: 'Ada topped out at 13:40 in blue twilight. The camera kept rolling for eleven seconds before it froze.', mood: '🏔️', media_ids: [], is_public: true },
];

export const demoPodcasts: PodcastEpisode[] = [
  { id: 'pod1', org_id: ORG, project_id: 'p1', title: 'Nineteen days at minus thirty-one', description: 'Jonas and Ada on what the cold does to a story.', source: 'spotify', storage_path: null, external_url: 'https://open.spotify.com/', duration_seconds: 3120, episode_number: 12, cover_url: null, published_at: now, is_public: true },
  { id: 'pod2', org_id: ORG, project_id: 'p1', title: 'Bloopers you can only hear', description: 'Sara plays the outtakes from the sound bags.', source: 'youtube', storage_path: null, external_url: 'https://www.youtube.com/', duration_seconds: 1860, episode_number: 13, cover_url: null, published_at: now, is_public: true },
  { id: 'pod3', org_id: ORG, project_id: 'p4', title: 'Who is awake at 3 am?', description: 'Making Nattevakt, one night shift at a time.', source: 'spotify', storage_path: null, external_url: 'https://open.spotify.com/', duration_seconds: 2700, episode_number: 9, cover_url: null, published_at: now, is_public: true },
];

export const demoOpenings: Opening[] = [
  { id: 'o1', org_id: ORG, division_id: 'd-spec', project_id: null, kind: 'crew', title: 'Cold-weather camera assistant', body: 'Winter 2027 expedition shoot. You are comfortable on skis and do not mind the dark.', location: 'Northern Norway', closes_at: null, questions: [{ id: 'cold', label: 'Coldest place you have worked', type: 'text', required: true }], is_open: true, is_public: true, created_at: now },
  { id: 'o2', org_id: ORG, division_id: 'd-prod', project_id: null, kind: 'casting', title: 'Real people, real jobs', body: 'For a documentary series about work nobody notices. Tell us what you do.', location: 'Oslo', closes_at: null, questions: [], is_open: true, is_public: true, created_at: now },
  { id: 'o3', org_id: ORG, division_id: 'd-dev', project_id: null, kind: 'collab', title: 'Frontend engineer, part time', body: 'TypeScript, React, taste. Help build tools for filmmakers.', location: 'Remote', closes_at: null, questions: [{ id: 'gh', label: 'GitHub or portfolio', type: 'url' }], is_open: true, is_public: true, created_at: now },
];

export const demoPressKits: PressKit[] = [
  { id: 'k1', org_id: ORG, project_id: 'p1', title: 'White Silence press kit', summary: 'Stills, synopsis, director statement.', audience: 'public', embargo_until: null },
];
