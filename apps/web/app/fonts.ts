import { Archivo, Bricolage_Grotesque, Caveat, Inter, JetBrains_Mono, Playfair_Display, Space_Grotesk } from 'next/font/google';

// Loaded once in the root layout as CSS variables. Each site picks its own
// in its stylesheet, so a visitor only downloads the faces that site uses.
export const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'], variable: '--f-space', display: 'swap' });
export const inter = Inter({ subsets: ['latin'], variable: '--f-inter', display: 'swap' });
export const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--f-jet', display: 'swap' });
export const playfair = Playfair_Display({ subsets: ['latin'], style: ['normal', 'italic'], weight: ['500', '700'], variable: '--f-playfair', display: 'swap', preload: false });
export const caveat = Caveat({ subsets: ['latin'], weight: ['500'], variable: '--f-caveat', display: 'swap', preload: false });
export const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--f-archivo', display: 'swap', preload: false });
export const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['500', '800'], variable: '--f-bricolage', display: 'swap', preload: false });

export const fontVars = [spaceGrotesk, inter, mono, playfair, caveat, archivo, bricolage].map((f) => f.variable).join(' ');
