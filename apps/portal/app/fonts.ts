import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--f-inter', display: 'swap' });
const space = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'], variable: '--f-space', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--f-jet', display: 'swap' });

export const fontVars = [inter, space, mono].map((f) => f.variable).join(' ');
