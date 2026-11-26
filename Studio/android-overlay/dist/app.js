'use strict';

const leads = window.ARCHIVE_LEADS.slice();
const steps = window.ARCHIVE_PLAN;
const key = 'archive-launch-desk.v1';
const statuses = ['To contact','Contacted','Replied','Quoted','Booked','Paid','Paused','Closed'];
const names = {studio:'Authoring Studio',launch:'Launch plan',leads:'Lead desk',albums:'Album intake',systems:'Systems',workdesk:'Workdesk',cards:'Trading cards',affiliates:'Affiliates',merch:'XXXINK merch'};
const seedAlbums = [
  {id:'boooo',name:'BOOOO',url:'',rights:'Review needed',notes:'Seattle night, cityscapes, street documentary. Review depicted artwork and signs per use.'},
  {id:'prnto',name:'PRNTO',url:'',rights:'Review needed',notes:'Glitch, mirrored texture and monochrome studies. Find clean originals where previews show app controls.'},
  {id:'hhf',name:'HHF',url:'',rights:'Permission needed',notes:'Surreal botanical imagery. Google Photos credits another album creator. Confirm ownership or permission at image level.'}
];

function fresh(){
  return {version:1,step:0,checks:{},tracking:{},albums:seedAlbums.map(a=>({...a})),files:[],extraLeads:[],leadUpdates:{},profile:{name:'Ellis D.',email:'',goal:1000}};
}
function isMap(value){return value && typeof value==='object' &&!Array.isArray(value);}
function validate(data){
  if(!isMap(data)||data.version!==1||!isMap(data.checks)||!isMap(data.tracking)||
     !Array.isArray(data.albums)||!Array.isArray(data.files)||!isMap(data.profile)||
     ('extraLeads' in data&&!Array.isArray(data.extraLeads))||
     data.albums.some(x=>!isMap(x))||data.files.some(x=>!isMap(x))||
     Object.values(data.tracking).some(x=>!isMap(x))) throw new Error('This is not a valid Archive Desk backup.');
  return {...fresh(),...data,step:Math.max(0,Math.min(steps.length-1,Number(data.step)||0))};
}
let state=fresh();
try{const saved=localStorage.getItem(key);if(saved)state=validate(JSON.parse(saved));}catch {}
function restoreLeads(){
  leads.splice(0,leads.length,...window.ARCHIVE_LEADS.map(lead=>({...lead,...(isMap(state.leadUpdates?.[lead.id])?state.leadUpdates[lead.id]:{}),id:lead.id})));
  const ids=new Set(leads.map(lead=>lead.id));
  for(const lead of state.extraLeads??[]){
    if(isMap(lead)&&/^custom-[a-f0-9-]+$/.test(lead.id)&&typeof lead.name==='string'&&typeof lead.background==='string'&&typeof lead.album==='string'&&typeof lead.kind==='string'&&typeof lead.pitch==='string'&&typeof lead.angleA==='string'&&typeof lead.angleB==='string'&&!ids.has(lead.id)){leads.push(lead);ids.add(lead.id);}
  }
}
restoreLeads();
let filters={search:'',kind:'',album:'',status:''};
const view=document.querySelector('#view');
let timer;

