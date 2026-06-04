const header = document.getElementById('main-header');
const headerLogo = header?.querySelector('.logo-body');
let isScrolled = false;

const updateHeader = () => {
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;
  const thresholdIn = 100;
  const thresholdOut = 40;

  if (scrollY > thresholdIn && !isScrolled) {
    isScrolled = true;
    header?.classList.add('scrolled');
    headerLogo?.classList.add('is-scrolled');
  } else if (scrollY <= thresholdOut && isScrolled) {
    isScrolled = false;
    header?.classList.remove('scrolled');
    headerLogo?.classList.remove('is-scrolled');
  }
};

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
