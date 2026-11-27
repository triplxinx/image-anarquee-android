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
    ['Remotive','Remote design and creative jobs','https://remotive.com/remote-jobs/design'],
    ['Dialogue Earth','Multilingual environmental reporting and visual pitches','https://dialogue.earth/en/pitch/'],
    ['The Sun','Independent photography submissions','https://www.thesunmagazine.org/submit/photography'],
    ['African Culture Fund','African arts and culture calls','https://www.africanculturefund.net/'],
    ['culture360','Asia–Europe cultural opportunities','https://culture360.asef.org/opportunities/'],
    ['CanadaBuys','Canadian public-sector requests','https://canadabuys.canada.ca/en/tender-opportunities'],
    ['UK Find a Tender','UK public tenders','https://www.find-tender.service.gov.uk/Search'],
    ['Artquest','Artist opportunities and support','https://artquest.org.uk/'],
    ['Freedom With Writing','Editorial and freelance pitch leads','https://www.freedomwithwriting.com/']
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
      'https://drive.google.com/file/d/1h8TdcgL9GO-gKWc3VmX4saFE-FhQOSnd/view'],
    ['Dialogue Earth · multimedia pitches','https://dialogue.earth/en/pitch/','','intake','copy',
      'Independent environmental publication. Its public guidelines invite reported pitches and multimedia ideas from local voices in several languages.',
      'Environmental reporting with a clear connection between a local issue and a wider audience.'],
    ['The Sun · photography submissions','https://www.thesunmagazine.org/submit/photography','','intake','licensing',
      'Independent magazine photography intake. Review the current selection, submission rules and licensing terms.',
      'A coherent photographic submission with publication-ready rights.']
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
  const {normalize, terms:words, matched:matches, https:link, route, routeLink, evidenceState, stampChecks,
    evidenceKeys, evidenceLabels, portfolio, production, market, eligibleIdea, ideaFormats, dated, recent} = window.WideTools;
  const storageKey='imag3.wide-net.v1';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const options=map=>Object.entries(map).map(([key,value])=>'<option value="'+esc(key)+'">'+esc(Array.isArray(value)?value[0]:value)+'</option>').join('');
  const regions={global:'Worldwide or unspecified',pnw:'Seattle / Pacific Northwest',us:'United States',uk:'United Kingdom',eu:'Europe',ca:'Canada',apac:'Asia-Pacific',africa:'Africa',latam:'Latin America',mena:'Middle East / North Africa'};
  const languageNames={en:'English',es:'Español',fr:'Français',pt:'Português',de:'Deutsch',ar:'العربية',ja:'日本語'};
  const today=()=>new Date().toISOString().slice(0,10);
  const evidenceDays=()=>Number(state.capacity.recheck)||7;
  function status(row) {
    const text=normalize([row.title,row.description,row.niche].filter(Boolean).join(' '));
    const cause=matches(text,words(state.cause)), aesthetic=matches(text,words(state.aesthetic));
    const media=matches(text,lanes[row.lane].slice(1));
    const proof=evidenceState(row,today(),evidenceDays());
    const plan=production(row,state.capacity,today());
    return {cause,aesthetic,media,proof,plan,assets:portfolio(row,assets,today()),
      score:Math.min(cause.length,4)*5+Math.min(aesthetic.length,4)*3+Math.min(media.length,3)*2};
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
      lane:identifyLane(item.title),kind:'grant',closing,source:'Grants.gov',official:'https://www.grants.gov/search-results-detail/'+item.id,
      organizer:item.agencyName||item.agency||item.agencyCode,providerState:'open',region:'us',language:'en'};
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
    const rows=successful.flatMap(job=>job.value);
    return {rows,health:[{name:'Grants.gov',pages:successful.length,count:rows.length,error:successful.length<queries.length?'Some searches unavailable':''}]};
  }
  function makeQuery(language,theme,region) {
    const [ask,medium,subject]=languages[language]||languages.en;
    const focus=String(theme??'').trim().slice(0,80).replace(/["<>]/g,'');
    const place = region && region!=='global' ? ' "'+regions[region]+'"' : '';
    return '('+ask+') ('+medium+') ('+subject+(focus?' OR "'+focus+'"':'')+')'+place+' after:'+new Date(Date.now()-90*86400000).toISOString().slice(0,10);
  }
  function searchHref(language,theme,region) {
    const url=new URL('https://www.google.com/search');
    url.searchParams.set('q',makeQuery(language,theme,region));
    url.searchParams.set('hl',language);
    return url.href;
  }
  const field=(name,label,type='text',attributes='')=>'<label class="field">'+label+'<input name="'+name+'" type="'+type+'" '+attributes+'></label>';
  const number=(name,label,attributes='min="0" step=".5" max="1000000"')=>field(name,label,'number',attributes);
  const select=(name,label,values)=>'<label class="field">'+label+'<select name="'+name+'">'+options(values)+'</select></label>';
  const area=(name,label,length)=>'<label class="field wide">'+label+'<textarea name="'+name+'" maxlength="'+length+'"></textarea></label>';
  const button=(key,label,style='quiet')=>'<button class="'+style+'" type="button" data-wide-'+key+'>'+label+'</button>';
  const markup= `
    <header class="sectiontop"><h1>Wide Net</h1></header>
    <div class="wide-grid" data-wide-net>
      <section class="card"><h2>Discovery</h2>
        <div class="row">${button('sweep','Sweep live sources','primary')} ${button('starter','Load starter leads')}</div>
        <p class="small" role="status" data-wide-status></p>
        <details><summary>Source health</summary><ul data-wide-health></ul></details>
        <form class="wide-search desk-fields">
          ${select('language','Search language',languageNames)}
          ${select('region','Search region',{global:'Worldwide',...Object.fromEntries(Object.entries(regions).filter(([key])=>key!=='global'))})}
          ${field('theme','Optional theme','search','maxlength="80"')}
          <button class="quiet" type="submit">Open web search</button>
        </form>
        <details><summary>Browse source directories</summary><ul>${sources.map(([name,description,url])=>'<li><a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(name)+'</a> · '+esc(description)+'</li>').join('')}</ul></details>
        <details><summary>Cause and aesthetic profile</summary>
          <form class="formgrid" data-wide-profile>${area('cause','Causes and subjects, comma separated',1600)}${area('aesthetic','Aesthetics, comma separated',1600)}
            <button class="quiet" type="submit">Save profile</button></form>
        </details>
        <details><summary>Capacity and rechecks</summary>
          <form class="formgrid" data-wide-capacity>
            ${number('weekly','Weekly creative hours','min="0" max="168" step=".5"')}
            ${number('floor','Default minimum USD per hour','min="0" max="1000000" step=".01"')}
            ${select('recheck','Evidence recheck interval',{3:'3 days',7:'7 days',14:'14 days'})}
            <label class="wide"><input type="checkbox" name="auto"> Refresh sources daily while Wide Net is open</label>
            <button class="quiet" type="submit">Save capacity and schedule</button>
          </form>
          <form class="formgrid" data-wide-reservation>
            ${field('label','Open gig or other commitment','text','maxlength="120" required')}${number('hours','Reserved hours','min=".5" max="1000" step=".5" required')}
            ${field('start','Starts','date','required')}${field('end','Ends','date','required')}
            <button class="quiet" type="submit">Reserve time</button>
          </form>
          <ul data-wide-commitments></ul>
        </details>
      </section>
      <section class="card"><h2>Review a brief</h2>
        <form data-wide-editor class="formgrid">
          ${field('title','Opportunity title','text','maxlength="180" required')}
          ${field('url','Original listing URL','url','maxlength="600" required')}
          ${area('description','Deliverables, subject and terms',2000)}
          ${select('lane','Medium',lanes)}${select('kind','Type',kinds)}
          ${select('region','Listing region',regions)}${select('language','Listing language',{'':'Unknown',...languageNames})}
          <details class="wide" data-wide-verification><summary>Verify the lead</summary>
            <div class="formgrid">
              ${field('official','First-party posting URL','url','maxlength="600"')}
              ${field('organizer','Organizer or buyer','text','maxlength="180"')}
              ${select('activeStatus','Listing status',{'':'Unknown',open:'Open or accepting',closed:'Closed'})}
              ${field('closing','Application deadline','date')}
              ${select('eligibilityStatus','Eligibility',{'':'Unchecked',eligible:'I meet the criteria',ineligible:'I do not qualify',unclear:'Unclear'})}
              ${field('eligibility','Eligibility excerpt or note','text','maxlength="500"')}
              ${select('payStatus','Compensation',{'':'Unchecked',paid:'Paid',unpaid:'Unpaid',grant:'Grant or stipend',undisclosed:'Checked · undisclosed'})}
              ${field('compensation','Compensation terms, currency and source note','text','maxlength="500"')}
              ${field('application','Official submission URL or public email','text','maxlength="600"')}
              ${field('niche','Narrow eligibility, unusual brief or medium','text','maxlength="300"')}
              ${number('applicants','Published applicant or bid count','min="0" max="10000000" step="1"')}
              ${field('competitionSource','URL showing the count','url','maxlength="600"')}
              <fieldset class="wide"><legend>What did you check against the original evidence today?</legend>
                ${[...evidenceKeys,'count'].map(key=>'<label class="wide-evidence"><input type="checkbox" name="confirm" value="'+key+'"> '+(evidenceLabels[key]||'Published count')+' <small data-wide-check="'+key+'"></small></label>').join('')}
              </fieldset>
            </div>
          </details>
          <details class="wide"><summary>Plan delivery and a small proof</summary>
            <div class="formgrid">
              ${select('approach','Approach',{'':'Unscoped',existing:'Adapt existing work',new:'Produce new work'})}
              ${field('production','Production deadline','date')}
              ${number('units','Recipe units (images, pieces, minutes or pages)')}
              ${number('hours','Override base estimate in hours')}
              ${number('dependencies','Extra hours for dependencies')}
              ${field('dependencyNotes','Dependencies, access or approvals','text','maxlength="500"')}
              ${number('available','Override available hours before delivery')}
              ${number('costs','Direct costs (USD)','min="0" max="1000000" step=".01"')}
              ${number('rateFloor','Override minimum USD per hour','min="0" max="1000000" step=".01"')}
              ${number('quotedFee','Proposed or offered fee (USD)','min="0" max="10000000" step=".01"')}
              <p class="small wide" data-wide-plan></p>
              ${button('reserve-brief','Reserve this plan’s hours')}
            </div>
          </details>
          <details class="wide"><summary>Portfolio matches and overrides</summary>
            <p class="small">Tag images in Album intake to include them here. Matching uses your subjects, visual styles, medium and current rights clearance.</p>
            <div data-wide-asset-list></div>
            <div class="row"><label class="field">Pin a cleared image<select data-wide-asset-select></select></label>${button('pin','Pin image')}</div>
          </details>
          <div class="row wide"><button class="primary" type="submit">Save brief</button>${button('new','New brief')}${button('remove','Remove brief')}</div>
        </form>
      </section>
      <section class="card wide-results"><h2>Opportunity shortlist</h2>
        <div class="desk-fields">
          ${select('filter','Show',{all:'All briefs',active:'Verified active',new:'Produce new work',fit:'Fits production plan',strong:'Cause and aesthetic overlap',niche:'Specific niche · count may be unknown',low:'Verified · 10 or fewer observed',due:'Evidence due for review'})}
          ${select('regionFilter','Listing region',{'':'Any region',...regions})}${select('languageFilter','Listing language',{'':'Any language',...languageNames})}
        </div><div data-wide-output></div>
      </section>
      <section class="card wide-results"><h2>Speculative products</h2>
        <div class="row">${button('refresh-ideas','Refresh ranked ideas','primary')}</div>
        <p class="small">Refresh suggests products for verified briefs and updates saved topic signals. Queue an idea only when current evidence connects it to a verified active brief and official contact route.</p>
        <form class="formgrid" data-wide-idea>
          <label class="field">Related brief<select name="brief" required></select></label>
          ${field('title','Proposed product or deliverable','text','maxlength="180" required')}
          ${area('fit','Why this particular buyer or call is a fit',500)}
          ${field('topic','Wikipedia article title, for optional topic interest','text','maxlength="100"')}
          ${select('wikiLanguage','Wikipedia language',languageNames)}
          ${button('interest','Fetch topic interest')}
          ${select('signal','Evidence type',{interest:'Topic attention',search:'Search interest / count',click:'Observed clicks',purchase:'Observed purchases'})}
          ${number('value','Observed count','min="1" max="1000000000000" step="1" required')}
          ${field('observed','Date checked','date','required')}
          ${field('start','Evidence period start','date','required')}${field('end','Evidence period end','date','required')}
          ${field('evidence','Evidence URL','url','maxlength="600" required')}
          ${field('buy','Public direct-buy URL, if available','url','maxlength="600"')}
          <label class="wide"><input type="checkbox" name="buyConfirmed"> I checked that this URL directly opens a purchase path for this offer</label>
          <button class="quiet" type="submit">Save idea</button>
          <p class="small wide" role="status" data-wide-idea-status></p>
        </form>
        <div data-wide-ideas></div>
      </section>
    </div>`;

  let state={...defaults,rows:[],health:[],ideas:{},capacity:{weekly:0,floor:0,recheck:7,commitments:[],auto:false}};
  let root, busy=false, editing='', assets=[], legacyCallback, timer, lastAutoAttempt=0;
  let filter='all', regionFilter='', languageFilter='', editingIdea='', assetOverrides={pinnedAssets:[],excludedAssets:[]};
  try {
    const saved=JSON.parse(localStorage.getItem(storageKey));
    if(Array.isArray(saved?.rows))state={...state,...saved,capacity:{...state.capacity,...saved.capacity},
      rows:saved.rows.filter(row=>row&&Object.hasOwn(lanes,row.lane)&&link(row.url))};
  } catch {}
  const q=selector=>root?.querySelector(selector);
  const value=(form,name)=>String(form.elements[name].value||'').trim();
  const href=(url,label)=>url?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' ↗</a>':'';
  const writeStatus=(selector,message)=>{const node=q(selector);if(node)node.textContent=message;};
  const notify=message=>writeStatus('[data-wide-status]',message);
  const ideaStatus=message=>writeStatus('[data-wide-idea-status]',message);
  function persist(next) {
    try {localStorage.setItem(storageKey,JSON.stringify(next));state=next;return true;}
    catch {notify('Storage is full or unavailable. Existing briefs are still here.');return false;}
  }
  function currentBrief(url) { return state.rows.find(row=>row.url===url); }
  function editingRow() { return currentBrief(editing)||{}; }
  function verifiedBrief(url) {
    const row=currentBrief(url);
    return row && evidenceState(row,today(),evidenceDays()).active ? row : null;
  }
  function putRow(row) {
    const exists=currentBrief(row.url);
    return persist({...state,rows:exists?state.rows.map(old=>old.url===row.url?row:old):[row,...state.rows]});
  }
  function renderHealth() {
    q('[data-wide-health]').replaceChildren(...state.health.map(item=>{
      const li=document.createElement('li');
      li.textContent=item.name+' · '+(item.pages?item.count+' candidates from '+item.pages+' response(s)':'Unavailable')+
        (item.error?' · '+item.error:'')+(item.date?' · '+item.date:'')+(item.cached?' · cached':'');
      return li;
    }));
  }
  function proofText(row,proof) {
    if(proof.closed || row.activeStatus==='closed')return 'Closed';
    if(proof.active)return 'Verified active · checked '+proof.checked;
    if(row.eligibilityStatus==='ineligible')return 'Eligibility mismatch';
    if(row.eligibilityStatus==='unclear')return 'Eligibility unclear';
    return 'Check '+(proof.missing.length?proof.missing.map(key=>evidenceLabels[key].toLowerCase()).join(', '):'listing status');
  }
  function render() {
    if(!root?.isConnected)return;
    renderHealth();
    const rows=state.rows.filter(row=>(!regionFilter||(row.region||'global')===regionFilter)&&(!languageFilter||row.language===languageFilter))
      .map(row=>[row,status(row)]).filter(([row,fit])=>{
        if(filter==='new')return row.approach==='new';
        if(filter==='fit')return fit.plan.fits&&!fit.proof.closed&&row.activeStatus!=='closed';
        if(filter==='strong')return fit.cause.length&&fit.aesthetic.length;
        if(filter==='niche')return Boolean(row.niche);
        if(filter==='low')return fit.proof.low;
        if(filter==='active')return fit.proof.active;
        if(filter==='due')return !fit.proof.closed && row.activeStatus!=='closed' &&
          (fit.proof.missing.some(key=>row.checks?.[key]) || row.providerChanged || (row.checks?.count&&!fit.proof.measured));
        return true;
      }).sort((a,b)=>Number(b[1].proof.low)-Number(a[1].proof.low)||
        Number(b[1].proof.active)-Number(a[1].proof.active)||
        Number(Boolean(a[1].proof.closed || a[0].activeStatus==='closed'))-Number(Boolean(b[1].proof.closed || b[0].activeStatus==='closed'))||
        b[1].score-a[1].score||Number(b[1].plan.fits)-Number(a[1].plan.fits)||b[1].assets.length-a[1].assets.length);
    q('[data-wide-output]').innerHTML=rows.length?rows.slice(0,400).map(([row,fit])=>`
      <article class="wide-listing">
        <h3>${esc(row.title)}</h3><p class="small">${esc(kinds[row.kind])} · ${esc(row.source||'Saved by you')} · ${esc(regions[row.region]||regions.global)}${row.closing?' · Apply by '+esc(row.closing):''}</p>
        <p class="small">${esc(proofText(row,fit.proof))} · ${fit.proof.measured?fit.proof.observed+' observed applicants or bids':row.niche?'Niche signal · count unknown':'Competition unknown'}${row.niche?' · '+esc(row.niche):''}</p>
        ${row.providerChanged?'<p class="small">'+esc(row.providerChanged)+'</p>':''}
        ${row.approach?'<p class="small">'+esc(fit.plan.status)+' · '+fit.plan.buffered+' h with buffer</p>':''}
        <p class="small">${esc(fit.score?'Matched '+[...new Set([...fit.cause,...fit.aesthetic,...fit.media])].join(', '):'Review the brief for fit.')}${fit.assets.length?' · '+fit.assets.length+' cleared portfolio matches':''}</p>
        <div class="row">${href(link(row.url),'Listing')}${href(link(row.official),'First-party evidence')}${href(routeLink(row.application),'Application route')}${fit.proof.measured?href(link(row.competitionSource),'Count evidence'):''}
          <button class="quiet" data-wide-edit="${esc(row.url)}">Review brief</button>
          <button class="quiet" data-wide-queue="${esc(row.url)}">Open in Workdesk</button>
        </div>
      </article>`).join(''):'<p class="small">No briefs match this view.</p>';
    renderIdeas();
    renderReservations();
  }
  const briefFields=['title','url','description','lane','kind','region','language','official','organizer','activeStatus',
    'closing','eligibilityStatus','eligibility','payStatus','compensation','application','niche','applicants','competitionSource',
    'approach','production','units','hours','dependencies','dependencyNotes','available','costs','rateFloor','quotedFee'];
  function formRow(form) {
    return {...editingRow(),...Object.fromEntries(briefFields.map(key=>[key,value(form,key)])),...assetOverrides};
  }
  function renderAssets(row) {
    const found=portfolio(row,assets,today());
    q('[data-wide-asset-list]').innerHTML=found.length?found.map(match=>{
      const {asset,causes,styles,medium,pinned}=match;
      const why=[...causes.map(x=>'subject: '+x),...styles.map(x=>'style: '+x),medium?'same medium':'',pinned?'pinned':''].filter(Boolean);
      const tags=[...causes,...styles];
      const excerpt=(row.description||'').split(/(?<=[.!?])\s+|\n+/).find(line=>matches(normalize(line),tags).length);
      return '<article class="wide-listing"><strong>'+esc(asset.name)+'</strong><p class="small">'+esc(asset.album)+' · '+esc(why.join(' · '))+
        (asset.rightsNotes?' · '+esc(asset.rightsNotes):'')+'</p>'+
        (excerpt?'<p class="small">Brief excerpt: '+esc(excerpt.slice(0,180))+'</p>':'')+'<div class="row">'+
        (asset.hasMedia?'<button type="button" class="quiet" data-wide-compose="'+esc(asset.hash)+'">Compose in Studio</button>':'')+
        '<button type="button" class="quiet" data-wide-hide-asset="'+esc(asset.hash)+'">Exclude from this brief</button></div></article>';
    }).join(''):'<p class="small">No matching cleared images. Tag images in Album intake or pin a cleared image below.</p>';
    const select=q('[data-wide-asset-select]');
    if(select.dataset.indexed==='yes')return;
    select.dataset.indexed='yes';
    const selected=select.value;
    select.innerHTML='<option value="">Select an image</option>'+assets
      .filter(x=>x.rights==='cleared' && (!x.rightsUntil || dated(x.rightsUntil)>=dated(today())))
      .map(x=>'<option value="'+esc(x.hash)+'">'+esc(x.name)+' · '+esc(x.album)+'</option>').join('');
    select.value=selected;
  }
  function updatePlan(form, refreshAssets=false) {
    const row=formRow(form);
    const plan=production(row,state.capacity,today());
    const facts=[plan.status,plan.hours?plan.buffered+' h with buffer':'',plan.available===null?'':plan.available.toFixed(1)+' h free',
      plan.booked?plan.booked+' h reserved by other commitments':'',plan.quote===null?'':'Minimum quote $'+plan.quote.toFixed(2),
      plan.earning===null?'':'Net $'+plan.earning.toFixed(2)+'/hour at entered fee'];
    if(plan.recipe)facts.push(plan.recipe.name+' · proof: '+plan.recipe.proof);
    writeStatus('[data-wide-plan]',facts.filter(Boolean).join(' · '));
    if(refreshAssets)renderAssets(row);
  }
  function fill(row={}) {
    const form=q('[data-wide-editor]');
    form.reset();
    editing=row.url||'';
    assetOverrides={pinnedAssets:row.pinnedAssets||[],excludedAssets:row.excludedAssets||[]};
    for(const key of briefFields)if(row[key]!=null)form.elements[key].value=row[key];
    for(const key of [...evidenceKeys,'count']) {
      const stamp=row.checks?.[key];
      writeStatus('[data-wide-check="'+key+'"]',stamp?'Checked '+stamp+(recent(today(),stamp,evidenceDays())?'':' · recheck due'):'');
    }
    q('[data-wide-remove]').hidden=!editing;
    updatePlan(form,true);
  }
  function saveBrief(event) {
    event.preventDefault();
    const form=event.currentTarget, prior=editingRow(), row=formRow(form);
    row.url=link(row.url);
    if(!row.url||!row.title){notify('Enter a title and an HTTPS listing URL.');return;}
    if(currentBrief(row.url)&&row.url!==editing){notify('This listing is already saved.');return;}
    if(!editing && state.rows.length>=400){notify('Shortlist full. Remove a brief to make room.');return;}
    for(const key of ['official','competitionSource']){
      if(row[key]&&!link(row[key])){notify('Use HTTPS links for evidence.');return;}
      row[key]=link(row[key]);
    }
    if(row.application&&!route(row.application)){notify('Use an HTTPS application link or a public email address.');return;}
    if(row.url!==editing && editing && prior.providerSnapshot) {
      delete row.providerSnapshot;
      delete row.providerKey;
      delete row.providerState;
    }
    const confirmations=new FormData(form).getAll('confirm');
    const base=editing && row.url===editing ? prior : {};
    row.checks=stampChecks(base,row,confirmations,today());
    if (confirmations.some(key=>row.checks[key]!==today())) {
      notify('Complete the corresponding evidence fields before confirming them.');return;
    }
    if(evidenceState(row,today(),evidenceDays()).active)delete row.providerChanged;
    if(editing && editing!==row.url){
      const ideas={...state.ideas};
      if(ideas[editing]){ideas[row.url]=ideas[editing];delete ideas[editing];}
      const commitments=state.capacity.commitments.map(r=>r.brief===editing?{...r,id:'brief:'+row.url,brief:row.url}:r);
      if(!persist({...state,ideas,capacity:{...state.capacity,commitments},rows:state.rows.map(old=>old.url===editing?row:old)}))return;
    }else if(!putRow(row))return;
    fill(row);render();notify('Brief saved.');
  }
  const sourceRegion={'Grants.gov':'us','EU TED':'eu','On the Move':'global'};
  function ingest(rawRows, health) {
    const rows=state.rows.slice();
    const byUrl=new Map(rows.map((row,i)=>[row.url,i]));
    const byKey=new Map(rows.flatMap((row,i)=>row.providerKey?[[row.source+'|'+row.providerKey,i]]:[]));
    let added=0, changed=0;
    const candidates=new Map();
    for(const raw of rawRows) {
      const url=link(raw?.url), official=link(raw?.official);
      if(!url||!raw.title||!Object.hasOwn(lanes,raw.lane)||!Object.hasOwn(kinds,raw.kind))continue;
      const source=String(raw.source||'').slice(0,120);
      const providerKey=String(raw.providerKey||'').slice(0,160);
      const key=providerKey?source+'|'+providerKey:url;
      if(candidates.has(key) && String(candidates.get(key).providerTime||'')>String(raw.providerTime||''))continue;
      const fields={title:String(raw.title).slice(0,180), description:String(raw.description||'').slice(0,2000),
        closing:Number.isFinite(dated(raw.closing))?raw.closing:'', official, organizer:String(raw.organizer||'').slice(0,180),
        providerState:['open','closed'].includes(raw.providerState)?raw.providerState:'unknown'};
      candidates.set(key,{...fields,url,source,providerKey,providerTime:String(raw.providerTime||''),kind:raw.kind,lane:raw.lane,
        region:Object.hasOwn(regions,raw.region)?raw.region:sourceRegion[source]||'global',
        language:Object.hasOwn(languageNames,raw.language)?raw.language:source==='Grants.gov'?'en':'',
        niche:String(raw.niche||'').slice(0,300),providerSnapshot:fields,seenAt:today()});
    }
    for(const incoming of candidates.values()) {
      const {providerSnapshot:snapshot}=incoming;
      const key=incoming.providerKey?incoming.source+'|'+incoming.providerKey:'';
      const index=byUrl.get(incoming.url)??byKey.get(key);
      if(index===undefined) {
        if (rows.length>=400 || incoming.providerState==='closed' || (incoming.closing&&incoming.closing<today()))continue;
        byUrl.set(incoming.url,rows.length);
        if(key)byKey.set(key,rows.length);
        rows.push(incoming);added++;continue;
      }
      const row=rows[index], previous=row.providerSnapshot;
      if (row.providerTime && incoming.providerTime && row.providerTime>incoming.providerTime)continue;
      if (!previous && row.source && row.source!==incoming.source && row.providerKey)continue;
      const delta=previous?Object.keys(snapshot).filter(k=>snapshot[k]!==previous[k]):[];
      if(!previous && Number.isFinite(dated(incoming.closing)) && row.closing && incoming.closing!==row.closing)delta.push('closing');
      const checkChanges=new Set(delta.flatMap(k=>({
        closing:['posting'],organizer:['organizer'],official:evidenceKeys,description:['posting','eligibility','pay','route'],
        title:['posting'],providerState:['posting']}[k]||[])));
      const next={...row,providerSnapshot:snapshot,providerState:incoming.providerState,
        source:row.source||incoming.source,providerKey:incoming.providerKey||row.providerKey,
        providerTime:incoming.providerTime||row.providerTime,seenAt:incoming.seenAt};
      for(const key of ['title','description','closing','official','organizer']){
        if ((!row[key] || (previous && row[key]===previous[key])) && snapshot[key])next[key]=snapshot[key];
      }
      if(checkChanges.size){
        changed++;
        next.checks=Object.fromEntries(Object.entries(row.checks||{}).filter(([k])=>!checkChanges.has(k)));
        next.providerChanged='Source changed. Review the affected evidence before relying on this lead.';
      }
      if(key)byKey.set(key,index);
      rows[index]=next;
    }
    const next={...state,rows,...(health?{health,lastSweep:health.some(x=>x.pages)?today():state.lastSweep}: {})};
    if(!persist(next))return;
    render();
    notify(added+' new candidates · '+changed+' with evidence changes'+(rows.length>=400?' · Shortlist full':''));
  }
  function receive(result) {
    if(legacyCallback)legacyCallback(result);
  }
  function legacySweep() {
    if(!window.ArchiveNative?.refreshWideNet)return browserSweep();
    return new Promise(resolve=>{
      const finish=result=>{
        clearTimeout(timeout);
        legacyCallback=null;
        resolve(result);
      };
      const timeout=setTimeout(()=>finish({rows:[],health:[{name:'Android scout',pages:0,error:'Timed out'}]}),29000);
      legacyCallback=finish;
      if(!window.ArchiveNative.refreshWideNet())finish({rows:[],health:[]});
    });
  }
  async function sweep() {
    if(busy)return;
    busy=true;
    if(q('[data-wide-sweep]'))q('[data-wide-sweep]').disabled=true;
    notify('Searching and rechecking public sources…');
    try {
      const [legacy,extra]=await Promise.allSettled([legacySweep(),window.WideSources.sweep(today(),identifyLane)]);
      const initial=legacy.status==='fulfilled'?legacy.value:{rows:[]};
      const additional=extra.status==='fulfilled'?extra.value:[{name:'Additional feeds',pages:0,error:'Unavailable',rows:[]}];
      const health=[...(initial.health||[{name:'Core sources',pages:initial.rows?.length?1:0,count:initial.rows?.length||0,error:initial.summary||''}]),...additional]
        .map(({rows,...item})=>({...item,date:today()}));
      ingest([...(initial.rows||[]),...additional.flatMap(item=>item.rows)],health);
    } catch (error) {notify(error.message||'Source sweep failed. Saved results are retained.');
    } finally {
      busy=false;
      if(q('[data-wide-sweep]'))q('[data-wide-sweep]').disabled=false;
    }
  }
  function recheck() {
    if(!root?.isConnected||document.hidden)return;
    render();
    if(state.capacity.auto && state.lastSweep!==today() && (!lastAutoAttempt || Date.now()-lastAutoAttempt>=3600000)){
      lastAutoAttempt=Date.now();void sweep();
    }
  }
  function renderReservations() {
    q('[data-wide-commitments]').innerHTML=state.capacity.commitments.map(x=>
      '<li>'+esc(x.label)+' · '+x.hours+' h · '+esc(x.start)+' to '+esc(x.end)+
      ' <button type="button" class="quiet" data-wide-release="'+esc(x.id)+'">Release</button></li>').join('');
  }
  function reserve(commitment) {
    if(state.capacity.commitments.length>=200 && !state.capacity.commitments.some(x=>x.id===commitment.id)){
      notify('Remove an old commitment before adding another.');return false;
    }
    if(!persist({...state,capacity:{...state.capacity,commitments:[...state.capacity.commitments.filter(x=>x.id!==commitment.id),commitment]}}))return false;
    render();updatePlan(q('[data-wide-editor]'));notify('Time reserved. Other briefs now include this commitment.');return true;
  }
  function ideaFor(url) { return Object.hasOwn(state.ideas,url)?state.ideas[url]:null; }
  function fillIdea(url) {
    const form=q('[data-wide-idea]');
    form.reset();
    editingIdea=url;
    form.elements.brief.value=url;
    const idea=ideaFor(url), lead=currentBrief(url);
    if(!lead)return;
    form.elements.title.value=idea?.title||ideaFormats[lead.lane];
    form.elements.fit.value=idea?.fit||'';
    form.elements.topic.value=idea?.query?.topic||'';
    form.elements.wikiLanguage.value=idea?.query?.language||'en';
    form.elements.buy.value=idea?.buy||'';
    form.elements.buyConfirmed.checked=Boolean(idea?.buy);
    if(idea)fillSignal(form,idea.signal);
  }
  function fillSignal(form,signal) {
    for(const [key,value] of Object.entries({signal:signal.kind,value:signal.value,observed:signal.observed,start:signal.start,end:signal.end,evidence:signal.url}))
      form.elements[key].value=value;
  }
  function renderIdeas() {
    const select=q('[data-wide-idea]')?.elements.brief;
    if(!select)return;
    select.innerHTML='<option value="">Choose a brief</option>'+[...state.rows]
      .sort((a,b)=>Number(Boolean(verifiedBrief(b.url)))-Number(Boolean(verifiedBrief(a.url))))
      .map(row=>'<option value="'+esc(row.url)+'">'+esc(row.title)+(verifiedBrief(row.url)?' · verified':' · needs review')+'</option>').join('');
    select.value=editingIdea;
    const list=Object.entries(state.ideas).map(([url,idea])=>{
      const row=currentBrief(url);
      return {url,idea,row,score:market(idea,today()),ready:row&&eligibleIdea(idea,row,today(),evidenceDays())};
    }).filter(x=>x.row).sort((a,b)=>Number(Boolean(b.ready))-Number(Boolean(a.ready))||(b.score?.points||0)-(a.score?.points||0));
    q('[data-wide-ideas]').innerHTML=list.length?list.map(({url,idea,row,score,ready})=>`
      <article class="wide-listing"><h3>${esc(idea.title)}</h3><p class="small">${esc(row.title)} · ${esc(score?.signal||'Evidence expired')} · ${esc(idea.signal.observed)}</p>
      <p class="small">${esc(idea.fit)} · ${ready?'Ready to queue':'Review the lead and current signal before queuing'}</p>
      <div class="row">${href(link(idea.signal.url),'Demand evidence')}${ready?href(routeLink(row.application),'Buyer route'):''}
      ${ready?href(recent(today(),idea.buyChecked,evidenceDays())?link(idea.buy):'','Direct buy'):''}
      <button type="button" class="quiet" data-wide-edit-idea="${esc(url)}">Edit idea</button>
      <button type="button" class="quiet" data-wide-queue-idea="${esc(url)}" ${ready?'':'disabled'}>Queue idea in Workdesk</button></div></article>`).join(''):'<p class="small">Choose a brief to draft your first product idea.</p>';
  }
  function saveIdea(event) {
    event.preventDefault();
    const form=event.currentTarget, row=currentBrief(value(form,'brief'));
    if(!row){ideaStatus('Choose a saved brief.');return;}
    const evidence=link(value(form,'evidence')), buy=link(value(form,'buy'));
    if(!evidence||(value(form,'buy')&&(!buy||!form.elements.buyConfirmed.checked))){
      ideaStatus('Use HTTPS evidence and confirm any direct-buy link.');return;
    }
    const idea={title:value(form,'title'),fit:value(form,'fit'),buy,buyChecked:buy?today():'',
      signal:{kind:value(form,'signal'),value:Number(value(form,'value')),observed:value(form,'observed'),
        start:value(form,'start'),end:value(form,'end'),url:evidence}};
    if(form.interestQuery?.url===evidence && form.interestQuery?.value===idea.signal.value && idea.signal.kind==='interest' &&
        form.interestQuery?.start===idea.signal.start && form.interestQuery?.end===idea.signal.end &&
        form.interestQuery?.observed===idea.signal.observed)
      idea.query={topic:form.interestQuery.topic,language:form.interestQuery.language};
    else if(ideaFor(row.url)?.signal?.url===evidence && idea.signal.kind==='interest' && ideaFor(row.url).signal.value===idea.signal.value)
      idea.query=ideaFor(row.url)?.query;
    if(!idea.title||!market(idea,today())){ideaStatus('Enter a current, dated signal and a valid evidence window.');return;}
    if(!persist({...state,ideas:{...state.ideas,[row.url]:idea}}))return;
    renderIdeas();ideaStatus('Idea saved. '+(eligibleIdea(idea,row,today(),evidenceDays())?'Ready to queue.':'Check the official lead and describe the fit to enable queuing.'));
  }
  async function getInterest(topic,language) {
    const result=await window.WideSources.interest(topic,language);
    const iso=stamp=>stamp.slice(0,4)+'-'+stamp.slice(4,6)+'-'+stamp.slice(6,8);
    return {...result,start:iso(result.start),end:iso(result.end)};
  }
  async function fetchInterest(button) {
    const form=q('[data-wide-idea]'), url=editingIdea;
    const topic=value(form,'topic'), language=value(form,'wikiLanguage');
    if(!topic){ideaStatus('Enter the exact Wikipedia article title.');return;}
    button.disabled=true;ideaStatus('Fetching published topic views…');
    try{
      const sample=await getInterest(topic,language);
      if(url!==editingIdea||!form.isConnected||topic!==value(form,'topic')||language!==value(form,'wikiLanguage'))return;
      form.interestQuery=sample;
      fillSignal(form,sample);
      ideaStatus(sample.value+' topic views over '+sample.days+' reporting days. Save the idea to keep the evidence.');
    }catch(error){if(form.isConnected&&url===editingIdea)ideaStatus(error.message||'Topic data unavailable. Previous evidence is retained.');}
    finally{button.disabled=false;}
  }
  function suggestedTopic(brief) {
    const text=normalize(brief.title+' '+brief.description);
    const topics=[[' street photography ','Street photography'],[' zine ','Zine'],[' oral history ','Oral history'],
      [' housing justice ','Housing inequality'],[' community organizing ','Community organizing'],
      [' collage ','Collage'],[' film festival ','Film festival'],[' graphic design ','Graphic design']];
    return topics.find(([phrase])=>text.includes(phrase))?.[1] ||
      {licensing:'Documentary photography',design:'Illustration',video:'Short film',copy:'Oral history',landing:'Web design'}[brief.lane];
  }
  async function refreshIdeas(button) {
    button.disabled=true;ideaStatus('Refreshing saved topic signals and ranking current evidence…');
    try{
      const queue=Object.entries(state.ideas).filter(([,idea])=>idea.query&&idea.signal.observed!==today())
        .slice(0,9).map(([url,idea])=>({url,idea,query:idea.query}));
      const suggested=state.rows.filter(row=>!ideaFor(row.url)&&verifiedBrief(row.url))
        .sort((a,b)=>status(b).score-status(a).score).slice(0,5).map(brief=>({url:brief.url,brief,
          query:{topic:suggestedTopic(brief),language:'en'}}));
      queue.push(...suggested);
      let refreshed=0, proposed=0, unavailable=0;
      for(let i=0;i<queue.length;i+=3){
        const batch=queue.slice(i,i+3);
        const samples=await Promise.allSettled(batch.map(({query})=>getInterest(query.topic,query.language)));
        for(const [j,sample] of samples.entries()){
          const {url,idea,brief,query}=batch[j];
          if(sample.status==='rejected'){unavailable++;continue;}
          if(idea && ideaFor(url)!==idea)continue;
          if(!idea && (ideaFor(url)||!verifiedBrief(url)))continue;
          const product=idea||{title:(ideaFormats[brief.lane]+' for '+brief.organizer).slice(0,180),fit:'',query};
          if(persist({...state,ideas:{...state.ideas,[url]:{...product,signal:sample.value}}})) {
            if(idea)refreshed++;else proposed++;
          }
        }
      }
      if(root?.isConnected)renderIdeas();
      ideaStatus(proposed+' suggested · '+refreshed+' signals refreshed · '+unavailable+' unavailable. Confirm buyer fit before queuing.');
    }finally{button.disabled=false;}
  }
  function queueLead(url,idea) {
    const row=currentBrief(url);
    if(!row)return;
    const fit=status(row);
    if(idea&&!eligibleIdea(idea,row,today(),evidenceDays())){ideaStatus('This idea needs a verified active route and current evidence.');return;}
    if(!window.ArchiveWorkdesk.addScoutedBrief({...row,fit,idea,
      buy:idea&&recent(today(),idea.buyChecked,evidenceDays())?idea.buy:''})){
      notify('The brief could not be saved to Workdesk.');return;
    }
    notify('Opened in Workdesk.');
  }
  function bind(rootNode) {
    const form=q('[data-wide-editor]');
    form.onsubmit=saveBrief;
    form.oninput=event=>updatePlan(form,['title','description','niche','lane'].includes(event.target.name));
    const profile=q('[data-wide-profile]');
    for(const key of ['cause','aesthetic'])profile.elements[key].value=state[key];
    profile.onsubmit=event=>{
      event.preventDefault();
      if(persist({...state,cause:value(profile,'cause'),aesthetic:value(profile,'aesthetic')})){render();notify('Profile saved.');}
    };
    const settings=q('[data-wide-capacity]');
    for(const key of ['weekly','floor','recheck'])settings.elements[key].value=state.capacity[key];
    settings.elements.auto.checked=state.capacity.auto;
    settings.onsubmit=event=>{
      event.preventDefault();
      if(persist({...state,capacity:{...state.capacity,weekly:Number(value(settings,'weekly')),floor:Number(value(settings,'floor')),
        recheck:Number(value(settings,'recheck')),auto:settings.elements.auto.checked}})){
        updatePlan(form);recheck();notify('Capacity and recheck schedule saved.');
      }
    };
    q('[data-wide-reservation]').onsubmit=event=>{
      event.preventDefault();
      const f=event.currentTarget, start=value(f,'start'), end=value(f,'end');
      if(dated(end)<dated(start)){notify('End must be on or after start.');return;}
      if(reserve({id:crypto.randomUUID(),label:value(f,'label'),hours:Number(value(f,'hours')),start,end}))f.reset();
    };
    q('.wide-search').onsubmit=event=>{
      event.preventDefault();const f=event.currentTarget;
      const url=searchHref(value(f,'language'),value(f,'theme'),value(f,'region'));
      if(window.ArchiveNative?.openWideNetSearch)window.ArchiveNative.openWideNetSearch(url);
      else window.open(url,'_blank','noopener,noreferrer');
    };
    q('[data-wide-sweep]').disabled=busy;
    q('[data-wide-sweep]').onclick=()=>void sweep();
    q('[data-wide-starter]').onclick=()=>ingest(starter.filter(row=>row.kind==='intake'||row.closing>=today()));
    for(const [name,chosen,callback] of [['filter',filter,x=>filter=x],['regionFilter',regionFilter,x=>regionFilter=x],
      ['languageFilter',languageFilter,x=>languageFilter=x]]){
      const select=q('select[name='+name+']');
      select.value=chosen;select.onchange=()=>{callback(select.value);render();};
    }
    const ideas=q('[data-wide-idea]');
    ideas.onsubmit=saveIdea;
    ideas.elements.brief.onchange=()=>{ideas.interestQuery=null;fillIdea(ideas.elements.brief.value);ideaStatus('');};
    ideas.elements.buy.oninput=()=>ideas.elements.buyConfirmed.checked=false;
    q('[data-wide-interest]').onclick=event=>void fetchInterest(event.currentTarget);
    q('[data-wide-refresh-ideas]').onclick=event=>void refreshIdeas(event.currentTarget);
    rootNode.onclick=event=>{
      const node=event.target.closest('button');
      if(!node)return;
      const {wideEdit,wideQueue,wideCompose,wideHideAsset,wideRelease,wideEditIdea,wideQueueIdea}=node.dataset;
      if(wideEdit){fill(currentBrief(wideEdit));form.elements.title.focus();return;}
      if(wideQueue){queueLead(wideQueue);return;}
      if(wideEditIdea){ideas.interestQuery=null;fillIdea(wideEditIdea);ideas.elements.title.focus();return;}
      if(wideQueueIdea){queueLead(wideQueueIdea,ideaFor(wideQueueIdea));return;}
      if(wideCompose){void window.ArchiveIntake.openForStudio(wideCompose).catch(error=>notify(error.message));return;}
      if(wideHideAsset){
        assetOverrides={pinnedAssets:assetOverrides.pinnedAssets.filter(x=>x!==wideHideAsset),
          excludedAssets:[...new Set([...assetOverrides.excludedAssets,wideHideAsset])]};updatePlan(form,true);return;
      }
      if(wideRelease){if(persist({...state,capacity:{...state.capacity,commitments:state.capacity.commitments.filter(x=>x.id!==wideRelease)}})){
        render();updatePlan(form);
      }return;}
      if(node.matches('[data-wide-pin]')){
        const hash=q('[data-wide-asset-select]').value;
        if(hash){
          assetOverrides={pinnedAssets:[...new Set([hash,...assetOverrides.pinnedAssets])].slice(0,5),
            excludedAssets:assetOverrides.excludedAssets.filter(x=>x!==hash)};updatePlan(form,true);
        }return;
      }
      if(node.matches('[data-wide-reserve-brief]')){
        const row=editingRow(), plan=row.url?production(row,state.capacity,today()):null;
        if(!plan?.hours||!row.production||row.production<today()){notify('Save a brief with an estimate and future production deadline first.');return;}
        reserve({id:'brief:'+row.url,brief:row.url,label:row.title,hours:plan.buffered,start:today(),end:row.production});
        return;
      }
      if(node.matches('[data-wide-new]'))fill();
      if(node.matches('[data-wide-remove]')&&editing&&window.confirm('Remove this brief and its speculative idea?')){
        const ideas={...state.ideas};delete ideas[editing];
        if(persist({...state,ideas,rows:state.rows.filter(row=>row.url!==editing),
          capacity:{...state.capacity,commitments:state.capacity.commitments.filter(x=>x.brief!==editing)}})){
          if(editingIdea===editing)fillIdea('');
          fill();render();notify('Brief removed.');
        }
      }
    };
  }
  function mount(view) {
    root=view.querySelector('[data-wide-net]');
    const node=root;
    bind(node);
    fill(currentBrief(editing));
    render();
    fillIdea(editingIdea);
    clearInterval(timer);
    timer=setInterval(()=>{
      if(!node.isConnected){clearInterval(timer);return;}
      recheck();
    },60000);
    void window.ArchiveIntake.wideAssets().then(list=>{
      if(node!==root||!node.isConnected)return;
      assets=list.map(asset=>({...asset,tags:{subjects:words(asset.subjects),styles:words(asset.styles)}}));
      delete q('[data-wide-asset-select]').dataset.indexed;
      render();
      updatePlan(q('[data-wide-editor]'),true);
    }).catch(()=>{if(node.isConnected){assets=[];notify('Portfolio tags are unavailable.');}});
    recheck();
  }
  document.addEventListener('visibilitychange',recheck);
  return {markup,mount,receive,verifiedBrief,ideaFor,directBuy(url){
    const row=verifiedBrief(url), idea=ideaFor(url);
    return row&&eligibleIdea(idea,row,today(),evidenceDays())&&recent(today(),idea.buyChecked,evidenceDays())?link(idea.buy):'';
  },eligibleWorkload(url){
    const row=verifiedBrief(url), idea=ideaFor(url);
    return row&&idea&&eligibleIdea(idea,row,today(),evidenceDays())?market(idea,today()):null;
  }};
})();
