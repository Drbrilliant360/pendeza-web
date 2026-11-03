/** @type {import('tailwindcss').Config} */
// Tokens mirror lib/app/config/theme/app_colors.dart + shared/widgets/client_ui.dart
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Poppins', 'system-ui', 'sans-serif'] },
      colors: {
        primary: { DEFAULT: '#6C5CE7', light: '#A29BFE', dark: '#5F3DC4' },
        accent: { DEFAULT: '#FAB1A0', 2: '#74B9FF' },
        success: { DEFAULT: '#00B894', light: '#55EFC4' },
        danger: { DEFAULT: '#FF6B6B', light: '#FF7675' },
        warning: { DEFAULT: '#FDCB6E', light: '#FECE7A' },
        info: '#74B9FF',
        tone: { rose: '#FF7A90', mint: '#00B894', amber: '#F5A623', sky: '#4DA3FF', orchid: '#B57BFF' },
        // semantic surface tokens (CSS vars switch per theme)
        page: 'rgb(var(--page) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        inset: 'rgb(var(--inset) / <alpha-value>)',
      },
      borderRadius: { '4xl': '30px' },
      boxShadow: {
        sm1: '0 1px 3px rgba(0,0,0,0.04)',
        md1: '0 4px 12px -2px rgba(0,0,0,0.08)',
        lg1: '0 8px 24px -4px rgba(0,0,0,0.12)',
        hero: '0 12px 28px -8px rgba(108,92,231,0.30)',
        cta: '0 6px 16px -4px rgba(108,92,231,0.40)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
        'hero-light': 'linear-gradient(135deg, #6C5CE7, #8C7CF0)',
        'hero-dark': 'linear-gradient(135deg, #4B3BB8, #6C5CE7)',
        'accent-gradient': 'linear-gradient(135deg, #FAB1A0, #F8B500)',
        'success-gradient': 'linear-gradient(135deg, #00B894, #55EFC4)',
      },
    },
  },
  plugins: [],
}
