window.tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Outfit", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        serif: ["Playfair Display", "serif"],
      },
      colors: {
        ink: '#121212',
        paper: '#FDFCF8',
        accent: '#E11D48',
        line: '#121212',
        slate: '#475569',
      },
      animation: {
          'marquee': 'marquee 25s linear infinite',
          'fade-in': 'fadeIn 0.8s ease-out forwards',
      },
      keyframes: {
          marquee: {
              '0%': { transform: 'translateX(0)' },
              '100%': { transform: 'translateX(-50%)' },
          },
          fadeIn: {
              '0%': { opacity: '0', transform: 'translateY(10px)' },
              '100%': { opacity: '1', transform: 'translateY(0)' },
          }
      }
    }
  }
}
