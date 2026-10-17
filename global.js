console.log("IT'S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// The module lives at the website root, locally and under /portfolio/ on GitHub.
const baseURL = new URL('./', import.meta.url);
const pages = [
  { url: './', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'resume/', title: 'Resume' },
  { url: 'https://github.com/jtw010-dot', title: 'GitHub' },
];

function normalizePath(path) {
  return path.replace(/index\.html$/, '').replace(/\/$/, '');
}

const nav = document.createElement('nav');
nav.setAttribute('aria-label', 'Main navigation');
document.body.prepend(nav);

for (const page of pages) {
  const link = document.createElement('a');
  link.href = new URL(page.url, baseURL).href;
  link.textContent = page.title;
  if (link.origin === location.origin && normalizePath(link.pathname) === normalizePath(location.pathname)) {
    link.classList.add('current');
    link.setAttribute('aria-current', 'page');
  }
  if (link.origin !== location.origin) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  nav.append(link);
}

const themeLabel = document.createElement('label');
themeLabel.className = 'color-scheme';
themeLabel.textContent = 'Theme: ';
const themeSelect = document.createElement('select');
for (const [value, title] of [['light dark', 'Automatic'], ['light', 'Light'], ['dark', 'Dark']]) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = title;
  themeSelect.append(option);
}
themeLabel.append(themeSelect);
document.body.prepend(themeLabel);

function setColorScheme(value) {
  document.documentElement.style.setProperty('color-scheme', value);
  themeSelect.value = value;
}

let savedScheme = 'light dark';
try {
  savedScheme = localStorage.getItem('colorScheme') || savedScheme;
} catch {
  // Switching still works when a browser disables persistent storage.
}
if (!['light dark', 'light', 'dark'].includes(savedScheme)) savedScheme = 'light dark';
setColorScheme(savedScheme);

themeSelect.addEventListener('input', (event) => {
  const value = event.target.value;
  setColorScheme(value);
  console.log('Color scheme:', value);
  try {
    localStorage.setItem('colorScheme', value);
  } catch {
    // The current page can still use the selected theme.
  }
});

// Encode each field separately so &, +, #, and line breaks stay in the message.
export function buildMailtoURL(action, entries) {
  const parameters = Array.from(entries, ([name, value]) =>
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`
  ).join('&');
  return `${action}?${parameters}`;
}

const contactForm = $$('form[action^="mailto:"]')[0];
contactForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(contactForm);
  location.href = buildMailtoURL(contactForm.getAttribute('action'), data);
});
