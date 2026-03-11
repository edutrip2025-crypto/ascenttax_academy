const tabPages = [...document.querySelectorAll('.tab-page')];
const navTabs = [...document.querySelectorAll('[data-page]')];
const siteHeader = document.querySelector('.site-header');
const homeLogo = document.querySelector('.home-brand-logo');
const menuToggle = document.getElementById('menu-toggle');
const siteNav = document.querySelector('.site-nav');
const progressBar = document.getElementById('scroll-progress-bar');
const backToTopBtn = document.getElementById('back-to-top');
const FORM_ENDPOINT = '/api/submit';
let activePage = 'home';
let isTransitioning = false;

function updateBrandState() {
  if (!siteHeader) return;
  const shouldSettle = activePage !== 'home' || window.scrollY > 36;
  siteHeader.classList.toggle('settled', shouldSettle);
  if (homeLogo) {
    homeLogo.classList.toggle('shrink', shouldSettle && activePage === 'home');
  }
}

function updateScrollUI() {
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - doc.clientHeight;
  const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  if (progressBar) progressBar.style.width = `${Math.min(progress, 100)}%`;
  if (backToTopBtn) backToTopBtn.classList.toggle('visible', window.scrollY > 260);
}

function animateCounters(scope) {
  const counters = [...scope.querySelectorAll('[data-count]')].filter(
    (el) => !el.dataset.animated
  );

  counters.forEach((element) => {
    const target = Number(element.dataset.count);
    if (Number.isNaN(target)) return;

    element.dataset.animated = 'true';
    const duration = 700;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      element.textContent = Math.round(target * progress);
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
}

function setActivePage(pageName) {
  if (!pageName || pageName === activePage || isTransitioning) return;

  const currentPage = document.querySelector(`.tab-page[data-page="${activePage}"]`);
  const nextPage = document.querySelector(`.tab-page[data-page="${pageName}"]`);
  if (!nextPage) return;

  isTransitioning = true;

  if (currentPage) {
    currentPage.classList.add('leaving');
  }

  navTabs.forEach((control) => {
    const isActive = control.dataset.page === pageName;
    if (control.classList.contains('nav-tab')) {
      control.classList.toggle('active', isActive);
    }
  });

  const leaveDuration = 460;
  const enterDuration = 720;

  window.setTimeout(() => {
    if (currentPage) {
      currentPage.classList.remove('active', 'leaving');
    }

    tabPages.forEach((section) => {
      if (section !== nextPage) {
        section.classList.remove('active', 'leaving', 'entering');
      }
    });

    nextPage.classList.add('entering');
    nextPage.offsetHeight;

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
      nextPage.classList.remove('entering');
      nextPage.classList.add('active');
      animateCounters(nextPage);
      activePage = pageName;
      updateBrandState();
      updateScrollUI();
    });

    window.setTimeout(() => {
      isTransitioning = false;
    }, enterDuration);
  }, leaveDuration);
}

navTabs.forEach((control) => {
  control.addEventListener('click', (event) => {
    event.preventDefault();
    if (siteNav) siteNav.classList.remove('open');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    setActivePage(control.dataset.page);
  });
});

if (menuToggle && siteNav) {
  menuToggle.addEventListener('click', () => {
    const open = siteNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

window.addEventListener('resize', () => {
  if (window.innerWidth > 760 && siteNav && menuToggle) {
    siteNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }
});

window.addEventListener('scroll', () => {
  updateBrandState();
  updateScrollUI();
}, { passive: true });

function toggleFaqItem(itemToOpen) {
  const faqItems = [...document.querySelectorAll('.faq-item')];
  const typingTimers = toggleFaqItem.typingTimers || new WeakMap();
  toggleFaqItem.typingTimers = typingTimers;

  const runTyping = (answer) => {
    const paragraph = answer.querySelector('p');
    if (!paragraph) return;
    const fullText = paragraph.dataset.fullText || paragraph.textContent.trim();
    paragraph.dataset.fullText = fullText;

    const existing = typingTimers.get(paragraph);
    if (existing) window.clearInterval(existing);

    paragraph.textContent = '';
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      paragraph.textContent = fullText.slice(0, index);
      answer.style.maxHeight = `${answer.scrollHeight}px`;
      if (index >= fullText.length) {
        window.clearInterval(timer);
      }
    }, 12);

    typingTimers.set(paragraph, timer);
  };

  faqItems.forEach((item) => {
    const button = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!button || !answer) return;

    const shouldOpen = item === itemToOpen && !item.classList.contains('open');
    item.classList.toggle('open', shouldOpen);
    button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    if (shouldOpen) {
      runTyping(answer);
    } else {
      const paragraph = answer.querySelector('p');
      if (paragraph) {
        const timer = typingTimers.get(paragraph);
        if (timer) window.clearInterval(timer);
      }
      answer.style.maxHeight = '0px';
    }
  });
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('.faq-question');
  if (!button) return;
  const item = button.closest('.faq-item');
  if (!item) return;
  toggleFaqItem(item);
});

const forms = [...document.querySelectorAll('.enroll-form')];

function setFormStatus(form, message, tone) {
  let status = form.querySelector('.form-status');
  if (!status) {
    status = document.createElement('p');
    status.className = 'form-status';
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('role', 'status');
    form.appendChild(status);
  }

  status.textContent = message || '';
  status.classList.remove('success', 'error');
  if (tone === 'success') status.classList.add('success');
  if (tone === 'error') status.classList.add('error');
  status.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return status;
}

function redirectToSubmissionStatus(formType) {
  const type = encodeURIComponent(formType || 'contact');
  window.location.href = `submission-status.html?status=success&type=${type}`;
}

async function submitForm(form) {
  if (!form || form.dataset.submitting === '1') return;

  const button = form.querySelector('button[type="submit"]');
  if (!button) return;

  form.dataset.submitting = '1';
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Sending...';
  setFormStatus(form, '', '');

  try {
    const formData = new FormData(form);
    const payload = {
      formType: (formData.get('formType') || form.dataset.formType || '').toString().trim(),
      name: (formData.get('name') || '').toString().trim(),
      email: (formData.get('email') || '').toString().trim(),
      phone: (formData.get('phone') || '').toString().trim(),
      preferredProgram: (formData.get('preferred_program') || '').toString().trim(),
      message: (formData.get('message') || '').toString().trim(),
      sourcePage: window.location.href,
      honey: (formData.get('honey') || '').toString().trim()
    };

    const response = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      const suffix = data.requestId ? ` (Ref: ${data.requestId})` : '';
      throw new Error((data.message || 'Could not submit your request.') + suffix);
    }

    form.reset();
    redirectToSubmissionStatus(payload.formType || form.dataset.formType || '');
  } catch (error) {
    const message = error && error.message
      ? error.message
      : 'Could not submit right now. Please call or WhatsApp us.';
    setFormStatus(form, message, 'error');
    window.alert(message);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
    form.dataset.submitting = '0';
  }
}

forms.forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitForm(form);
  });

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.addEventListener('click', (event) => {
      event.preventDefault();
      submitForm(form);
    });
  }
});

if (backToTopBtn) {
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

const initialPage = document.querySelector('.tab-page.active');
if (initialPage) {
  animateCounters(initialPage);
}

window.addEventListener('load', () => {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;
  window.setTimeout(() => {
    splash.classList.add('hide');
  }, 2000);
});

updateBrandState();
updateScrollUI();
