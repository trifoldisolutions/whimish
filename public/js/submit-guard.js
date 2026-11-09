function syncSubmitButtons(form) {
  const valid = form.checkValidity();
  form.querySelectorAll('button[type="submit"], input[type="submit"]').forEach((button) => {
    button.disabled = !valid;
  });
}

document.querySelectorAll('form').forEach((form) => {
  syncSubmitButtons(form);
  form.addEventListener('input', () => syncSubmitButtons(form));
  form.addEventListener('change', () => syncSubmitButtons(form));
});
