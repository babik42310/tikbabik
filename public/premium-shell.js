(() => {
  const all = (sel) => Array.from(document.querySelectorAll(sel));
  const menuButtons = all('#sideMenu .menuButton');

  function activate(button) {
    menuButtons.forEach((item) => item.classList.remove('cpActiveMenu'));
    button?.classList.add('cpActiveMenu');
  }

  menuButtons.forEach((button) => {
    button.addEventListener('click', () => activate(button));
  });

  // Connexion is its own Start sub-page. This runs after app.js and therefore
  // guarantees that the Start dashboard is hidden when Connexion is selected.
  document.getElementById('accountButton')?.addEventListener('click', () => {
    const panel = document.getElementById('startPanel');
    if (panel) panel.style.display = 'grid';
    ['startMainPage','agencyPage','faqPage','aboutPage','legalPage','contactPage'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    const login = document.getElementById('loginPage');
    if (login) login.style.display = 'block';
  });

  document.getElementById('startButton')?.addEventListener('click', () => {
    const panel = document.getElementById('startPanel');
    if (panel) panel.style.display = 'grid';
    ['loginPage','agencyPage','faqPage','aboutPage','legalPage','contactPage'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    const home = document.getElementById('startMainPage');
    if (home) home.style.display = 'block';
  });

  document.addEventListener('click', (event) => {
    const jump = event.target.closest('[data-hub-page-jump]');
    if (jump) document.querySelector(`.creatorHubTab[data-hub-page="${jump.dataset.hubPageJump}"]`)?.click();
  });

  activate(document.getElementById('startButton'));
})();
