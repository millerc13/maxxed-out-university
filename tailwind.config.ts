import type { Config } from 'tailwindcss';

// All 13 section-color hue names used by the sales tracker palette.
// These get safelisted below so Tailwind never purges them — without
// this, an end user could land on a tag whose color (e.g. bg-yellow-700)
// wasn't seen in any source file at build time, and the bar would
// render as transparent (white-on-white).
const SECTION_HUES = [
  'rose', 'orange', 'amber', 'yellow', 'lime', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'pink',
];

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // Section bars (-700 / -800)
    ...SECTION_HUES.flatMap((h) => [`bg-${h}-700`, `bg-${h}-800`]),
    // Section pills (-100 + text/ring -200/-800)
    ...SECTION_HUES.flatMap((h) => [
      `bg-${h}-100`,
      `text-${h}-800`,
      `ring-${h}-200`,
    ]),
    // Swatch dots (-500)
    ...SECTION_HUES.map((h) => `bg-${h}-500`),
    // Session-card identity gradients (composed dynamically by hash).
    'bg-gradient-to-r',
    ...['rose', 'orange', 'amber', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'fuchsia', 'pink'].flatMap(
      (h) => [`from-${h}-500`, `to-${h}-500`]
    ),
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-montserrat)', 'Montserrat', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // MaxxedOut Brand Colors
        maxxed: {
          blue: '#0000FF',
          'blue-dark': '#0000CC',
          'blue-darker': '#0000AA',
          gold: '#D4AF37',
          dark: '#0a0a0a',
          'dark-section': '#2d3436',
          'card-dark': '#1a2a6a',
          'card-darker': '#0d1545',
        },
        // Text colors from maxxedout.com
        text: {
          dark: '#222',
          body: '#555',
          muted: '#888',
          light: '#aaa',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        card: '0 5px 20px rgba(0,0,0,0.08)',
        'card-hover': '0 15px 40px rgba(0,0,0,0.12)',
        hero: '0 20px 60px rgba(0,0,0,0.2)',
        'header': '0 2px 10px rgba(0,0,0,0.05)',
      },
      keyframes: {
        'scroll-left': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'scroll-right': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'scroll-left': 'scroll-left 60s linear infinite',
        'scroll-right': 'scroll-right 60s linear infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0000FF, #0000CC)',
        'gradient-dark': 'linear-gradient(135deg, #1a2a6a, #0d1545)',
        'gradient-hero': 'linear-gradient(135deg, #0000FF, #0000CC)',
        'gradient-hero-overlay': 'radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.8) 100%)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