function saved(){
  try{localStorage.setItem(key,JSON.stringify(state));return true;}
  catch {toast('Browser storage is unavailable. Export a backup before closing.');return false;}
}
function toast(message){
  const el=document.querySelector('#toast');
  el.textContent=message;el.classList.add('show');
  clearTimeout(timer);timer=setTimeout(()=>el.classList.remove('show'),2700);
}
function esc(value){
  return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function safeUrl(value){
  try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}
}
function link(url,label,css=''){
  const href=safeUrl(url);
  return href?'<a class="'+esc(css)+'" href="'+esc(href)+'" rel="noopener noreferrer" target="_blank">'+esc(label)+' ↗</a>':'';
}
function links(items){return items.map(([label,url])=>link(url,label,'quiet')).join('');}
function options(list,selected,placeholder){
  return (placeholder===undefined?'':'<option value="">'+esc(placeholder)+'</option>')+
    list.map(value=>'<option'+(value===selected?' selected':'')+'>'+esc(value)+'</option>').join('');
}
function current(){const tab=location.hash.slice(1);return names[tab]?tab:'launch';}
function data(id){return state.tracking[id]??{};}
function statusOf(id){return data(id).status||statuses[0];}
function dateISO(date=new Date()){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');}
function dueDate(now=new Date()){
  const date=new Date(now);
  for(let left=3;left>0;){date.setDate(date.getDate()+1);if(date.getDay()%6!==0)left--;}
  return dateISO(date);
}
function dueLeads(onlyDue){
  return leads.filter(lead=>{
    const entry=data(lead.id);
    return /^\d{4}-\d{2}-\d{2}$/.test(entry.follow||'')&&
      !['Booked','Paid','Closed','Paused'].includes(statusOf(lead.id))&&(!onlyDue||entry.follow<=dateISO());
  }).sort((a,b)=>data(a.id).follow.localeCompare(data(b.id).follow));
}
function money(n){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);}
function completed(step){return steps[step].checks.every((_,i)=>state.checks[step+'-'+i]);}
function cashReceived(){return leads.reduce((sum,lead)=>sum+(Number(data(lead.id).received)||0),0);}
function pageIntro(kicker,title,description){
  return '<div class="sectiontop"><p class="kicker">'+esc(kicker)+'</p><h1>'+esc(title)+'</h1><p class="muted">'+esc(description)+'</p></div>';
}
function renderLaunch(){
  const i=state.step,step=steps[i],done=steps.filter((_,index)=>completed(index)).length;
  const cash=cashReceived(),goal=Number(state.profile.goal)||1000;
  const due=dueLeads(true);
  return '<section class="hero"><div><p class="kicker">First-hour walkthrough</p><h1>Launch your archive.</h1><p>Get one offer, one way to take payment, and five pitches ready. Work the checklist from step one.</p></div>'+
    '<div class="herostat"><strong>'+done+' / '+steps.length+'</strong><small>checkpoints completed</small><div class="progress" role="progressbar" aria-label="Launch progress" aria-valuemin="0" aria-valuemax="'+steps.length+'" aria-valuenow="'+done+'"><span style="width:'+done/steps.length*100+'%"></span></div></div></section>'+
    '<section class="card"><button class="quiet" onclick="if(window.ArchiveNative?.configureBackgroundScout){window.ArchiveNative.configureBackgroundScout(!window.ArchiveNative.backgroundScoutEnabled());this.textContent=\'Scout setting updated\';}">Toggle background scouting</button> <a href="#workdesk">Open Workdesk</a></section><div class="metricstrip"><a class="metric" href="#leads" data-metric="all"><small>Prospects</small><strong>'+leads.length+'</strong></a><a class="metric" href="#leads" data-metric="due"><small>Follow-ups due</small><strong>'+due.length+'</strong></a><a class="metric" href="#leads" data-metric="cash"><small>Cash received</small><strong>'+money(cash)+' / '+money(goal)+'</strong></a></div>'+
    '<div class="layout"><section class="card"><p class="kicker">Step '+(i+1)+' of '+steps.length+' · '+step.time+'</p><h2>'+esc(step.title)+'</h2><p>'+esc(step.why)+'</p><fieldset class="checks" aria-label="Step checklist">'+
    step.checks.map((check,j)=>'<label><input type="checkbox" data-check="'+i+'-'+j+'"'+(state.checks[i+'-'+j]?' checked':'')+'><span>'+esc(check)+'</span></label>').join('')+
    '</fieldset><div class="checkpoint"><b>Checkpoint</b> · '+esc(step.gate)+'</div><div class="row">'+links(step.links)+'</div>'+
    '<div class="row stepsbuttons">'+(i>0?'<button class="quiet" data-step="'+(i-1)+'">← Back</button>':'')+
    (i<steps.length-1?'<button class="primary" data-step="'+(i+1)+'">Next step →</button>':'<a class="primary" href="#leads">Open lead desk →</a>')+'</div></section>'+
    '<div><section class="card"><h3>One-hour path</h3><ol class="path">'+steps.map((s,j)=>'<li><button data-step="'+j+'"'+(i===j?' aria-current="step"':'')+'><span class="node">'+(completed(j)?'✓':j+1)+'</span><span>'+esc(s.title)+'</span><time>'+s.time+'</time></button></li>').join('')+
    '</ol></section><section class="card"><div class="spread"><h3>Due follow-ups</h3><button class="quiet" data-calendar>Calendar file ↓</button></div>'+
    (due.length?'<ul class="due">'+due.map(x=>'<li><a href="#leads" data-open-lead="'+x.id+'">'+esc(x.name)+'</a> · '+esc(data(x.id).follow)+'</li>').join('')+'</ul>':'<p class="small">Log a sent pitch to get a follow-up date.</p>')+'</section></div></div>';
}
function pitchText(lead,choice){
  const content=choice==='A'?lead.angleA:lead.angleB;
  const name=String(state.profile.name||'').trim();
  const email=String(state.profile.email||'').trim();
  if(lead.name==='Seattle Met')return content;
  return content.trim()+'\n\n[Relevant sample link]'+(name?'\n'+name:'')+(email?'\n'+email:'');
}
function pitchBox(lead,choice){
  if(lead.name==='Seattle Met')return '<section class="pitchbox"><h3>Research angle '+choice+'</h3><p>'+esc(pitchText(lead,choice))+'</p><p class="small">Develop and write your submission yourself under their policy.</p></section>';
  return '<section class="pitchbox"><h3>Pitch '+choice+'</h3><p>'+esc(pitchText(lead,choice))+'</p><button class="quiet" data-copy-pitch="'+lead.id+':'+choice+'">Copy pitch '+choice+'</button> <button class="quiet" data-license-pitch="'+lead.id+':'+choice+'">Create licensing preview</button> <button class="quiet" data-studio-lead="'+lead.id+':'+choice+'">Compose in Studio</button></section>';
}
function renderLead(lead){
  const entry=data(lead.id);
  return '<details class="lead" id="'+lead.id+'"><summary><strong>'+esc(lead.name)+'</strong><span><span class="badge '+(lead.kind==='Paid brief'?'warm':'gray')+'">'+esc(lead.kind)+'</span></span><span class="small budget">'+esc(lead.budget)+'</span><span class="small status">'+esc(statusOf(lead.id))+'</span></summary>'+
    '<div class="leaddetail"><div><p class="kicker">'+esc(lead.album)+' · Priority '+lead.priority+'</p><h3>Background</h3><p>'+esc(lead.background)+'</p><p class="small"><b>What to check</b> · '+esc(lead.caveat)+'</p><p class="small"><b>Contact route</b> · '+esc(lead.contact)+'</p><div class="row">'+link(lead.url,'Original lead','quiet')+link(lead.researchUrl,'Research source','quiet')+'</div></div>'+
    '<div class="pitchgrid">'+pitchBox(lead,'A')+pitchBox(lead,'B')+'</div>'+
    '<form class="editor" data-track="'+lead.id+'"><label class="field">Status<select name="status">'+options(statuses,statusOf(lead.id))+'</select></label>'+
    '<label class="field">Follow-up date<input type="date" name="follow" value="'+esc(entry.follow)+'"></label>'+
    '<label class="field">Cash received ($)<input type="number" name="received" min="0" step="0.01" value="'+esc(entry.received)+'"></label><button class="primary">Save lead</button>'+
    '<label class="field wide">Notes<textarea name="notes" placeholder="Sample sent, quote, payment terms, or response">'+esc(entry.notes)+'</textarea></label></form></div></details>';
}
function matching(){
  const term=filters.search.toLowerCase().trim();
  return leads.filter(l=>(!term||[l.name,l.album,l.kind,l.background,l.pitch].some(s=>s.toLowerCase().includes(term)))&&
    (!filters.kind||l.kind===filters.kind)&&(!filters.album||l.album.includes(filters.album))&&
    (!filters.status||(filters.status==='Due today'?dueLeads(true).includes(l):filters.status==='Cash received'?Number(data(l.id).received)>0:statusOf(l.id)===filters.status)));
}
function renderLeadList(){
  const list=matching(),target=document.querySelector('#lead-results');
  target.innerHTML='<div class="resultbar"><span class="small">'+list.length+' of '+leads.length+' leads</span><span class="small">Open a lead for two pitches and research.</span></div>'+
    (list.length?'<div class="leadgrid">'+list.map(renderLead).join('')+'</div>':'<p class="noresult">No leads match those filters.</p>');
}
function renderLeads(){
  return pageIntro('Outreach','Lead desk','Work the paid briefs first, then pitch the strongest fits. Recheck availability and replace the sample placeholder before sending.')+
    '<div class="filters"><label class="field">Search<input id="search" data-filter="search" type="search" placeholder="Name, subject or album" value="'+esc(filters.search)+'"></label>'+
    '<label class="field">Lead type<select data-filter="kind">'+options([...new Set(leads.map(x=>x.kind))],filters.kind,'All types')+'</select></label>'+
    '<label class="field">Album<select data-filter="album">'+options(['BOOOO','PRNTO','HHF'],filters.album,'All albums')+'</select></label>'+
    '<label class="field">Status<select data-filter="status">'+options([...statuses,'Due today','Cash received'],filters.status,'Any status')+'</select></label></div>'+
    '<div class="row" style="margin-bottom:12px"><button class="quiet" data-csv>Export lead log ↓</button><button class="quiet" data-calendar>Export follow-ups ↓</button></div>'+
    '<details class="card" style="margin-bottom:12px"><summary><b>Add a prospect</b></summary><form id="new-lead" class="formgrid" style="margin-top:12px">'+
    '<label class="field">Prospect<input name="name" required maxlength="100"></label><label class="field">Source URL<input name="url" type="url"></label><label class="field">Album or sample<input name="album" maxlength="100"></label><label class="field">Contact route<input name="contact" maxlength="200"></label><label class="field">Background<textarea name="background" maxlength="2500"></textarea></label><label class="field">Pitch A<textarea name="angleA" maxlength="2500"></textarea></label><label class="field">Pitch B<textarea name="angleB" maxlength="2500"></textarea></label><div><button class="primary">Save new lead</button></div></form></details><div id="lead-results"></div>';
}
function renderAlbums(){
  return pageIntro('Archive management','Album intake','Add links and notes as you find them. Scan local files to flag byte-identical copies across batches.')+
    window.ArchiveIntake.markup+'<div class="layout"><section class="card"><h2>Album queue</h2><form id="album-form" class="formgrid">'+
    '<label class="field">Album name<input name="name" required maxlength="100" placeholder="e.g. Seattle nocturnes"></label>'+
    '<label class="field">Album link<input name="url" type="url" placeholder="https://…"></label>'+
    '<label class="field">Rights status<select name="rights">'+options(['Review needed','Owned or licensed','Permission needed','Personal only'],'Review needed')+'</select></label>'+
    '<label class="field">Notes<textarea name="notes" maxlength="1500" placeholder="Source, credits, variants or release questions"></textarea></label><div><button class="primary">Add album</button></div></form>'+
    '<div class="albumlist">'+state.albums.map(a=>'<div class="albumrow"><div class="spread"><h3>'+esc(a.name)+'</h3><span class="badge '+(a.rights==='Owned or licensed'?'':'warm')+'">'+esc(a.rights)+'</span></div><p class="small">'+esc(a.notes)+'</p>'+link(a.url,'Open shared album','quiet')+
    '<details><summary class="small">Edit album</summary><form class="formgrid" data-album-edit="'+esc(a.id)+'"><label class="field">Album name<input name="name" required maxlength="100" value="'+esc(a.name)+'"></label><label class="field">Album link<input name="url" type="url" value="'+esc(a.url)+'"></label><label class="field">Rights status<select name="rights">'+options(['Review needed','Owned or licensed','Permission needed','Personal only'],a.rights)+'</select></label><label class="field">Notes<textarea name="notes" maxlength="1500">'+esc(a.notes)+'</textarea></label><div><button class="quiet">Save changes</button></div></form></details></div>').join('')+'</div></section>'+
    '<section class="card"><h2>Duplicate scan</h2><p>Choose local image files after downloading an album. The scanner compares SHA-256 hashes and keeps names and hashes for later scans. Related crops, edits, and re-exports need visual review.</p><label class="field">Files to compare<input id="scan-files" type="file" accept="image/*" multiple></label>'+
    '<p id="scan-status" role="status" class="small">'+state.files.length+' unique fingerprints saved.</p><div id="scan-output"></div><h3>Overlap checklist</h3><ul class="checkslist"><li>Pick one master for an exact duplicate.</li><li>Co-locate alternate crops and stylized edits.</li><li>Confirm credit and permission before adding files to a commercial batch.</li></ul></section></div>';
}
function renderSystems(){
  return pageIntro('Operations','Systems','Set up what the direct sale needs today, then add marketplaces and repeatable workflows as the archive grows.')+
    '<div class="systemgrid"><section class="card"><h3>Profile and goal</h3><form id="profile-form" class="formgrid"><label class="field">Display name<input name="name" maxlength="100" value="'+esc(state.profile.name)+'"></label>'+
    '<label class="field">Public reply email<input type="email" name="email" value="'+esc(state.profile.email)+'"></label><label class="field">Cash goal ($)<input type="number" name="goal" min="1" step="1" required value="'+esc(state.profile.goal)+'"></label><div><button class="primary">Save profile</button></div></form></section>'+
    '<section class="card"><h3>Backup and reminders</h3><p>Progress and contact notes are saved in this browser. Export a backup if you want to move them to another device. Import replaces the current browser’s data.</p><div class="row"><button class="quiet" data-calendar>Follow-up calendar ↓</button><button class="quiet" data-backup>JSON backup ↓</button></div><label class="field" style="margin-top:12px">Restore JSON backup<input id="import" type="file" accept="application/json,.json"></label></section>'+
    (window.ArchiveNative?.openPhoneHost ? '<section class="card"><h3>Host website</h3><p>Run the XXX!NK licensing site from iMAG3, create previews and check buyer requests.</p><button class="primary" type="button" data-phone-host>Open website host</button></section>' : '')+
    '<section class="card"><h3>Licensing website</h3><form class="formgrid" id="licensing-site-form"><label class="field">XXX!NK site address<input type="url" name="site" required value="'+esc(window.ArchiveLicensing.site())+'"></label><button class="quiet">Save licensing website</button></form></section>'+
    '<section class="card"><h3>Lead updates</h3><p>Import a lead feed to add prospects or refresh existing leads. Outreach notes and statuses stay attached to the lead. Use the same lead ID or name for updates.</p><div class="row"><button class="quiet" data-feed>Export lead feed ↓</button></div><label class="field" style="margin-top:12px">Import lead feed<input id="lead-feed" type="file" accept="application/json,.json"></label><p class="small">Lead feeds contain prospect details and pitches. Use JSON backup to carry your private notes and settings to another device.</p></section>'+
    '<section class="card"><h3>Idle monster</h3><p>Get a tip after 3:33 of inactivity. Dismissing the quote checks public job boards if you’re online.</p><div class="row"><button class="quiet" type="button" data-monster-preview>Meet a monster</button><button class="quiet" type="button" data-monster-toggle>'+(window.IdleMonster?.enabled()===false?'Turn on idle tips':'Turn off idle tips')+'</button></div></section>'+
    window.ARCHIVE_SYSTEMS.map(c=>'<section class="card"><h3>'+esc(c.title)+'</h3><p>'+esc(c.body)+'</p><div class="row">'+links(c.links)+'</div></section>').join('')+'</div>';
}

