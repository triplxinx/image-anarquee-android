'use strict';

window.WideNet = (() => {
  const lanes = {
    licensing:['Photography and licensing','photo essay','photo assignment','image licensing','documentary photography','photo research','street photography','photo series','photography'],
    design:['Illustration and design','poster design','graphic design','illustration','cover art','zine','comics','visual identity','publication design'],
    video:['Film, sound and motion','documentary','short film','animation','video production','motion graphics','oral history','sound design','podcast','multimedia','film'],
    copy:['Editorial, writing and research','editorial','essay','storytelling','script','translation','writing','public humanities'],
    landing:['Interactive, web and exhibitions','interactive','digital exhibition','web design','digital archive','immersive','installation','virtual exhibition']
  };
  const defaults={
    cause:'housing justice, mutual aid, harm reduction, labor, civil rights, anti-displacement, community organizing, disability justice, abolition, indigenous sovereignty, public memory',
    aesthetic:'street photography, documentary, urban, archival, zine, collage, speculative, counterculture, satire, night photography, DIY, experimental'
  };
  const sources=[
    ['On the Move','Global arts calls by country','https://on-the-move.org/news/countries'],
    ['TransArtists','Global residencies and artist calls','https://www.transartists.org/en/call-artists'],
    ['NYFA','U.S. open calls and opportunities','https://www.nyfa.org/opportunities/'],
    ['Creative Capital','U.S. artist funding and opportunities','https://creative-capital.org/artist-resources/artist-opportunities/'],
    ['4Culture','Seattle and King County','https://www.4culture.org/grants-artist-calls/'],
    ['Grants.gov','U.S. funding notices','https://www.grants.gov/search-grants'],
    ['TED','European public contracts','https://ted.europa.eu/en/search/result'],
    ['EU Culture and Creativity','European creative funding','https://culture.ec.europa.eu/funding/calls'],
    ['GETS','Aotearoa New Zealand public tenders','https://www.procurement.govt.nz/suppliers/gets/'],
    ['Remotive','Remote design and creative jobs','https://remotive.com/remote-jobs/design']
  ];
  const starter=[
    ['CCA–WRI Fellowship · Vacancy','https://www.cca.qc.ca/en/101525/cca-wri-research-fellowship-program','2026-11-30','grant','copy',
      'CAD 5,000 monthly. Consider a Seattle documentary photography or public memory research proposal on vacancy and displacement. Requires substantial practice or relevant doctoral research and one to three months in Montréal.',
      'Research on vacancy with an in-person Montréal residency.'],
    ['Gallery 4Culture · Exhibition proposals','https://www.4culture.org/grants/gallery-4culture/','2026-12-10','open','landing',
      'Pioneer Square exhibition for eligible King County artists. Consider an urban photography and zine installation about housing justice or neighborhood change.',
      'King County residency and an exhibition proposal.'],
    ['Housing Assistance Council · Website redesign RFP','https://ruralhome.org/rfp-website-redesign/','2026-12-15','commission','landing',
      'USD 50,000–75,000. U.S.-registered vendor required. Accessible website redesign with multimedia and content migration for rural affordable housing. Scope with an experienced delivery team.',
      'U.S.-registered vendor with comparable references and capacity for a full website redesign.'],
    ['New Orleans Jazz & Heritage Archive · Research grant','https://www.jazzandheritage.org/fellowship-research-grant-2/','2026-12-15','grant','copy',
      'USD 5,000. Louisiana music and cultural heritage research, with a prior record of public scholarship. Consider a public memory project built around a specific archive collection.',
      'Louisiana music or cultural heritage and evidence of completed scholarship.'],
    ['4Culture · 2D public art roster','https://www.4culture.org/grants/4culture-public-art-roster-2d/','2027-01-14','open','design',
      'Washington State artists can submit a portfolio for possible future design-only commissions. Includes photography, graphic design, print and collage. A roster place does not guarantee work.',
      'Washington residency and ability to supply fabrication-ready 2D artwork.'],
    ['International Mute Photo Festival · Nature Ate the Pixels','https://on-the-move.org/news/international-mute-photo-festival-2027-call-photography-greece','2027-04-30','open','licensing',
      'Create a new lo-fi photography series using a children’s thermal printer camera. Free international open call with exhibition production support for selected work.',
      'Adult series of six to nine images made with a children’s thermal printer camera.',
      'https://drive.google.com/file/d/1h8TdcgL9GO-gKWc3VmX4saFE-FhQOSnd/view']
  ].map(([title,url,closing,kind,lane,description,niche,official=url])=>
    ({title,url,closing,kind,lane,description,niche,official,source:'Starter shortlist · checked Nov 26, 2026'}));
  const languages={
    en:['"request for proposals" OR "open call" OR "paid pitch"','"documentary" OR "visual storytelling" OR "graphic design"','"community archive" OR "housing justice"'],
    es:['"convocatoria" OR "licitación" OR "comisión artística"','"documental" OR "fotografía" OR "diseño gráfico"','"memoria colectiva" OR "derecho a la vivienda"'],
    fr:['"appel à projets" OR "appel d’offres" OR "commande artistique"','"documentaire" OR "photographie" OR "graphisme"','"mémoire collective" OR "droit au logement"'],
    pt:['"edital" OR "chamada aberta" OR "licitação"','"documentário" OR "fotografia" OR "design gráfico"','"memória coletiva" OR "direito à moradia"'],
    de:['"Ausschreibung" OR "Open Call"','"Dokumentarfilm" OR "Fotografie" OR "Grafikdesign"','"Erinnerungskultur" OR "Wohnungslosigkeit"'],
    ar:['"دعوة مفتوحة" OR "طلب عروض"','"فيلم وثائقي" OR "تصوير فوتوغرافي" OR "تصميم"','"ذاكرة جماعية" OR "الحق في السكن"'],
    ja:['"公募" OR "企画提案"','"ドキュメンタリー" OR "写真" OR "デザイン"','"地域アーカイブ" OR "住まいの権利"']
  };
  const kinds={commission:'Commission or tender',intake:'Editorial or licensing intake',grant:'Grant or residency',open:'Open call or exhibition',other:'Other request'};
  const plans={
    licensing:'Inventory usable images or plan a new shoot, then allow for editing, captions and rights review.',
    design:'Confirm dimensions and usage, then budget concept development, a draft, revisions and final exports.',
    video:'Budget sourcing or capture, edit, sound and captions, then reserve time for review and delivery.',
    copy:'Allow time for sourcing, outline, draft, fact-checking and revision.',
    landing:'Confirm scope and accessibility, then budget a prototype, content, testing and delivery.'
  };
  const storageKey='imag3.wide-net.v1';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const options=map=>Object.entries(map).map(([key,value])=>'<option value="'+esc(key)+'">'+esc(Array.isArray(value)?value[0]:value)+'</option>').join('');
  const words=value=>String(value??'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,40);
  const normalize=text=>' '+String(text??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()+' ';
  const matches=(text,terms)=>terms.filter(term=>text.includes(normalize(term)));
  const today=()=>new Date().toISOString().slice(0,10);
  function link(value) {
    try {
      const url=new URL(value);
      if(url.protocol!=='https:'||url.username||url.password)return '';
      url.hash='';
      for(const key of [...url.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(key))url.searchParams.delete(key);
      return url.href;
    } catch {return '';}
  }
  function status(state,row) {
    const text=normalize([row.title,row.description].join(' '));
    const cause=matches(text,words(state.cause)), aesthetic=matches(text,words(state.aesthetic));
    const media=matches(text,lanes[row.lane].slice(1));
    const competition=competitionSignal(row);
    const score=Math.min(cause.length,4)*5+Math.min(aesthetic.length,4)*3+Math.min(media.length,3)*2;
    const hard=Number(row.hours), available=Number(row.available);
    const buffered=Math.ceil(hard*1.3*2)/2;
    let capacity='Needs production estimate';
    if(row.closing&&row.closing<today())capacity='Application closed';
    else if(row.production&&row.production<today())capacity='Production date passed';
    else if(row.approach==='existing')capacity='Existing work · confirm rights and scope';
    else if(row.approach==='new'&&row.production&&hard>0&&available>0) {
      capacity=buffered<=available?'Plan fits entered hours':'Over available hours';
    }
    return {cause,aesthetic,media,score,capacity,buffered,competition};
  }
  function competitionSignal(row) {
    const observed=Number(row.applicants);
    const age=(Date.parse(today())-Date.parse(row.reviewedOn||''))/86400000;
    const recent=row.official && link(row.official) && age>=0 && age<=14 && (!row.closing||row.closing>=today());
    const measured=recent && link(row.competitionSource) && String(row.applicants??'').trim()!=='' &&
      Number.isInteger(observed) && observed>=0;
    return {recent,measured,observed,low:measured&&observed<=10};
  }
  function closingDate(raw) {
    const parts=/^(\d\d)\/(\d\d)\/(\d{4})$/.exec(raw||'');
    return parts?parts[3]+'-'+parts[1]+'-'+parts[2]:'';
  }
  function fromGrant(item) {
    const closing=closingDate(item.closeDate);
    if(!/^\d+$/.test(item.id)||item.oppStatus!=='posted'||!item.title||(closing&&closing<today()))return null;
    return {url:'https://www.grants.gov/search-results-detail/'+item.id,title:item.title,description:[
      item.agencyName||item.agency||item.agencyCode,item.number].filter(Boolean).join(' · '),
      lane:identifyLane(item.title),kind:'grant',closing,source:'Grants.gov'};
  }
  function identifyLane(title) {
    const text=normalize(title);
    const ranked=Object.entries(lanes).map(([key,terms])=>[key,matches(text,terms.slice(1)).length]).sort((a,b)=>b[1]-a[1]);
    return ranked[0][1]?ranked[0][0]:'copy';
  }
  const queries=[
    {keyword:'documentary',fundingCategories:'AR|HU'},
    {keyword:'photography',fundingCategories:'AR|HU'},
    {keyword:'digital media',fundingCategories:'AR|HU'},
    {keyword:'community stories',fundingCategories:'AR|HU'}
  ];
  async function browserSweep() {
    const settled=await Promise.allSettled(queries.map(async query=>{
      const reply=await fetch('https://api.grants.gov/v1/api/search2',{
        method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',
        signal:AbortSignal.timeout(12000),body:JSON.stringify({...query,rows:25,oppStatuses:'posted'})});
      if(!reply.ok)throw Error('Grants.gov unavailable');
      const json=await reply.json();
      if(!Array.isArray(json.data?.oppHits))throw Error('Unexpected Grants.gov response');
      return json.data.oppHits.slice(0,25).map(fromGrant).filter(Boolean);
    }));
    const successful=settled.filter(job=>job.status==='fulfilled');
    return {rows:successful.flatMap(job=>job.value),summary:successful.length+'/'+queries.length+' Grants.gov searches completed.'};
  }
  function makeQuery(language,theme) {
    const [ask,medium,subject]=languages[language]||languages.en;
    const focus=String(theme??'').trim().slice(0,80).replace(/["<>]/g,'');
    return '('+ask+') ('+medium+') ('+subject+(focus?' OR "'+focus+'"':'')+') after:'+new Date(Date.now()-90*86400000).toISOString().slice(0,10);
  }
  function searchHref(language,theme) {
    const url=new URL('https://www.google.com/search');
    url.searchParams.set('q',makeQuery(language,theme));
    url.searchParams.set('hl',language);
    return url.href;
  }
  const markup = `
    <header class="sectiontop"><h1>Wide Net</h1><p>Find creative requests by cause, aesthetic and medium. Keep work you can make in time in the running.</p></header>
    <div class="wide-grid" data-wide-net>
    <section class="card"><h2>Search the public web</h2>
      <button class="primary" type="button" data-wide-sweep data-help="Search supported public opportunity sources. Check the original listing for eligibility, pay, and deadlines.">Sweep live sources</button> <button class="quiet" type="button" data-wide-starter>Load reviewed starter leads</button>
      <form class="wide-search"><label class="field">Search language<select name="language">
      ${options({en:'English',es:'Español',fr:'Français',pt:'Português',de:'Deutsch',ar:'العربية',ja:'日本語'})}</select></label>
      <label class="field">Optional theme<input type="search" name="theme" maxlength="80" placeholder="e.g. disability justice"></label>
      <button class="quiet" type="submit">Open web search</button></form>
      <details><summary>Browse source directories</summary><ul>${sources.map(([name,description,url])=>'<li><a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(name)+'</a> · '+esc(description)+'</li>').join('')}</ul></details>
      <details data-wide-profile><summary>Gallery and cause profile</summary><form>
        <label class="field">Causes and subjects, separated by commas<textarea name="cause" maxlength="1600"></textarea></label>
        <label class="field">Aesthetics and approaches, separated by commas<textarea name="aesthetic" maxlength="1600"></textarea></label>
        <button class="quiet" type="submit">Save profile</button></form></details>
      <p class="small" role="status" data-wide-status></p>
    </section>
    <section class="card"><h2>Review a brief</h2><form data-wide-editor class="formgrid">
      <label class="field wide">Opportunity title<input required name="title" maxlength="180"></label>
      <label class="field wide">Original public listing URL<input required name="url" type="url" maxlength="600"></label>
      <label class="field wide">Deliverables, subject, eligibility and terms<textarea name="description" rows="3" maxlength="2000"></textarea></label>
      <label class="field">Medium<select name="lane">${options(lanes)}</select></label>
      <label class="field">Type<select name="kind">${options(kinds)}</select></label>
      <label class="field">Application deadline<input name="closing" type="date"></label>
      <label class="field">Production deadline<input name="production" type="date"></label>
      <label class="field wide">How would you deliver it?<select name="approach"><option value="">Unscoped</option><option value="existing">Adapt existing work</option><option value="new">Produce new work</option></select></label>
      <label class="field">Estimated production hours<input name="hours" type="number" min="0.5" step="0.5" max="10000"></label>
      <label class="field">Your available hours before delivery<input name="available" type="number" min="0.5" step="0.5" max="10000"></label>
      <p class="small wide" data-wide-plan></p>
      <details class="wide"><summary>Verify source and competition</summary>
        <label class="field">Official organizer or application URL<input name="official" type="url" maxlength="600"></label>
        <label class="field">Narrow eligibility, unusual brief or special medium<input name="niche" maxlength="300" placeholder="e.g. Original thermal-camera photo series"></label>
        <label class="field">Public applicant or bid count<input name="applicants" type="number" min="0" step="1" max="10000000"></label>
        <label class="field">URL showing the count<input name="competitionSource" type="url" maxlength="600"></label>
        <label><input type="checkbox" name="reviewed"> I checked the organizer’s posting and verified any count entered above</label>
        <p class="small">Narrow requirements are a niche signal. Competition stays unknown without a published count.</p>
      </details>
      <div class="row wide"><button class="primary" type="submit">Save brief</button><button type="button" class="quiet" data-wide-new>New brief</button><button type="button" class="quiet" data-wide-remove hidden>Remove brief</button></div>
    </form></section>
    <section class="card wide-results"><div class="spread"><h2>Opportunity shortlist</h2><label class="field">Show<select data-wide-filter><option value="all">All briefs</option><option value="new">Produce new work</option><option value="fit">Fits entered hours</option><option value="strong">Cause and aesthetic overlap</option><option value="niche">Reviewed · specific niche</option><option value="low">Reviewed · 10 or fewer observed applicants</option></select></label></div>
      <div data-wide-output></div></section></div>`;
  let state={...defaults,rows:[]}, root, busy=false, editing='';
  try {
    const saved=JSON.parse(localStorage.getItem(storageKey));
    if(Array.isArray(saved?.rows))state={...state,...saved,rows:saved.rows.filter(row=>row&&Object.hasOwn(lanes,row.lane))};
  } catch {}
  function notify(message) {
    const output=root?.querySelector('[data-wide-status]');
    if(output)output.textContent=message;
  }
  function persist(next) {
    try {localStorage.setItem(storageKey,JSON.stringify(next));state=next;return true;}
    catch {notify('Storage is full or unavailable. Existing briefs are still here.');return false;}
  }
  function render() {
    if(!root?.isConnected)return;
    const filter=root.querySelector('[data-wide-filter]').value;
    const rows=state.rows.map(row=>[row,status(state,row)]).filter(([row,fit])=>{
      if(filter==='new')return row.approach==='new';
      if(filter==='fit')return fit.capacity==='Plan fits entered hours';
      if(filter==='strong')return fit.cause.length&&fit.aesthetic.length;
      if(filter==='niche')return fit.competition.recent&&row.niche;
      if(filter==='low')return fit.competition.low;
      return true;
    }).sort((a,b)=>Number(b[1].competition.low)-Number(a[1].competition.low)||
      Number(Boolean(b[1].competition.recent&&b[0].niche))-Number(Boolean(a[1].competition.recent&&a[0].niche))||
      b[1].score-a[1].score||Number(b[1].capacity==='Plan fits entered hours')-Number(a[1].capacity==='Plan fits entered hours'));
    root.querySelector('[data-wide-output]').innerHTML=rows.length?rows.map(([row,fit])=>`
      <article class="wide-listing"><h3>${esc(row.title)}</h3><p class="small">${esc(kinds[row.kind])} · ${esc(row.source||'Saved by you')}${row.closing?' · Apply by '+esc(row.closing):''}</p>
      <p class="small">${esc(fit.capacity)}${row.approach==='new'&&Number(row.hours)>0?' · '+fit.buffered+' h with buffer':''}</p>
      <p class="small">${esc(fit.score?'Matched '+[...new Set([...fit.cause,...fit.aesthetic,...fit.media])].join(', '):'Review the listing for cause and aesthetic fit.')}</p>
      <p class="small">${fit.competition.recent?'Organizer checked '+esc(row.reviewedOn):'Verify the organizer'} · ${fit.competition.measured?fit.competition.observed+' applicants or bids observed':'Competition unknown'}${row.niche?' · '+esc(row.niche):''}</p>
      <div class="row">${link(row.official)?'<a href="'+esc(link(row.official))+'" target="_blank" rel="noopener noreferrer">Organizer ↗</a>':''}${fit.competition.measured?'<a href="'+esc(link(row.competitionSource))+'" target="_blank" rel="noopener noreferrer">Count evidence ↗</a>':''}<a href="${esc(link(row.url))}" target="_blank" rel="noopener noreferrer">Original listing ↗</a>
      <button class="quiet" data-wide-edit="${esc(row.url)}">Scope brief</button><button class="quiet" data-wide-queue="${esc(row.url)}">Send to Workdesk</button></div></article>`).join(''):'<p class="small">Save a public listing or sweep live sources to start.</p>';
  }
  function fill(row={}) {
    const form=root.querySelector('[data-wide-editor]');
    form.reset();editing=row.url||'';
    for(const [key,value] of Object.entries(row)){if(form.elements.namedItem(key))form.elements[key].value=value;}
    form.elements.reviewed.checked=false;
    form.querySelector('[data-wide-remove]').hidden=!editing;
    updatePlan(form);
  }
  function updatePlan(form) {
    root.querySelector('[data-wide-plan]').textContent=plans[form.elements.lane.value]||'';
  }
  function receive(result) {
    busy=false;
    addResults(result);
  }
  function addResults(result) {
    const button=root?.querySelector('[data-wide-sweep]');
    if(button)button.disabled=busy;
    const seen=new Set(state.rows.map(row=>row.url));
    const incoming=[];
    for(const raw of Array.isArray(result?.rows)?result.rows:[]){
      if(incoming.length+state.rows.length>=400)break;
      const url=link(raw?.url);
      if(!url||seen.has(url)||!raw.title||!Object.hasOwn(lanes,raw.lane)||!Object.hasOwn(kinds,raw.kind))continue;
      seen.add(url);
      incoming.push({url,title:String(raw.title).slice(0,180),description:String(raw.description||'').slice(0,2000),kind:raw.kind,lane:raw.lane,
        closing:/^\d{4}-\d{2}-\d{2}$/.test(raw.closing)?raw.closing:'',source:String(raw.source||'').slice(0,120),
        official:link(raw.official),niche:String(raw.niche||'').slice(0,300)});
    }
    if(incoming.length&&!persist({...state,rows:[...incoming,...state.rows]}))return;
    render();notify((result?.summary||'Sweep unavailable.')+' '+incoming.length+' new briefs to review.'+(state.rows.length>=400?' Shortlist is full. Remove reviewed items to make room.':''));
  }
  async function sweep() {
    if(busy)return;
    busy=true;root.querySelector('[data-wide-sweep]').disabled=true;
    notify('Searching public sources…');
    if(window.ArchiveNative?.refreshWideNet?.())return;
    try {receive(await browserSweep());} catch {receive({summary:'Live sources unavailable. Browse the directories or save a listing directly.'});}
  }
  function mount(view) {
    root=view.querySelector('[data-wide-net]');
    const editor=root.querySelector('[data-wide-editor]'), profile=root.querySelector('[data-wide-profile] form');
    for(const key of ['cause','aesthetic'])profile.elements[key].value=state[key];
    root.querySelector('[data-wide-sweep]').disabled=busy;
    root.querySelector('[data-wide-sweep]').onclick=sweep;
    root.querySelector('[data-wide-starter]').onclick=()=>addResults({
      rows:starter.filter(row=>row.closing>=today()),summary:'Starter shortlist checked November 26, 2026.'
    });
    root.querySelector('[data-wide-filter]').onchange=render;
    root.querySelector('.wide-search').onsubmit=event=>{
      event.preventDefault();const fields=event.currentTarget.elements;
      const url=searchHref(fields.language.value,fields.theme.value);
      if(window.ArchiveNative?.openWideNetSearch)window.ArchiveNative.openWideNetSearch(url);
      else window.open(url,'_blank','noopener,noreferrer');
    };
    profile.onsubmit=event=>{
      event.preventDefault();
      if(persist({...state,cause:profile.elements.cause.value,aesthetic:profile.elements.aesthetic.value})){
        render();notify('Gallery and cause profile saved.');
      }
    };
    editor.oninput=()=>updatePlan(editor);
    editor.onsubmit=event=>{
      event.preventDefault();
      const values=Object.fromEntries(new FormData(editor));
      const url=link(values.url);
      if(!url||!values.title.trim()){notify('Enter a title and an HTTPS listing URL.');return;}
      if(state.rows.some(row=>row.url===url&&row.url!==editing)){notify('This original listing is already saved. Open it from the shortlist.');return;}
      if(!editing&&state.rows.length>=400){notify('The shortlist is full. Remove reviewed items to make room.');return;}
      const prior=state.rows.find(row=>row.url===editing);
      const official=link(values.official), competitionSource=link(values.competitionSource);
      if((values.official&&!official)||(values.competitionSource&&!competitionSource)){notify('Use HTTPS links for evidence.');return;}
      if(values.reviewed && (!official || (String(values.applicants).trim()!=='' && !competitionSource))){
        notify('Enter the organizer link and a count evidence link if you entered a count.');return;
      }
      const {reviewed,...details}=values;
      const unchanged=prior?.official===official&&prior?.competitionSource===competitionSource&&String(prior?.applicants??'')===values.applicants;
      const row={...details,url,official,competitionSource,title:values.title.trim(),source:prior?.source,
        reviewedOn:reviewed?today():unchanged?prior?.reviewedOn||'':''};
      if(persist({...state,rows:prior?state.rows.map(item=>item===prior?row:item):[row,...state.rows]})){
        fill(row);render();notify('Brief saved.');}
    };
    root.onclick=event=>{
      const edit=event.target.closest('[data-wide-edit]'), queue=event.target.closest('[data-wide-queue]');
      if(event.target.closest('[data-wide-new]'))fill();
      if(event.target.closest('[data-wide-remove]')&&editing&&window.confirm('Remove this brief from Wide Net?')){
        if(persist({...state,rows:state.rows.filter(row=>row.url!==editing)})){fill();render();notify('Brief removed from Wide Net.');}
      }
      if(edit){fill(state.rows.find(row=>row.url===edit.dataset.wideEdit));editor.elements.title.focus();}
      if(queue){
        const row=state.rows.find(row=>row.url===queue.dataset.wideQueue);
        const fit=status(state,row);
        if(window.ArchiveWorkdesk.addScoutedBrief({...row,fit})){notify('Opened in Workdesk. Verify the original brief and contact before outreach.');}
        else notify('The brief could not be saved to Workdesk.');
      }
    };
    fill();render();
  }
  return {markup,mount,receive};
})();
