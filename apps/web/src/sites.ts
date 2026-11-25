import type { SiteKey } from '@northem/core/types';
import type { FieldSpec } from '@northem/ui/forms';

export interface SiteConfig {
  key: SiteKey;
  name: string;
  short: string;
  division: string | null;       // division slug in the database
  description: string;
  nav: { href: string; label: string }[];
  form: { form: string; title: string; intro: string; submit: string; success: string; fields: FieldSpec[] };
  workVariant: 'posters' | 'frames';
}

const base: FieldSpec[] = [
  { name: 'name', label: 'Your name', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
];

export const SITE_CONFIG: Record<SiteKey, SiteConfig> = {
  landing: {
    key: 'landing', name: 'Northem', short: 'Northem', division: null,
    description: 'Northem makes films, tools, impossible shots and social. Perfect imperfections.',
    nav: [{ href: '/work', label: 'Work' }, { href: '/people', label: 'People' }, { href: '/podcast', label: 'Podcast' }, { href: '/join', label: 'Join' }, { href: '/contact', label: 'Contact' }],
    workVariant: 'posters',
    form: {
      form: 'contact', title: 'Say hello', intro: 'Questions, ideas, a wild plan. One inbox, read by humans.', submit: 'Send message', success: 'Message sent',
      fields: [...base, { name: 'subject', label: 'What is it about', type: 'select', options: ['A film or video', 'Software or a website', 'An extreme shoot', 'Social media', 'Working with us', 'Press', 'Something else'], wide: true },
        { name: 'message', label: 'Message', type: 'textarea', required: true }],
    },
  },
  prod: {
    key: 'prod', name: 'Northem Productions', short: 'Productions', division: 'productions',
    description: 'Films, documentaries and commercials about the parts of people nobody films.',
    nav: [{ href: '/work', label: 'Films' }, { href: '/people', label: 'Faces' }, { href: '/join', label: 'Casting & crew' }, { href: '/contact', label: 'Pitch us' }],
    workVariant: 'posters',
    form: {
      form: 'pitch', title: 'Pitch us a story', intro: 'You don\'t need a script. Tell us who it\'s about and why nobody has filmed them yet.', submit: 'Send the pitch', success: 'Pitch received',
      fields: [...base, { name: 'format', label: 'Format', type: 'chips', options: ['Documentary', 'Short film', 'Feature', 'Series', 'Commercial', 'Music video'], wide: true },
        { name: 'who', label: 'Who is it about', placeholder: 'A night-shift baker, my grandfather, a town of 40 people…', wide: true },
        { name: 'message', label: 'The story', type: 'textarea', required: true, hint: 'A few honest lines beat a polished deck.' },
        { name: 'links', label: 'Links (optional)', type: 'url', placeholder: 'Showreel, mood board, anything', wide: true }],
    },
  },
  specprod: {
    key: 'specprod', name: 'Specprod', short: 'Specprod', division: 'specprod',
    description: 'Specialist crews for storms, volcanoes, glaciers, altitude and minus thirty.',
    nav: [{ href: '/work', label: 'Field work' }, { href: '/people', label: 'Crew' }, { href: '/join', label: 'Join a crew' }, { href: '/contact', label: 'Book a shoot' }],
    workVariant: 'frames',
    form: {
      form: 'client', title: 'Book a shoot', intro: 'Tell us where it gets hard. We\'ll tell you honestly if it can be done, what it takes and how we keep everyone safe.', submit: 'Request a field plan', success: 'Request logged',
      fields: [...base, { name: 'company', label: 'Company / production' }, { name: 'phone', label: 'Phone', type: 'tel' },
        { name: 'environment', label: 'Environment', type: 'chips', options: ['Arctic / −30', 'Volcanic', 'Storm', 'Altitude', 'Ocean', 'Aerial', 'Underground'], wide: true },
        { name: 'location', label: 'Where', placeholder: 'Svalbard, Iceland, a ridge you can\'t pronounce' }, { name: 'dates', label: 'When', placeholder: 'Window or deadline' },
        { name: 'severity', label: 'How bad will it get', type: 'select', options: ['Uncomfortable', 'Properly hostile', 'Nobody has filmed there', 'We don\'t know yet'], wide: true },
        { name: 'message', label: 'The shot', type: 'textarea', required: true }],
    },
  },
  dev: {
    key: 'dev', name: 'Northem Development', short: 'Development', division: 'development',
    description: 'Websites, apps, tools and platforms. Many of them built for people who make films.',
    nav: [{ href: '/work', label: 'Products' }, { href: '/people', label: 'Team' }, { href: '/join', label: 'Join' }, { href: '/contact', label: 'Start a project' }],
    workVariant: 'frames',
    form: {
      form: 'client', title: 'Start a project', intro: 'A brief in plain words is perfect. We reply with questions, a rough plan and an honest estimate.', submit: 'Send the brief', success: 'Brief received',
      fields: [...base, { name: 'company', label: 'Company' },
        { name: 'kind', label: 'What are we building', type: 'chips', options: ['Website', 'Web app', 'iOS / Android', 'Internal tool', 'Platform', 'Integration', 'Not sure'], wide: true },
        { name: 'budget', label: 'Budget', type: 'select', options: ['Under 50k NOK', '50–200k NOK', '200k–1M NOK', '1M+ NOK', 'Let\'s talk'] },
        { name: 'timeline', label: 'Timeline', type: 'select', options: ['ASAP', '1–3 months', '3–6 months', 'No rush'] },
        { name: 'message', label: 'The problem you want gone', type: 'textarea', required: true }],
    },
  },
  so: {
    key: 'so', name: 'SoNorthem', short: 'SoNorthem', division: 'sonorthem',
    description: 'Social-first series, formats and channels that people actually follow.',
    nav: [{ href: '/work', label: 'Work' }, { href: '/people', label: 'Creators' }, { href: '/join', label: 'Join' }, { href: '/contact', label: 'Let\'s grow' }],
    workVariant: 'posters',
    form: {
      form: 'client', title: 'Let\'s grow', intro: 'Brand, creator or a wild format idea. Tell us where you are and where you want to be.', submit: 'Send it', success: 'Sent!',
      fields: [...base, { name: 'handle', label: 'Your handle or brand' },
        { name: 'platforms', label: 'Platforms', type: 'chips', options: ['TikTok', 'Instagram', 'YouTube', 'Shorts', 'Snapchat', 'LinkedIn'], wide: true },
        { name: 'goal', label: 'Goal', type: 'select', options: ['Grow an audience', 'Launch something', 'A series / format', 'Content production', 'Strategy'], wide: true },
        { name: 'message', label: 'Tell us more', type: 'textarea', required: true }],
    },
  },
};
