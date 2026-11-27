'use strict';

window.WideSources = (() => {
  const maxBytes = 3 * 1024 * 1024;
  const cooldowns = new Map();
  let catalog;
  function config() {
    if (!catalog) catalog = fetch('./wide-net-feeds.json').then(response => {
      if (!response.ok) throw Error('Feed catalog unavailable');
      return response.json();
    }).catch(error => {catalog = null; throw error;});
    return catalog;
  }
  async function read(response) {
    if (!response.ok) {
      const error=Error(response.status===429?'Rate limited':'HTTP '+response.status);
      error.status=response.status;
      throw error;
    }
    if (Number(response.headers.get('Content-Length')) > maxBytes) throw Error('Response too large');
    if (!response.body?.getReader) {
      const body = await response.text();
      if (body.length > maxBytes) throw Error('Response too large');
      return body;
    }
    const reader = response.body.getReader(), decoder = new TextDecoder();
    let bytes = 0, text = '';
    try {
      while (true) {
        const {value,done} = await reader.read();
        if (done) return text + decoder.decode();
        bytes += value.length;
        if (bytes > maxBytes) throw Error('Response too large');
        text += decoder.decode(value,{stream:true});
      }
    } finally { await reader.cancel().catch(()=>{}); }
  }
  async function raw(source, feed, cursor = '') {
    const proxy = new URL('../wide-feed.php',location.href);
    proxy.search = new URLSearchParams({source,cursor}).toString();
    try {
      return await read(await fetch(proxy,{credentials:'omit',signal:AbortSignal.timeout(8500)}));
    } catch (error) {
      if (window.ArchiveNative || (error.status && error.status!==404 && error.status!==405)) throw error;
      const url = new URL(feed.url);
      if (cursor) url.searchParams.set('cursor',cursor);
      return read(await fetch(url,{credentials:'omit',signal:AbortSignal.timeout(7000)}));
    }
  }
  const short = (value, limit) => String(value ?? '').trim().slice(0,limit);
  const dateOnly = value => /^\d{4}-\d{2}-\d{2}/.test(value || '') ? value.slice(0,10) : '';
  const creative = /\b(photograph\w*|documentar\w*|film|illustrat\w*|video|graphic design|visual arts?|content production|motion graphics|creative (services|industries)|editorial|web design|zine|arts?)\b/i;
  function procurement(json, now) {
    if (!Array.isArray(json.releases)) throw Error('Unexpected tender package');
    const rows = [];
    for (const release of json.releases) {
      const tender = release?.tender;
      const title = short(tender?.title,180);
      const closing = dateOnly(tender?.tenderPeriod?.endDate);
      const id = /^\d{4}\/S \d{3}-\d{6}$/.test(release?.id) ? release.id.slice(-6)+'-'+release.id.slice(0,4)
        : /^(\d{6}-\d{4})(?:\b|_)/.exec(release?.id || '')?.[1];
      const existingNotice = (Array.isArray(tender?.documents) ? tender.documents : []).find(doc=>doc?.documentType==='tenderNotice' &&
        /^https:\/\/www\.find-tender\.service\.gov\.uk\/Notice\/\d{6}-\d{4}(?:[/?#]|$)/.test(doc.url||''))?.url;
      const url = existingNotice || (id ? 'https://www.find-tender.service.gov.uk/Notice/'+id : '');
      if (!url || !title) continue;
      const description = short(tender.description,1200);
      if (!creative.test(title+' '+description) &&
          !(Array.isArray(tender.items) && tender.items.some(item=>/^(9211|7996|798225|724130)/.test(item?.classification?.id)))) continue;
      rows.push({url, official:url, title, description, kind:'commission', closing,
        organizer:short(release.buyer?.name,180), providerKey:short(release.ocid,160),
        providerState:tender.status==='active'&&closing&&closing>=now?'open':
          (['cancelled','unsuccessful','complete','withdrawn'].includes(tender.status)?'closed':'unknown'),
        providerTime:short(release.date,40)});
    }
    return rows;
  }
  function rss(text, today) {
    const parsed = new DOMParser().parseFromString(text.trim(),'application/xml');
    if (parsed.documentElement.nodeName !== 'rss') throw Error('Unexpected RSS document');
    const cutoff = Date.parse(today+'T00:00:00Z') - 45*86400000;
    const rows = [];
    for (const item of [...parsed.querySelectorAll('channel > item')].slice(0,35)) {
      const title = short(item.querySelector('title')?.textContent,180);
      const url = short(item.querySelector('link')?.textContent,600);
      const published = Date.parse(item.querySelector('pubDate')?.textContent);
      if (!title || !url || !Number.isFinite(published) || published < cutoff) continue;
      if (!/open call|calls? for |submission|opportunit|accep\w* pitches|grants?|freelanc|commission|tender|residen|funding|appel|candidature|bourse|concours/i.test(title)) continue;
      const isRoundup=/^\d+\s|roundup|round-up/i.test(title);
      rows.push({title,url,kind:!isRoundup&&/pitch|submissions/i.test(title)?'intake':'open',
        description:'Published '+new Date(published).toISOString().slice(0,10)+'. Review the listing for the original brief, terms and current status.',
        providerTime:new Date(published).toISOString(),providerState:'unknown'});
    }
    return rows;
  }
  function directory(text,feed) {
    const layouts={
      '4culture':{cards:'.grant-card',anchor:'h3 a',date:'.application-deadline-date',body:'.grant-card__body',firstParty:true},
      artquest:{cards:'.pt-opportunity',anchor:'.lp-copy h5 a',date:'.deadline',body:'.lp-copy p:not(.deadline):not(.website)',official:'.website a'},
      culture360:{cards:'.c360-card-opportunity',anchor:'.card-title a',date:'.card-header p.mb-0',body:'.item-footer-category'}
    };
    const layout=layouts[feed.format];
    const fragment=document.createElement('template');
    fragment.innerHTML=text;
    const cards=fragment.content.querySelectorAll(layout.cards);
    if(!cards.length)throw Error('Directory unavailable or layout changed');
    const rows=[];
    for(const card of [...cards].slice(0,50)) {
      const anchor=card.querySelector(layout.anchor);
      const raw=anchor?.getAttribute('href');
      if(!raw)continue;
      const url=new URL(raw,feed.url);
      const title=short(anchor.textContent,180);
      if(url.origin!==new URL(feed.url).origin || url.href.length>600 || !title)continue;
      const value=card.querySelector(layout.date)?.textContent.trim().replace(/^deadline:\s*/i,'')||'';
      const british=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
      const english=/^(?:[A-Za-z]{3} \d{1,2}, \d{4}|\d{1,2} [A-Za-z]{3} \d{4})$/.test(value)
        ? Date.parse(value+' GMT'):NaN;
      const closing=british?british[3]+'-'+british[2]+'-'+british[1]:
        Number.isFinite(english)?new Date(english).toISOString().slice(0,10):'';
      const description=short(card.querySelector(layout.body)?.textContent.replace(/\s+/g,' '),900);
      rows.push({url:url.href,title,description,closing,kind:/grants?|funding|residen/i.test(title+' '+description)?'grant':'open',
        official:layout.firstParty?url.href:layout.official?card.querySelector(layout.official)?.getAttribute('href'):'',
        organizer:layout.firstParty?feed.name:'',providerState:'unknown'});
    }
    return rows;
  }
  async function collect(key, feed, today, identify) {
    const now = Date.now(), cached = cooldowns.get(key);
    if (cached && cached.until > now) return {...cached.result,cached:true};
    let rows = [], pages = 0, error = '', limited = false;
    try {
      const first = await raw(key,feed);
      pages = 1;
      if (feed.format === 'rss') rows = rss(first,today);
      else if(feed.format==='ocds') {
        const json = JSON.parse(first);
        rows = procurement(json,today);
        if (typeof json.links?.next === 'string') {
          const cursor = new URL(json.links.next,feed.url).searchParams.get('cursor');
          if (cursor && /^[A-Za-z0-9_+.=/\-]{1,300}$/.test(cursor)) {
            try {
              rows.push(...procurement(JSON.parse(await raw(key,feed,cursor)),today));
              pages++;
            } catch (failure) { limited=failure.status===429;error = limited?'Page 2 rate limited':'Page 2 unavailable'; }
          }
        }
      } else rows=directory(first,feed);
    } catch (failure) { limited=failure.status===429;error = failure.message || 'Source unavailable'; }
    rows = rows.map(row=>({...row,source:feed.name,region:feed.region,language:feed.language,
      lane:identify(row.title+' '+row.description),seenAt:pages?today:''}));
    const result = {name:feed.name,pages,count:rows.length,error,rows};
    cooldowns.set(key,{until:now+(limited?900000:pages?600000:120000),result});
    return result;
  }
  async function sweep(today, identify) {
    const feeds = await config();
    return Promise.all(Object.entries(feeds).map(([key,feed])=>collect(key,feed,today,identify)));
  }
  async function interest(article,language, day = new Date()) {
    const topic = short(article,100).replace(/\s+/g,'_');
    if (!topic || !['en','es','fr','pt','de','ar','ja'].includes(language)) throw Error('Enter a Wikipedia article title and language.');
    const stamp = offset => new Date(day.getTime()-offset*86400000).toISOString().slice(0,10).replaceAll('-','')+'00';
    const start = stamp(29), end = stamp(2);
    const query = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/'+language+'.wikipedia/all-access/user/'+
      encodeURIComponent(topic)+'/daily/'+start+'/'+end;
    const proxy = new URL('../wide-feed.php',location.href);
    proxy.search = new URLSearchParams({source:'wiki',language,topic,start,end}).toString();
    let raw;
    try {raw = await read(await fetch(proxy,{credentials:'omit',signal:AbortSignal.timeout(8500)}));}
    catch (error) {
      if (window.ArchiveNative || (error.status && error.status!==404 && error.status!==405)) throw error;
      raw = await read(await fetch(query,{credentials:'omit',signal:AbortSignal.timeout(9000)}));
    }
    const body = JSON.parse(raw);
    const counts = new Map();
    for (const item of body.items ?? []) {
      if (typeof item.timestamp === 'string' && /^\d{10}$/.test(item.timestamp) && item.timestamp>=start &&
          item.timestamp<=end && Number.isSafeInteger(item.views) && item.views>=0) counts.set(item.timestamp,item.views);
    }
    if (counts.size < 21) throw Error('Too few published days for this article.');
    return {topic,language,kind:'interest',value:[...counts.values()].reduce((a,b)=>a+b,0),
      start:start.slice(0,8),end:end.slice(0,8),days:counts.size,url:query,observed:day.toISOString().slice(0,10)};
  }
  return {sweep,interest};
})();
