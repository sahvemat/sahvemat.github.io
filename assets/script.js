tailwind.config = {
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

class MagazineLogo extends HTMLElement {
  connectedCallback() {
    const sizeClass = this.getAttribute('class') || '';
    this.innerHTML = `
      <a href="/" class="logo-text inline-flex items-baseline group ${sizeClass}">
        <span class="font-display font-black tracking-tighter uppercase leading-[0.75]">Şah</span>
        <span class="font-serif italic font-medium lowercase text-accent mx-1 md:mx-3 transform group-hover:-rotate-12 transition-transform duration-700">v</span>
        <span class="font-display font-black tracking-tighter uppercase leading-[0.75]">mat</span>
        <span class="block w-2 h-2 md:w-3 md:h-3 bg-accent ml-1 md:ml-3 self-end mb-[0.05em] transition-all duration-700 group-hover:rotate-45 group-hover:scale-150"></span>
      </a>
    `;
  }
}
customElements.define('magazine-logo', MagazineLogo);

const header = document.getElementById('main-header');
const tagline = document.getElementById('tagline');
const headerLogo = header?.querySelector('magazine-logo');
let isScrolled = false;

const updateHeader = () => {
  const scrollY = window.scrollY;
  const thresholdIn = 140; 
  const thresholdOut = 60; 

  if (scrollY > thresholdIn && !isScrolled) {
    isScrolled = true;
    header?.classList.add('scrolled');
    if (headerLogo) {
        headerLogo.style.transform = 'scale(0.7)';
        headerLogo.style.transformOrigin = 'left center';
    }
    if (tagline) {
      tagline.style.opacity = '0';
      tagline.style.transform = 'translateY(-10px)';
    }
  } else if (scrollY < thresholdOut && isScrolled) {
    isScrolled = false;
    header?.classList.remove('scrolled');
    if (headerLogo) {
        headerLogo.style.transform = 'scale(1)';
    }
    if (tagline) {
      tagline.style.opacity = '1';
      tagline.style.transform = 'translateY(0)';
    }
  }
};

if (headerLogo) {
    headerLogo.style.transition = 'all 0.7s cubic-bezier(0.23,1,0.32,1)';
}

let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      updateHeader();
      ticking = false;
    });
    ticking = true;
  }
}, { passive: true });
