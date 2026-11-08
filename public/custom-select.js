// Powers every custom dropdown on the site (see CLAUDE.md Rule 11 — no native <select>).
// Markup contract per dropdown, all inside one `[data-custom-select]` wrapper:
//   - `[data-custom-select-input]`   hidden <input> that actually carries the value into the form
//   - `[data-custom-select-trigger]` the visible <button> users click/focus
//   - `[data-custom-select-label]`   text node inside the trigger showing the current selection
//   - `[data-custom-select-options]` <ul role="listbox"> of <li role="option" data-value="...">`
// Selected option should have `aria-selected="true"` server-rendered; the hidden input's `value`
// and the label's text should already match it, so the control works correctly on first paint
// before this script runs.

function optionsOf(root) {
  return Array.from(root.querySelectorAll('[role="option"]')).filter(
    (option) => option.getAttribute('aria-disabled') !== 'true'
  );
}

function isOpen(root) {
  return !root.querySelector('[data-custom-select-options]').classList.contains('hidden');
}

function closeSelect(root, focusTrigger) {
  root.querySelector('[data-custom-select-options]').classList.add('hidden');
  root.querySelector('[data-custom-select-trigger]').setAttribute('aria-expanded', 'false');
  if (focusTrigger) root.querySelector('[data-custom-select-trigger]').focus();
}

function closeAllSelects() {
  document.querySelectorAll('[data-custom-select]').forEach((root) => closeSelect(root, false));
}

function openSelect(root) {
  closeAllSelects();
  root.querySelector('[data-custom-select-options]').classList.remove('hidden');
  root.querySelector('[data-custom-select-trigger]').setAttribute('aria-expanded', 'true');
  const opts = optionsOf(root);
  const current = opts.find((option) => option.getAttribute('aria-selected') === 'true') || opts[0];
  if (current) current.focus();
}

function chooseOption(root, option) {
  if (!option || option.getAttribute('aria-disabled') === 'true') return;
  const input = root.querySelector('[data-custom-select-input]');
  const label = root.querySelector('[data-custom-select-label]');

  root.querySelectorAll('[role="option"]').forEach((o) => o.setAttribute('aria-selected', 'false'));
  option.setAttribute('aria-selected', 'true');

  input.value = option.dataset.value;
  label.textContent = option.textContent.trim();

  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));

  closeSelect(root, true);
}

document.querySelectorAll('[data-custom-select]').forEach((root) => {
  const trigger = root.querySelector('[data-custom-select-trigger]');
  const list = root.querySelector('[data-custom-select-options]');

  trigger.addEventListener('click', () => (isOpen(root) ? closeSelect(root, false) : openSelect(root)));

  trigger.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      openSelect(root);
    }
  });

  list.addEventListener('click', (e) => {
    const option = e.target.closest('[role="option"]');
    if (option) chooseOption(root, option);
  });

  list.addEventListener('keydown', (e) => {
    const opts = optionsOf(root);
    const currentIndex = opts.indexOf(document.activeElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      opts[(currentIndex + 1) % opts.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      opts[(currentIndex - 1 + opts.length) % opts.length]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      chooseOption(root, document.activeElement.closest('[role="option"]'));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeSelect(root, true);
    } else if (e.key === 'Home') {
      e.preventDefault();
      opts[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      opts[opts.length - 1]?.focus();
    } else if (e.key === 'Tab') {
      closeSelect(root, false);
    }
  });
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-custom-select]')) closeAllSelects();
});