let requestedLead='';
function openRequested(){
  if(!requestedLead||current()!=='leads')return;
  const target=document.getElementById(requestedLead);
  if(target){target.open=true;target.scrollIntoView({block:'nearest'});target.querySelector('summary').focus();}
  requestedLead='';
}
function render(){
  const tab=current();
  document.body.dataset.surface=tab;
  document.querySelector('#breadcrumb').textContent='WORKSPACE / '+names[tab].toUpperCase();
  document.querySelectorAll('[data-tab]').forEach(a=>{
    if(a.dataset.tab===tab)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  });
  view.innerHTML={studio:()=>window.ArchiveStudio.markup,launch:renderLaunch,leads:renderLeads,albums:renderAlbums,systems:renderSystems,merch:()=>window.Merch.markup,affiliates:()=>window.AffiliateCampaigns.markup,workdesk:() => window.ArchiveWorkdesk.markup,cards:()=>window.CardDesk.markup}[tab]();
  if(tab==='studio')void window.ArchiveStudio.mount(view);
  if(tab==='merch')window.Merch.mount(view,()=>state.merch||{},(id,draft)=>{
    const old=state.merch;state.merch={...old,[id]:draft};if(saved())return true;state.merch=old;return false;
  },product=>{
    const old=state.creatorDesk||{};state.creatorDesk={...old,products:[...(old.products||[]).filter(p=>p.url!==product.url),product],inputs:{...old.inputs,product:product.url}};
    if(saved())return true;state.creatorDesk=old;return false;
  });
  if(tab==='affiliates')window.AffiliateCampaigns.mount(view,state.albums);
  if(tab==='cards')window.CardDesk.mount(view);
  if(tab==='workdesk')window.ArchiveWorkdesk.mount(view);
  if(tab==='leads')renderLeadList();
  window.ArchiveIntake.mount(state.albums);
  openRequested();
}
function download(filename,body,mime){
  const blob=body instanceof Blob?body:new Blob([body],{type:mime});
  if(window.ArchiveNative){
    const reader=new FileReader();
    reader.onload=()=>window.ArchiveNative.saveFile(filename,mime,String(reader.result).split(',',2)[1]);
    reader.onerror=()=>toast('The file could not be prepared for export.');
    reader.readAsDataURL(blob);
    return;
  }
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportFeed(){download('archive-lead-feed.json',JSON.stringify({version:1,leads},null,2),'application/json');}
window.acceptPublicLeadRefresh = result => {
  if (!Array.isArray(result?.leads)) return;
  window.ArchiveWorkdesk.receive(result);
  if (!result.checked) { toast('Could not reach the live job boards. Your saved leads are still available.'); return; }
  if (result.leads.length) {
    const oldCount = leads.length;
    try {
      const previous=[state.extraLeads,state.leadUpdates];
      applyLeadFeed({version:1,leads:result.leads},true);
      if (!saved()){[state.extraLeads,state.leadUpdates]=previous;restoreLeads();return;}
    } catch { toast('Could not update leads. Try again later.'); return; }
    if (current() === 'leads' && !view.querySelector('.lead[open]') && !view.contains(document.activeElement)) renderLeadList();
    toast(result.checked+'/'+result.total+' boards checked · '+(leads.length-oldCount)+' new leads.');
  } else toast(result.checked+'/'+result.total+' boards checked · no matching listings.');
  window.IdleMonster?.setLiveLeads(result.leads);
};
function applyLeadFeed(feed,live=false){
  if(!isMap(feed)||feed.version!==1||!Array.isArray(feed.leads)||!feed.leads.length||(!live && feed.leads.length>5000))throw new Error('Choose a version 1 lead feed containing 1–5,000 leads.');
  const fields = ['name','kind','budget','album','pitch','contact','url','notes','background','angleA','angleB','caveat','researchUrl'];
  const working = leads.map(l=>({...l}));
  const byId=new Map(working.map(l=>[l.id,l]));
  const byUrl=new Map(working.filter(l=>l.url).map(l=>[l.url,l]));
  const byName=new Map(working.map(l=>[l.name.trim().toLowerCase(),l]));
  for(const row of feed.leads){
    if(!isMap(row)||typeof row.name!=='string'||!row.name.trim()||row.name.length>160||fields.some(k=>k in row&&typeof row[k]!=='string'))throw new Error('Each lead needs a name and valid text fields.');
    let found=byId.get(row.id)||byUrl.get(row.url)||(!live && byName.get(row.name.trim().toLowerCase()));
    const clean = Object.fromEntries(fields.filter(k=>k in row).map(k=>[k,row[k].slice(0,5000).trim()]));
    if(clean.url&&!safeUrl(clean.url)||clean.researchUrl&&!safeUrl(clean.researchUrl))throw new Error('Use valid web addresses in lead URLs.');
    const priority = [1,2,3].includes(row.priority)?row.priority:(found?.priority??2);
    if(found){byName.delete(found.name.trim().toLowerCase());byUrl.delete(found.url);Object.assign(found,clean,{priority});}
    else working.push(found={kind:'Added prospect',budget:'Unlisted',album:'',pitch:'',contact:'',url:'',notes:'',background:'',angleA:'',angleB:'',caveat:'Confirm availability and payment.',researchUrl:'',...clean,priority,id:'custom-'+crypto.randomUUID()});
    byId.set(found.id,found);byName.set(found.name.trim().toLowerCase(),found);if(found.url)byUrl.set(found.url,found);
  }
  const builtIn=new Set(window.ARCHIVE_LEADS.map(l=>l.id));
  state.leadUpdates=Object.fromEntries(working.filter(l=>builtIn.has(l.id)).map(l=>[l.id,l]));
  state.extraLeads=working.filter(l=>!builtIn.has(l.id));
  restoreLeads();
}
window.archiveDownload=download;
function backup(){download('archive-desk-backup.json',JSON.stringify(state,null,2),'application/json');}
function exportCsv(){
  const cell=x=>'"'+String(x??'').replace(/^[=+@\-\t\r]/,m=>"'"+m).replace(/"/g,'""')+'"';
  const rows=[['Prospect','Type','Album','Budget','Status','Follow-up','Cash received','Notes','Source'],
    ...leads.map(l=>{const t=data(l.id);return [l.name,l.kind,l.album,l.budget,statusOf(l.id),t.follow,t.received,t.notes,l.url];})];
  download('archive-outreach.csv',rows.map(row=>row.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8');
}
function calendar(){
  const upcoming=dueLeads(false);
  if(!upcoming.length){toast('No follow-up dates yet.');return;}
  const icsEscape=v=>String(v).replace(/\\/g,'\\\\').replace(/[;,]/g,c=>'\\'+c).replace(/\n/g,'\\n');
  const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Archive Desk//Follow-ups//EN','CALSCALE:GREGORIAN'];
  for(const lead of upcoming){
    lines.push('BEGIN:VEVENT','UID:'+lead.id+'-'+data(lead.id).follow+'@archive-launch-desk','DTSTAMP:'+stamp,
      'DTSTART;VALUE=DATE:'+data(lead.id).follow.replace(/-/g,''),'SUMMARY:'+icsEscape('Follow up: '+lead.name),'END:VEVENT');
  }
  lines.push('END:VCALENDAR','');download('archive-follow-ups.ics',lines.join('\r\n'),'text/calendar;charset=utf-8');
}
async function scanFiles(input){
  const status=document.querySelector('#scan-status'),out=document.querySelector('#scan-output');
  const selected=Array.from(input.files);
  if(!selected.length)return;
  const index=new Map(state.files.map(f=>[f.hash,f.name]));
  const duplicates=[],failures=[];
  let added=0;
  input.disabled=true;status.textContent='Scanning '+selected.length+' files locally…';
  for(const file of selected){
    try{
      const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
      const hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
      if(index.has(hash)){duplicates.push(file.name+' matches '+index.get(hash));continue;}
      index.set(hash,file.name);state.files.push({hash,name:file.name,size:file.size});added++;
    }catch{failures.push(file.name);}
  }
  saved();input.disabled=false;input.value='';
  status.textContent=added+' new · '+duplicates.length+' exact duplicates · '+failures.length+' unreadable. '+state.files.length+' unique saved.';
  out.innerHTML=(duplicates.length?'<ul class="files">'+duplicates.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>':'')+
    (failures.length?'<p class="small">Unreadable: '+esc(failures.join(', '))+'</p>':'');
}

document.addEventListener('click',e=>{const a=e.target.closest('[data-metric]');if(!a)return;filters={search:'',kind:'',album:'',status:a.dataset.metric==='due'?'Due today':a.dataset.metric==='cash'?'Cash received':''};});
window.addEventListener('hashchange',()=>{window.scrollTo(0,0);render();});
document.querySelector('#export').addEventListener('click',backup);

const welcome = document.querySelector('#welcome');
const welcomeKey = 'archive-launch-desk.tour.2';
const tour = [
  {title:'Compose an image',description:'Open Authoring Studio, choose a photo or artwork, and pick a format. Try three layout directions, then export a screen image, a print PDF, or a licensing proof.',tab:'studio',action:'Open Authoring Studio'},
  {title:'Start with one design',description:'Open XXXINK merch, search for a shirt you know, and tap its name. You can change its title or try a price. Save listing draft keeps your work on this device.',tab:'merch',action:'Try the merch studio'},
  {title:'Find someone to pitch',description:'For your clothing, open Affiliates and choose a product and an audience. For paid creative jobs, open Workdesk and tap Refresh leads.',tab:'affiliates',action:'Explore Affiliates'},
  {title:'Make a first draft',description:'In Workdesk, tap a record, review its source, then choose Fill pitch. Read and edit the draft before you share it.',tab:'workdesk',action:'Try Workdesk'},
  {title:'Scan a trading card',description:'Open Trading cards and tap New card. Scan the front, back and edges, or import photos. Card scout checks buying routes and carries a draft into Workdesk.',tab:'cards',action:'Open trading cards'},
  {title:'Ask about any control',description:'Tap (?) to turn on help. While it shows (!), tap a control to read its instructions. Close the explanation to explore another control. Tap (!) when you want to use the app normally. Replay this tour from Quick tour.',tab:'launch',action:'Open the launch plan'}
];
let tourStep = 0;
function showTourStep() {
  const {title,description,tab,action} = tour[tourStep];
  document.querySelector('#welcome-title').textContent = (tourStep+1)+' of '+tour.length+' · '+title;
  document.querySelector('#welcome-description').textContent = description;
  const link = document.querySelector('#welcome-action');
  link.href = '#' + tab;
  link.textContent = action;
  document.querySelector('#welcome-back').hidden = tourStep === 0;
  document.querySelector('#welcome-next').textContent = tourStep === tour.length - 1 ? 'Finish' : 'Continue';
}
function openTour() {
  if (typeof welcome.showModal !== 'function' || welcome.open) return;
  tourStep = 0;
  showTourStep();
  welcome.showModal();
}
welcome.addEventListener('close',() => {
  try { localStorage.setItem(welcomeKey,'seen'); } catch {}
});
document.querySelector('#show-welcome').onclick = openTour;
document.querySelector('#welcome-skip').onclick = () => welcome.close();
document.querySelector('#welcome-action').onclick = () => welcome.close();
document.querySelector('#welcome-back').onclick = () => { if (tourStep > 0) tourStep--; showTourStep(); };
document.querySelector('#welcome-next').onclick = () => {
  if (tourStep === tour.length - 1) welcome.close();
  else { tourStep++; showTourStep(); }
};
try { if (!localStorage.getItem(welcomeKey)) openTour(); } catch {}
view.addEventListener('click',async event=>{
  const el=event.target.closest('[data-step],[data-csv],[data-backup],[data-feed],[data-calendar],[data-copy-pitch],[data-open-lead],[data-license-pitch],[data-studio-lead],[data-phone-host]');
  if(!el)return;
  if(el.dataset.step!==undefined){state.step=Number(el.dataset.step);saved();render();view.querySelector('[aria-current=step]')?.focus();}
  if(el.hasAttribute('data-phone-host')) window.ArchiveNative?.openPhoneHost?.();
  if(el.hasAttribute('data-csv'))exportCsv();
  if(el.hasAttribute('data-backup'))backup();
  if(el.hasAttribute('data-feed'))exportFeed();
  if(el.hasAttribute('data-calendar'))calendar();
  if(el.dataset.openLead){requestedLead=el.dataset.openLead;filters={search:'',kind:'',album:'',status:''};}
  if(el.dataset.licensePitch || el.dataset.studioLead){
    const [id,choice]=(el.dataset.licensePitch || el.dataset.studioLead).split(':');
    const lead=leads.find(item=>item.id===id);
    try {
      const brief={buyer:lead.name,contact:lead.contact,source:lead.url,context:lead.background,pitch:pitchText(lead,choice)};
      if (el.dataset.studioLead) window.ArchiveStudio.useLead(brief);
      else window.ArchiveLicensing.launch(brief);
    } catch(error) { toast(error.message); }
  }
  if(el.dataset.copyPitch){
    const [id,choice]=el.dataset.copyPitch.split(':');
    try{await navigator.clipboard.writeText(pitchText(leads.find(x=>x.id===id),choice));toast('Pitch copied. Add your sample link before sending.');}
    catch{toast('Clipboard unavailable. Select and copy the pitch text.');}
  }
});
view.addEventListener('input',event=>{
  if(event.target.dataset.filter==='search'){filters.search=event.target.value;renderLeadList();}
});
view.addEventListener('change',async event=>{
  const el=event.target;
  if(el.dataset.check){
    const checkbox=el.dataset.check;
    state.checks[checkbox]=el.checked;saved();render();view.querySelector('[data-check="'+checkbox+'"]')?.focus();
  }else if(el.dataset.filter&&el.dataset.filter!=='search'){
    filters[el.dataset.filter]=el.value;renderLeadList();
  }else if(el.id==='lead-feed'&&el.files.length){
    try{applyLeadFeed(JSON.parse(await el.files[0].text()));if(saved())toast('Lead feed imported. Outreach history was kept.');}
    catch(error){toast(error.message||'Lead feed could not be read.');}
    finally{el.value='';}
  }else if(el.id==='scan-files'){await scanFiles(el);}
  else if(el.id==='import'&&el.files.length){
    try{
      const next=validate(JSON.parse(await el.files[0].text()));
      if(!confirm('Replace this browser’s Archive Desk data with the selected backup?')){el.value='';return;}
      state=next;restoreLeads();if(saved()){render();toast('Backup restored.');}
    }catch(error){toast(error.message||'Backup could not be read.');}
  }
});
view.addEventListener('submit',event=>{
  event.preventDefault();
  const form=event.target,values=Object.fromEntries(new FormData(form));
  if(form.dataset.track){
    const id=form.dataset.track;
    const follow=values.follow||(values.status==='Contacted'&&statusOf(id)!=='Contacted'?dueDate():'');
    state.tracking[id]={status:values.status,follow,received:values.received===''?'':Number(values.received),notes:values.notes};
    const el=document.getElementById(id);
    if(saved()){
      if(!matching().some(lead=>lead.id===id)){renderLeadList();}
      else {el.querySelector('.status').textContent=values.status;form.elements.follow.value=follow;}
      toast('Lead saved.');
    }
  }else if(form.id==='new-lead'){
    if(!values.name.trim()){toast('Enter a prospect name.');return;}
    const url=safeUrl(values.url.trim());
    if(values.url.trim()&&!url){toast('Use a valid web address.');return;}
    const lead={...values,name:values.name.trim(),url,researchUrl:url,id:'custom-'+crypto.randomUUID(),kind:'Added prospect',priority:2,budget:'Unlisted',caveat:'Confirm availability, scope and payment terms.',pitch:values.angleA};
    state.extraLeads.push(lead);restoreLeads();
    if(saved()){filters={search:'',kind:'',album:'',status:''};requestedLead=lead.id;render();toast('Prospect added.');}
  }else if(form.id==='album-form'||form.dataset.albumEdit){
    const id=form.dataset.albumEdit;
    const url=safeUrl(values.url.trim());
    if(!values.name.trim()){toast('Enter an album name.');return;}
    if(values.url.trim()&&!url){toast('Use a valid web address.');return;}
    if(url&&state.albums.some(a=>a.url===url&&a.id!==id)){toast('That album link is already in the queue.');return;}
    const record={id:id||crypto.randomUUID(),name:values.name.trim(),url,rights:values.rights,notes:values.notes.trim()};
    if(id)state.albums=state.albums.map(a=>a.id===id?record:a);
    else state.albums.push(record);
    if(saved()){render();toast(id?'Album updated.':'Album added.');}
  }else if(form.id==='licensing-site-form'){
    try {window.ArchiveLicensing.configure(values.site);toast('Licensing website saved.');}
    catch(error) {toast(error.message);}
  }else if(form.id==='profile-form'){
    state.profile={name:values.name.trim(),email:values.email.trim(),goal:Number(values.goal)};
    if(saved()){render();toast('Profile saved.');}
  }
});
window.ArchiveIntake.bind(view);
window.CreatorDesk.connect({
  read:()=>state.creatorDesk||{},
  write:next=>{
    const old=state.creatorDesk;
    state.creatorDesk=next;
    if(saved())return true;
    state.creatorDesk=old;
    return false;
  }
});
window.ArchiveWorkdesk.connect({
  read:() => state.workdesk,
  write:records => {
    const previous=state.workdesk;
    state.workdesk=records;
    if(saved())return true;
    state.workdesk=previous;
    return false;
  },
  changed:toast
});
window.CardDesk.connect({
  read:()=>state.cardDesk,
  write:value=>{
    const old=state.cardDesk;
    state.cardDesk=value;
    if(saved())return true;
    state.cardDesk=old;
    return false;
  },
  changed:toast
});

render();

window.receiveAffiliateChoice=()=>{
  if(!window.ArchiveNative?.pendingAffiliateChoice?.())return;
  if(current()==='affiliates')render();else location.hash='affiliates';
};
window.receiveAffiliateChoice();

window.syncBackgroundScout=()=>{const native=window.ArchiveNative;if(!native?.backgroundScoutResult)return;try{const raw=native.backgroundScoutResult();if(raw&&raw!==window.lastBackgroundScout){window.acceptPublicLeadRefresh(JSON.parse(raw));window.lastBackgroundScout=raw;}const target=JSON.parse(native.takeScoutTarget());if(target!==null){location.hash='workdesk';render();if(target)window.ArchiveWorkdesk.openSource(target);}}catch(e){console.warn('Scout sync',e);}};
window.syncBackgroundScout();
