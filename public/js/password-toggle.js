document.addEventListener('click', (event) => {
  const toggle = event.target.closest('[data-password-toggle]');
  if (!toggle) return;

  const input = document.getElementById(toggle.getAttribute('data-password-toggle'));
  if (!input) return;

  const willShow = input.type === 'password';
  input.type = willShow ? 'text' : 'password';
  toggle.setAttribute('aria-label', willShow ? 'Hide password' : 'Show password');
  toggle.setAttribute('aria-pressed', String(willShow));

  const icon = toggle.querySelector('iconify-icon');
  if (icon) icon.setAttribute('icon', willShow ? 'tabler:eye-off' : 'tabler:eye');
});
