'use strict';

const fragment = new URLSearchParams(location.hash.slice(1));
if (fragment.has('brief') || fragment.has('key')) {
  history.replaceState(null, '', location.pathname + location.search);
}

const unlock = document.querySelector('[data-license-unlock]');
const key = fragment.get('key');
if (unlock && /^[0-9a-f]{24}\.[0-9a-f]{32}$/.test(key ?? '')) {
  unlock.elements.key.value = key;
  unlock.requestSubmit();
}

const draftSlot = 'xxxink.licensing.handoff';
const brief = fragment.get('brief');
const proofSlot = 'xxxink.licensing.studio-proof';
let handoff = null;
try {
  if (brief && brief.length <= 14000) {
    handoff = JSON.parse(brief);
    handoff.studio = fragment.get('studio') === '1';
    if (!handoff.studio) sessionStorage.removeItem(proofSlot);
    sessionStorage.setItem(draftSlot, JSON.stringify(handoff));
  } else {
    handoff = JSON.parse(sessionStorage.getItem(draftSlot));
  }
} catch { /* Manual entry remains available. */ }

const create = document.querySelector('[data-license-create]');
if (create && !create.hasAttribute('data-returned') && handoff?.v === 1) {
  for (const name of ['buyer', 'email', 'source', 'project', 'context', 'placement', 'scope', 'price', 'pitch']) {
    const field = create.elements.namedItem(name);
    if (typeof handoff[name] === 'string') field.value = handoff[name].slice(0, field.maxLength);
  }
}

if (create && handoff?.studio) {
  try {
    const proof = sessionStorage.getItem(proofSlot);
    if (proof && proof.length <= 2_000_000) {
      const bytes = Uint8Array.from(atob(proof), character => character.charCodeAt(0));
      const transfer = new DataTransfer();
      transfer.items.add(new File([bytes], 'studio-proof.jpg', {type:'image/jpeg'}));
      create.elements.preview.files = transfer.files;
      const notice = document.querySelector('[data-studio-proof-notice]');
      notice.hidden = false;
    }
  } catch { /* The regular file chooser remains available. */ }
}

const share = document.querySelector('[data-license-share]');
if (share) {
  try { sessionStorage.removeItem(draftSlot); sessionStorage.removeItem(proofSlot); } catch {}
  const url = new URL(location.pathname + '?license', location.origin);
  url.hash = new URLSearchParams({key: share.dataset.key}).toString();
  const link = share.querySelector('[data-share-link]');
  const pitch = share.querySelector('[data-share-pitch]');
  const status = share.querySelector('[data-copy-status]');
  const compose = share.querySelector('[data-compose]');
  const section = 'Private project preview\n' + url + '\nIf prompted, use this key: ' + share.dataset.key;
  const addLink = value => value.includes(url.href) ? value : value.trim() + '\n\n' + section;
  link.value = url.href;
  pitch.value = pitch.value.includes('[Relevant sample link]')
    ? pitch.value.replace('[Relevant sample link]', section)
    : addLink(pitch.value);
  function updateCompose() {
    if (compose) compose.href = 'mailto:' + encodeURIComponent(share.dataset.recipient)
      + '?subject=' + encodeURIComponent('Licensing preview for ' + share.dataset.project)
      + '&body=' + encodeURIComponent(addLink(pitch.value));
  }
  pitch.addEventListener('input', updateCompose);
  updateCompose();
  share.addEventListener('click', async event => {
    const choice = event.target.closest('[data-copy]')?.dataset.copy;
    if (!choice) return;
    const target = choice === 'link' ? link : pitch;
    if (choice === 'pitch') target.value = addLink(target.value);
    try {
      await navigator.clipboard.writeText(target.value);
      status.textContent = choice === 'link' ? 'Private link copied.' : 'Pitch and preview link copied.';
    } catch {
      target.focus();
      target.select();
      status.textContent = 'The text is selected. Copy it with your device’s copy command.';
    }
  });
}
