'use strict';

window.ArchiveLicensing = (() => {
  const storageKey = 'archive-licensing-site.v1';
  const hostedStudio = /\/studio\/(?:index\.html)?$/.test(location.pathname);
  const defaultSite = hostedStudio ? new URL('../', location.href).href : 'https://xxxznx.3xink.com/';
  const proofSlot = 'xxxink.licensing.studio-proof';
  function site() {
    try { return localStorage.getItem(storageKey) || defaultSite; }
    catch { return defaultSite; }
  }
  function endpoint(input) {
    let url;
    try { url = new URL(input.trim()); } catch {}
    const localSite = url && hostedStudio && url.origin === location.origin &&
      url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
    if (!url || (url.protocol !== 'https:' && !localSite) || url.username || url.password || url.search || url.hash) {
      throw Error('Enter the HTTPS address where XXX!NK is installed, without query or fragment.');
    }
    return url;
  }
  function configure(value) {
    const url = endpoint(value);
    localStorage.setItem(storageKey, url.href);
  }
  function proofDestination() {
    if (window.ArchiveNative?.canStageStudioProof?.()) return 'phone';
    if (hostedStudio && endpoint(site()).origin === location.origin) return 'site';
    return '';
  }
  function launch({buyer, contact, source, context, pitch, project, placement, scope, price}, proof = '') {
    if (!String(pitch ?? '').trim()) throw Error('Fill and review the pitch before creating its private preview.');
    const email = String(contact ?? '').trim().replace(/^mailto:/i, '');
    const data = {
      v:1,
      buyer:String(buyer ?? '').trim(),
      email:/^[^\s@,;?#<>]+@[^\s@,;?#<>]+\.[^\s@,;?#<>]+$/.test(email) ? email : '',
      source:String(source ?? '').trim(),
      context:String(context ?? '').trim(),
      project:String(project ?? '').trim(),
      placement:String(placement ?? '').trim(),
      scope:String(scope ?? '').trim(),
      price:String(price ?? '').trim(),
      pitch:String(pitch).trim()
    };
    const limits = {buyer:250, email:254, source:1000, context:2200, project:250, placement:250, scope:2200, price:180, pitch:6000};
    for (const [field, limit] of Object.entries(limits)) {
      if (new TextEncoder().encode(data[field]).length > limit) {
        throw Error('The '+field+' is too long for a preview handoff. Shorten it and try again.');
      }
    }
    const handoff = JSON.stringify(data);
    if (proof && proofDestination()==='phone') {
      if (!window.ArchiveNative.openPhoneStudioOffer(handoff,proof)) throw Error('The phone could not stage the proof. Save a JPEG to attach manually.');
      return 'attached';
    }
    if (window.ArchiveNative?.openPhoneLicenseOffer?.(handoff)) return 'manual';
    const url = endpoint(site());
    url.searchParams.set('license', 'owner');
    const parameters = new URLSearchParams({brief:handoff});
    if (proof && proofDestination()==='site') parameters.set('studio','1');
    url.hash = parameters.toString();
    if (url.href.length > 11000) throw Error('Shorten the brief or pitch before handing it off.');
    if (parameters.has('studio')) {
      sessionStorage.setItem(proofSlot, proof);
      location.assign(url.href);
      return 'attached';
    }
    if (window.ArchiveNative?.openLicensingDesk) {
      window.ArchiveNative.openLicensingDesk(url.href);
      return 'manual';
    }
    window.open(url.href, '_blank', 'noopener,noreferrer');
    return 'manual';
  }
  return {site, configure, launch, proofDestination};
})();
