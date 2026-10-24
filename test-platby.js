'use strict';

(() => {
  // Fixed existing assets only: no recipient, amount or image URL supplied by the visitor.
  const variants = {
    daniela: {
      title: 'Platba lekce Daniele',
      description: 'Test úhrady lekce ve výši 150 Kč. Používáme stejný QR kód jako v současných platebních e-mailech pro Danielu Šťastnou.',
      qr: '/assets/qr-daniela-150.jpg',
      filename: 'joga-na-hallu-daniela-150.jpg',
    },
    andel: {
      title: 'Příspěvek Dobrému andělovi',
      description: 'Dobrovolný příspěvek jde přímo organizaci Dobrý anděl. Používáme současný QR kód z webu. Částku si zkontroluj a případně uprav v bance.',
      qr: '/assets/qr-dobry-andel.jpg',
      filename: 'joga-na-hallu-dobry-andel.jpg',
    },
  };
  const key = new URLSearchParams(window.location.search).get('prijemce');
  const variant = Object.hasOwn(variants, key) ? variants[key] : null;
  const status = document.querySelector('#status');
  if (!variant) {
    document.querySelector('#payment-title').textContent = 'Neplatný testovací odkaz';
    status.textContent = 'Otevři prosím celý odkaz z testovacího e-mailu.';
    return;
  }

  document.querySelector('#payment-title').textContent = variant.title;
  document.querySelector('#description').textContent = variant.description;
  document.title = `${variant.title} – test | Jóga na HALLU`;
  const qr = document.querySelector('#qr');
  qr.alt = `QR kód: ${variant.title}`;
  qr.src = variant.qr;
  qr.hidden = false;
  for (const id of ['download', 'open']) {
    const link = document.querySelector(`#${id}`);
    link.href = variant.qr;
    link.hidden = false;
  }
  document.querySelector('#download').download = variant.filename;

  const share = document.querySelector('#share');
  let qrFile = null;
  share.addEventListener('click', async () => {
    if (!qrFile || share.disabled) return;
    share.disabled = true;
    try {
      // The file is already loaded, preserving the click's transient user activation.
      await navigator.share({ files: [qrFile] });
      status.textContent = 'Sdílení bylo předáno telefonu. Není to potvrzení o zaplacení.';
    } catch (error) {
      status.textContent = error.name === 'AbortError'
        ? 'Sdílení bylo zavřeno. Můžeš ho zkusit znovu.'
        : 'Sdílení se nepodařilo. Zkus Safari nebo Chrome, případně QR ulož a načti v bance.';
    } finally {
      share.disabled = false;
    }
  });

  async function prepareSharing() {
    if (!navigator.share || !navigator.canShare || typeof File === 'undefined') {
      status.textContent = 'Tento prohlížeč nepodporuje sdílení obrázku. QR můžeš uložit a načíst v bance.';
      return;
    }
    try {
      const response = await fetch(variant.qr);
      if (!response.ok) throw new Error('QR_LOAD_FAILED');
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) throw new Error('QR_NOT_IMAGE');
      qrFile = new File([blob], variant.filename, { type: blob.type });
      if (!navigator.canShare({ files: [qrFile] })) {
        status.textContent = 'Tento prohlížeč neumí sdílet QR jako soubor. Ulož ho a načti v bance.';
        return;
      }
      share.hidden = false;
      share.disabled = false;
      status.textContent = 'QR je připravený. Sdílení nabídne aplikace v telefonu; banka nemusí být mezi nimi.';
    } catch {
      status.textContent = 'QR se nepodařilo připravit pro sdílení. Zkus otevřít nebo stáhnout QR obrázek.';
    }
  }
  prepareSharing();
})();
