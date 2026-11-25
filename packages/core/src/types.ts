// Row shapes for the tables the apps read. They mirror supabase/migrations.
// When the schema changes, update these (or switch to `supabase gen types`).

export const ORG_ROLES = ['guest', 'press', 'cast', 'crew', 'producer', 'admin', 'owner'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const PROJECT_ROLES = ['guest', 'cast', 'crew', 'head', 'lead'] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

export type Visibility = 'private' | 'internal' | 'unlisted' | 'public';

export const PROJECT_KINDS = [
  'feature', 'short', 'documentary', 'series', 'episode', 'commercial', 'music_video',
  'branded', 'social', 'specialty_shoot', 'website', 'app', 'tool', 'platform', 'game', 'other',
] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];

export const PROJECT_STATUSES = [
  'idea', 'development', 'pre_production', 'production', 'post_production',
  'building', 'beta', 'released', 'live', 'on_hold', 'archived',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type SiteKey = 'landing' | 'prod' | 'dev' | 'specprod' | 'so';

export interface Org {
  id: string;
  slug: string;
  name: string;
  branding: { product_name?: string; logo_url?: string; accent?: string; mail_from?: string };
  settings: Record<string, unknown>;
}

export interface Division {
  id: string;
  org_id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  theme: Record<string, unknown>;
  sort: number;
  is_public: boolean;
}

export interface Profile {
  id: string;
  handle: string | null;
  display_name: string;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  location: string | null;
  links: { label: string; url: string }[];
  theme: Record<string, unknown>;
  is_public: boolean;
  onboarded_at: string | null;
}

export interface Person {
  id: string;
  org_id: string;
  slug: string;
  name: string;
  known_for: string | null;
  bio: string | null;
  photo_url: string | null;
  links: { label: string; url: string }[];
  profile_id: string | null;
  is_public: boolean;
}

export interface ThemeTokens {
  bg?: string;
  surface?: string;
  fg?: string;
  muted?: string;
  accent?: string;
  accent2?: string;
  line?: string;
  fontDisplay?: string;
  fontBody?: string;
  radius?: string;
  grain?: number;        // 0..1
  texture?: 'none' | 'grain' | 'frost' | 'ash' | 'grid' | 'paper' | 'scan';
  hero?: 'poster' | 'fullbleed' | 'split' | 'type';
  motion?: 'calm' | 'lively' | 'none';
}

export type PageBlock =
  | { type: 'synopsis' }
  | { type: 'credits'; title?: string }
  | { type: 'gallery'; kinds?: string[]; title?: string }
  | { type: 'bloopers'; title?: string }
  | { type: 'trivia'; title?: string }
  | { type: 'diary'; title?: string }
  | { type: 'podcasts'; title?: string }
  | { type: 'stats'; title?: string }
  | { type: 'text'; title?: string; body: string }
  | { type: 'quote'; body: string; by?: string }
  | { type: 'video'; url: string; title?: string };

export interface Theme {
  id: string;
  org_id: string;
  name: string;
  tokens: ThemeTokens;
  layout: { blocks?: PageBlock[] };
  custom_css: string | null;
}

export interface Project {
  id: string;
  org_id: string;
  division_id: string | null;
  slug: string;
  title: string;
  kind: ProjectKind;
  status: ProjectStatus;
  logline: string | null;
  synopsis: string | null;
  year: number | null;
  release_date: string | null;
  runtime_minutes: number | null;
  locations: string[];
  genres: string[];
  poster_url: string | null;
  cover_url: string | null;
  trailer_url: string | null;
  client: string | null;
  visibility: Visibility;
  published_at: string | null;
  theme_id: string | null;
  theme_overrides: ThemeTokens;
  page_blocks: PageBlock[];
  stats: Record<string, string | number>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: ProjectRole;
  departments: string[];
  title: string | null;
}

export interface OrgMember {
  org_id: string;
  user_id: string;
  role: OrgRole;
  title: string | null;
  departments: string[];
  status: 'active' | 'suspended' | 'left';
  joined_at: string;
}

export interface Credit {
  id: string;
  project_id: string;
  person_id: string;
  department: string;
  job: string;
  character_name: string | null;
  billing: number;
  note: string | null;
  is_public: boolean;
}

export type MediaKind = 'still' | 'bts' | 'blooper' | 'poster' | 'concept' | 'video' | 'screenshot' | 'audio';

export interface Media {
  id: string;
  project_id: string;
  kind: MediaKind;
  storage_path: string | null;
  external_url: string | null;
  caption: string | null;
  story: string | null;
  taken_at: string | null;
  location: string | null;
  sort: number;
  is_public: boolean;
  uploaded_by: string | null;
  created_at: string;
}

export type TriviaKind = 'trivia' | 'goof' | 'quote' | 'fun_fact' | 'confession';

export interface Trivia {
  id: string;
  project_id: string;
  kind: TriviaKind;
  body: string;
  person_id: string | null;
  sort: number;
  is_public: boolean;
}

export interface Moment {
  id: string;
  project_id: string;
  happened_on: string;
  title: string;
  body: string | null;
  mood: string | null;
  media_ids: string[];
  is_public: boolean;
}

export type PodcastSource = 'internal' | 'spotify' | 'youtube' | 'apple' | 'soundcloud' | 'other';

export interface PodcastEpisode {
  id: string;
  org_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  source: PodcastSource;
  storage_path: string | null;
  external_url: string | null;
  duration_seconds: number | null;
  episode_number: number | null;
  cover_url: string | null;
  published_at: string | null;
  is_public: boolean;
}

export interface DocumentRow {
  id: string;
  project_id: string;
  title: string;
  category: string;
  source: 'upload' | 'link' | 'screenplay_studio' | 'graphite';
  storage_path: string | null;
  url: string | null;
  external_id: string | null;
  min_role: ProjectRole;
  departments: string[];
  pinned: boolean;
  created_at: string;
}

export interface ProjectLink {
  id: string;
  project_id: string;
  provider: 'screenplay_studio' | 'graphite' | 'cinderra' | 'castingcall' | 'github' | 'other';
  external_id: string;
  external_url: string | null;
  label: string | null;
  min_role: ProjectRole;
}

export interface Opening {
  id: string;
  org_id: string;
  division_id: string | null;
  project_id: string | null;
  kind: 'job' | 'crew' | 'casting' | 'collab' | 'internship';
  title: string;
  body: string | null;
  location: string | null;
  closes_at: string | null;
  questions: { id: string; label: string; type: 'text' | 'textarea' | 'url'; required?: boolean }[];
  is_open: boolean;
  is_public: boolean;
  created_at: string;
}

export const SUBMISSION_FORMS = ['contact', 'pitch', 'application', 'casting', 'collab', 'press', 'newsletter', 'client'] as const;
export type SubmissionForm = (typeof SUBMISSION_FORMS)[number];
export const SUBMISSION_STATUSES = ['new', 'reviewing', 'shortlisted', 'replied', 'accepted', 'declined', 'spam', 'archived'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export interface Submission {
  id: string;
  org_id: string;
  division_id: string | null;
  opening_id: string | null;
  form: SubmissionForm;
  name: string | null;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string | null;
  payload: Record<string, unknown>;
  attachments: string[];
  source_host: string | null;
  status: SubmissionStatus;
  assigned_to: string | null;
  created_at: string;
}

export interface Invite {
  id: string;
  org_id: string;
  email: string;
  org_role: OrgRole;
  project_id: string | null;
  project_role: ProjectRole | null;
  title: string | null;
  person_id: string | null;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface PressKit {
  id: string;
  org_id: string;
  project_id: string | null;
  title: string;
  summary: string | null;
  audience: 'press' | 'public';
  embargo_until: string | null;
}

export interface PressKitItem {
  id: string;
  kit_id: string;
  title: string;
  kind: 'file' | 'image' | 'video' | 'text' | 'link';
  storage_path: string | null;
  url: string | null;
  body: string | null;
  sort: number;
}

export interface ChatChannel {
  id: string;
  org_id: string;
  project_id: string | null;
  kind: 'channel' | 'project' | 'group' | 'dm';
  name: string | null;
  topic: string | null;
  is_private: boolean;
  min_org_role: OrgRole;
  min_project_role: ProjectRole;
  archived_at: string | null;
  last_message_at: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  author_id: string | null;
  body: string;
  attachments: { path: string; name: string; mime: string; size: number }[];
  thread_root_id: string | null;
  reply_count: number;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

/** A credit joined with the person and project it belongs to. */
export interface CreditView extends Credit {
  person: Pick<Person, 'id' | 'slug' | 'name' | 'photo_url' | 'known_for' | 'profile_id'>;
}
export interface FilmographyItem extends Credit {
  project: Pick<Project, 'id' | 'slug' | 'title' | 'year' | 'kind' | 'poster_url' | 'division_id' | 'status'>;
}

/** Everything a public project page needs, in one object. */
export interface ProjectBundle {
  project: Project;
  division: Division | null;
  theme: Theme | null;
  credits: CreditView[];
  media: Media[];
  trivia: Trivia[];
  moments: Moment[];
  podcasts: PodcastEpisode[];
}
