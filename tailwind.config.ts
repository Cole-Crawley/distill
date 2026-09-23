import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Each references a CSS custom property (defined in src/index.css,
        // light on :root / overridden under .dark) holding an "R G B" triplet,
        // so Tailwind's opacity-modifier syntax (e.g. bg-stone-ink/40, already
        // used for modal backdrops) keeps working across both themes.
        cream: 'rgb(var(--color-cream) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'border-warm': 'rgb(var(--color-border-warm) / <alpha-value>)',
        'stone-ink': 'rgb(var(--color-stone-ink) / <alpha-value>)',
        'stone-muted': 'rgb(var(--color-stone-muted) / <alpha-value>)',
        forest: 'rgb(var(--color-forest) / <alpha-value>)',
        'forest-light': 'rgb(var(--color-forest-light) / <alpha-value>)',
        'forest-dark': 'rgb(var(--color-forest-dark) / <alpha-value>)',

        'topic-ml': '#4a7c59',
        'topic-science': '#2d6a9f',
        'topic-history': '#8b5e3c',
        'topic-tech': '#5b4fcf',
        'topic-business': '#b45309',
        'topic-health': '#be185d',
        'topic-other': '#78716c',
      },
      fontFamily: {
        display: ['Lora', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '4px',
      },
      boxShadow: {
        warm: '0 1px 3px rgba(28,25,23,0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config
