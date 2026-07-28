(() => {
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#primary-menu');
  const year = document.querySelector('#current-year');

  if (menuButton && menu) {
    menuButton.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('is-open');
      menuButton.setAttribute('aria-expanded', String(isOpen));
    });

    menu.addEventListener('click', (event) => {
      if (event.target.matches('a')) {
        menu.classList.remove('is-open');
        menuButton.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        menu.classList.remove('is-open');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.focus();
      }
    });
  }

  if (year) year.textContent = String(new Date().getFullYear());
})();
