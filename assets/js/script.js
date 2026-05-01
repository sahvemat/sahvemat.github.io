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
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;
  
  // Adjusted thresholds for smoother transition
  const thresholdIn = 100; 
  const thresholdOut = 40; 

  if (scrollY > thresholdIn && !isScrolled) {
    isScrolled = true;
    header?.classList.add('scrolled');
    if (tagline) {
      tagline.style.opacity = '0';
      tagline.style.transform = 'translateY(-10px)';
      tagline.style.pointerEvents = 'none';
    }
  } else if (scrollY <= thresholdOut && isScrolled) {
    isScrolled = false;
    header?.classList.remove('scrolled');
    if (tagline) {
      tagline.style.opacity = '1';
      tagline.style.transform = 'translateY(0)';
      tagline.style.pointerEvents = 'auto';
    }
  }
};

if (headerLogo) {
    headerLogo.style.transition = 'font-size 0.6s cubic-bezier(0.23,1,0.32,1)';
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
