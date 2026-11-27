'use strict';

window.CardDesk = (() => {
  const categories=['Sports','Pokémon','Magic: The Gathering','Yu-Gi-Oh!','One Piece','Lorcana','Digimon','Other TCG','Non-sports','Memorabilia'];
  const views=['Front','Back','Left edge','Right edge','Top edge','Bottom edge','Slab label','Raking light','Detail','General image'];
  const groups={
    'Identity and edition':[
      ['title','Player, character or card name'],['category','Card type',categories],['game','Sport, league or game'],
      ['year','Year or release date'],['maker','Manufacturer or publisher'],['set','Set or product line'],
      ['subset','Subset, insert or promo'],['number','Card or collector number'],['variant','Parallel, finish or printing'],
      ['language','Language / region'],['serial','Serial number or print run'],['quantity','Quantity'],['barcode','UPC or product ID'],
      ['size','Measured width × height'],['package','Raw, graded, sealed or altered',['Raw','Graded','Sealed','Altered','Uncertain']]
    ],
    'Condition and provenance':[
      ['condition','Seller condition / inspection notes'],['centeringFront','Front borders L/R and T/B (%)'],['centeringBack','Back borders L/R and T/B (%)'],
      ['grader','Grader',['PSA','CGC','Beckett','SGC','Other']],['grade','Grade and qualifiers as printed'],['cert','Certification number'],
      ['certUrl','Certification lookup URL'],['purchase','Acquisition date, source and provenance'],['storage','Sleeve, holder or packaging condition'],
      ['autograph','Autograph, authentication or redemption'],['relic','Memorabilia, patch or material'],['alterations','Alterations / suspected reproduction / authenticity concerns'],
      ['defects','Defect locations and disclosure']
    ],
    'Pricing and handoff':[
      ['comp','Comparable sale link'],['compDate','Sale date'],['compAmount','Sold price / currency'],['shipping','Comparable shipping / fees'],
      ['ask','Asking price / currency'],['floor','Minimum net after fees'],['location','Pickup or shipping location'],
      ['terms','Shipping, returns, and platform terms'],['notes','Portfolio notes']
    ]
  };
  const checks={
    'Physical inspection':['Four corners, front and back','All four edges / chipping or whitening','Front and back centering','Surface gloss and print registration',
      'Scratches, scuffs, indentation or dents','Creases, bends, tears or peeling','Staining, writing, ink or wax','Print lines, spots, foil or texture marks',
      'Trimming, recoloring or restoration indicators','Measured dimensions and possible counterfeit indicators','Seal integrity, slab cracks or label concerns'],
    'Market evidence':['Exact name, set, number and year confirmed','Variant, language and serial matched','Condition or certified grade verified',
      'Autograph or memorabilia provenance reviewed','Front, back and edges photographed','Visible flaws documented in detail',
      'Recent actual sale and currency recorded','Shipping, fees and accepted offers checked','Buyer / marketplace requirements reviewed']
  };
  const presets={
    buyer:'First-party purchase intake',
    direct:'Direct buyer',
    local:'Public collector',
    market:'Marketplace',
    consignment:'Consignment',
    referral:'Collector referral'
  };
  const guide=[
    ['PSA grading standards','https://www.psacard.com/gradingstandards'],['CGC grading scale','https://www.cgccards.com/card-grading/grading-scale/'],
    ['Beckett grading criteria','https://beckett.com/grading'],['PSA certification lookup','https://www.psacard.com/cert/'],
    ['CGC certification lookup','https://www.cgccards.com/certlookup/'],
    ['TCGplayer listing photos','https://help.tcgplayer.com/hc/en-us/articles/360000111227-Tips-for-Listings-with-Photos'],
    ['FADGI digitization guidelines','https://www.digitizationguidelines.gov/guidelines/digitize-technical.html']
  ];
  const idPattern=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
  const filePattern=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\.(jpg|png|webp|heic|gif|bin)$/;
  const esc = x => String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const https = v => {
    try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}
  };
  const url=(u,t)=>https(u)?'<a class="quiet" href="'+esc(https(u))+'" target="_blank" rel="noopener noreferrer">'+esc(t)+' ↗</a>':'';
  const today=()=>{const d=new Date();return [d.getFullYear(),d.getMonth()+1,d.getDate()].map(n=>String(n).padStart(2,'0')).join('-');};
  const defaults=()=>({version:1,cards:[],sources:[],collectors:[]});
  const catalog=()=>{const value=api?.read();return value?.version===1&&Array.isArray(value.cards)&&Array.isArray(value.sources)&&Array.isArray(value.collectors)?value:defaults();};
  const apply=(change)=>api.write({...catalog(),...change});
  const item=()=>catalog().cards.find(x=>x?.id===selected);
  const images=card=>Array.isArray(card?.photos)?card.photos.filter(p=>p&&filePattern.test(p.file)):[];
  const name=card=>card?.fields?.title||'Untitled card';
  const mt=card=>['title','year','maker','set','number','variant','language','grader','grade'].map(k=>card?.fields?.[k]).filter(Boolean).join(' ');
  const txt=(card,k)=>String(card?.fields?.[k]??'');
  let api,selected='',root,sources=[],scouting=false,page=0,ocrModule,readingText=false;
  const markup=`
    <section class="card-desk">
      <header class="sectiontop"><h1>Trading cards</h1><p>Scan both sides, document the condition, and find an evidence-backed route to sell.</p></header>
      <div class="row card-controls">
        <button type="button" class="primary" data-card-action="new">New card</button>
        <button type="button" class="quiet" data-card-action="hud">Capture HUD</button>
        <button type="button" class="quiet" data-card-action="stack">HUD asset stack</button>
        <button type="button" class="quiet" data-card-action="acid">ACID FX Studio</button>
        <button type="button" class="quiet" data-card-action="bundle">Export portfolio ZIP</button>
      </div>
      <div class="card-layout">
        <section class="panel"><h2>Portfolio</h2><label class="field">Find a card<input type="search" data-card-filter placeholder="Name, set, serial or grade"></label>
          <label><input type="checkbox" data-card-auto-read> Suggest card text after front, back or slab-label capture</label>
          <div data-card-list></div></section>
        <section class="panel" data-card-editor></section>
      </div>
      <section class="panel card-scout">
        <h2>Card scout</h2>
        <p>Ranks first-party buying and selling routes by card fit. Confirm the current buy price, eligible condition, fees and intake terms directly.</p>
        <div class="row"><button type="button" class="primary" data-card-action="scout">Verify live routes</button>
          <button type="button" class="quiet" data-card-action="collector">Add public collector or buyer</button></div>
        <div data-card-prices></div>
        <p role="status" data-card-scout-note></p><div data-card-routes></div>
      </section>
      <details class="panel"><summary>Grader, marketplace and imaging references</summary>
        <p>Use the grader’s own checklist when inspecting a card. White paper helps balance neutral tones. FADGI conformance requires measured targets and evaluation software.</p>
        <div class="row">${guide.map(([text,link])=>url(link,text)).join('')}</div>
      </details>
    </section>`;

  function renderList() {
    const list=root.querySelector('[data-card-list]');
    const query=root.querySelector('[data-card-filter]').value.trim().toLowerCase();
    const matches=catalog().cards.filter(c=>idPattern.test(c?.id) && JSON.stringify(c.fields??{}).toLowerCase().includes(query));
    page=Math.min(page,Math.max(0,Math.ceil(matches.length/24)-1));
    const visible=matches.slice(page*24,(page+1)*24);
    list.innerHTML=visible.length?visible.map(c=>`<button type="button" data-card-open="${c.id}" class="quiet card-item"
      ${c.id===selected?'aria-current="true"':''}>${esc(name(c))}<small>${esc([txt(c,'year'),txt(c,'set'),txt(c,'number')].filter(Boolean).join(' · '))} · ${images(c).length} views</small></button>`).join('')
      +(matches.length>24?`<div class="row"><button type="button" class="quiet" data-card-action="prev" ${page===0?'disabled':''}>Previous</button>
        <button type="button" class="quiet" data-card-action="next" ${(page+1)*24>=matches.length?'disabled':''}>Next</button></div>`:'')
      :'<p>No cards in this view.</p>';
  }

  function renderEditor(){
    const card=item(), el=root.querySelector('[data-card-editor]');
    if(!card){el.innerHTML='<h2>Card record</h2><p>Create a card to start its photo set and condition checklist.</p>';return;}
    const photos=images(card);
    const cards=photos.map(p=>`<figure><img src="/card-image/${p.file}" alt="${esc(p.view)}" loading="lazy">
      <figcaption>${esc(p.view)} · ${Number(p.width) || '?'} × ${Number(p.height) || '?'}<small>${esc(p.audit||'Original')}</small></figcaption>
      <button type="button" class="quiet" data-card-read="${p.file}">Read card text</button>
      <button type="button" class="quiet" data-card-raster="${p.file}">Crop / export</button>
      <button type="button" class="quiet" data-card-remove="${p.file}">Remove view</button></figure>`).join('');
    el.innerHTML=`<h2>${esc(name(card))}</h2>
      <div class="row"><button type="button" class="primary" data-card-action="capture">Scan a view</button>
      <label class="field">Import as<select data-card-import-view>${views.map(v=>'<option>'+esc(v)+'</option>').join('')}</select></label>
      <button type="button" class="quiet" data-card-action="import">Import photo</button></div>
      <div class="card-views">${cards}</div>
      <p>Photo to-do · ${esc(views.slice(0,6).filter(v=>!photos.some(p=>p.view===v)).join(', ')||'Front, back and all four edges recorded.')}</p>
      <form data-card-fields>
      ${Object.entries(groups).map(([group,fields],index)=>`<details ${index===0?'open':''}><summary>${esc(group)}</summary><div class="card-fields">${fields.map(([key,title,options])=>
        `<label class="field">${esc(title)}`+(options?`<select name="${key}"><option value="">Choose</option>${options.map(o=>`<option ${txt(card,key)===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`:
          `<input name="${key}" maxlength="600" value="${esc(txt(card,key))}">`)+'</label>').join('')}</div></details>`).join('')}
      ${Object.entries(checks).map(([group,entries],i)=>`<details><summary>${esc(group)}</summary><p>Mark each item’s review status and record any defect you find.</p>
      <div class="card-fields">${entries.map((choice,j)=>{
        const k=i+'-'+j, v=card.checks?.[k];
        return `<label class="field">${esc(choice)}<select name="check-${k}">
          ${['To review','Reviewed','Issue found','Not applicable'].map(o=>`<option ${o===v?'selected':''}>${o}</option>`).join('')}</select></label>`;
      }).join('')}</div></details>`).join('')}
      <div class="row"><button type="button" class="quiet" data-card-action="save">Save card</button>
        <button type="button" class="quiet" data-card-action="delete">Remove card</button></div>
      </form>`;
  }

  function saveEditor(announce=false){
    const el=root?.querySelector('[data-card-fields]'), card=item();
    if(!el || !card)return true;
    const fields={},check={};
    for(const [k,v] of new FormData(el)) {
      if(k.startsWith('check-')){if(v!=='To review')check[k.slice(6)]=v;}
      else if(String(v).trim())fields[k]=String(v).trim();
    }
    const next={...card,fields,checks:check};
    const stored=apply({cards:catalog().cards.map(c=>c.id===card.id?next:c)});
    if(stored&&announce){api.changed('Card saved.');render();}
    return stored;
  }

  function sourceAge(checked){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(checked??''))return Infinity;
    const days=(Date.parse(today()+'T00:00:00Z')-Date.parse(checked+'T00:00:00Z'))/86400000;
    return days>=0?days:Infinity;
  }
  function live(s) {
    return s.status==='Source verified' && sourceAge(s.checked)<=14 && (!s.deadline||s.deadline>=today());
  }
  function rank(s,card) {
    const category=txt(card,'category').toLowerCase(), identity=(category+' '+mt(card)+' '+txt(card,'package')).toLowerCase();
    const matches=(s.tags??[]).filter(tag=>identity.includes(tag)||((tag==='pokémon')&&identity.includes('pokemon')));
    if(card && category && !matches.length && !s.card)return -1;
    if(card && s.card && s.card!==card.id)return -1;
    const kind=s.type===presets.local?48:s.type===presets.direct?40:s.type===presets.consignment?26:s.type===presets.referral?23:18;
    return (live(s)?100:0)+kind+matches.length*12+(s.card===card?.id&&s.card?20:0)+(s.location?5:0);
  }

  function routeList(){
    const data=catalog(), byId=new Map(sources.map(x=>[x.id,x]));
    for(const checked of data.sources)if(byId.has(checked.id))byId.set(checked.id,{...byId.get(checked.id),status:checked.status,checked:checked.checked});
    return [...byId.values(),...data.collectors].filter(s=>s&&https(s.url));
  }
  function renderScout(){
    const card=item(),query=mt(card);
    const ranked=routeList().map(s=>[s,rank(s,card)]).filter(([,value])=>value>=0).sort((a,b)=>b[1]-a[1]);
    const note=root.querySelector('[data-card-scout-note]');
    note.textContent=scouting?'Checking first-party intake and marketplace pages…':
      (ranked.filter(([s])=>live(s)).length+' recently verified routes'+(query?' for '+query:'')+'.');
    root.querySelector('[data-card-prices]').innerHTML=query?`<div class="row">${url('https://www.ebay.com/sch/i.html?LH_Sold=1&LH_Complete=1&_nkw='+encodeURIComponent(query),'Exact sold search')}
      ${txt(card,'category')==='Magic: The Gathering'?url('https://scryfall.com/search?q='+encodeURIComponent('name:"'+txt(card,'title').replace(/"/g,'')+'" '+(txt(card,'number')?'cn:'+txt(card,'number'):'')),'Match printing in Scryfall'):''}
      ${url('https://www.tcgplayer.com/search/all/product?q='+encodeURIComponent(query),'Compare TCG products')}
      ${url('https://seattle.craigslist.org/search/wan?query='+encodeURIComponent(txt(card,'title')||txt(card,'category')),'Seattle wanted posts')}</div>`:'';
    root.querySelector('[data-card-routes]').innerHTML=ranked.length?ranked.map(([s])=>`<article class="card-route">
      <h3>${esc(s.name)}</h3><small>${esc(s.type)}${s.location?' · '+esc(s.location):''} ·
      ${live(s)?(s.type===presets.local?'Public wanted post reviewed':'Source verified'):'Check required'}${s.checked?' · '+esc(s.checked):''}</small>
      <p>${esc(s.description)}${s.deadline?' · Closes '+esc(s.deadline):''}</p>
      <div class="row">${url(s.url,s.type===presets.local?'Public wanted post':'Official source')}
      ${s.contact&&s.contact!==s.url?url(s.contact,'Contact route'):''}
      <button type="button" class="quiet" data-card-queue="${esc(s.id)}">Send to Workdesk</button></div></article>`).join('')
      :'<p>No public routes match this filter. Add a sourced collector or change the card type.</p>';
  }

  function render(){if(root?.isConnected){renderList();renderEditor();renderScout();}}
  function addCollector(){
    const dialog=document.createElement('dialog');
    dialog.innerHTML=`<h2>Add a public buying lead</h2><form class="card-fields">
      <label class="field">Collector or buyer name<input required name="name" maxlength="120"></label>
      <label class="field">Public wanted post<input required name="url" type="url"></label>
      <label class="field">Public contact page<input required name="contact" type="url"></label>
      <label class="field">Offer, wanted edition or other evidence<textarea required name="description" maxlength="600"></textarea></label>
      <label class="field">Closing date, if published<input name="deadline" type="date"></label>
      <label><input name="verified" type="checkbox"> I checked that the public post is open and the contact route works.</label>
      <p role="status"></p><div class="row"><button type="button" class="quiet" data-cancel>Cancel</button><button type="button" class="primary" data-confirm>Save buying lead</button></div></form>`;
    document.body.append(dialog);
    const form=dialog.querySelector('form');
    const commit=()=>{
      if(!form.reportValidity())return;
      const x=Object.fromEntries(new FormData(form));
      if(!https(x.url)||!https(x.contact)){dialog.querySelector('p').textContent='Use public HTTPS links.';return;}
      const record={...x,id:crypto.randomUUID(),name:x.name.trim(),card:selected,type:presets.local,checked:x.verified?today():'',
        status:x.verified?'Source verified':'Review source',tags:txt(item(),'category')?[txt(item(),'category').toLowerCase()]:[]};
      delete record.verified;
      if(apply({collectors:[record,...catalog().collectors]}))dialog.close();
      renderScout();
    };
    form.onsubmit=event=>{event.preventDefault();commit();};
    dialog.querySelector('[data-confirm]').onclick=commit;
    dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});
    dialog.showModal();
  }

  function queue(s){
    const card=item(),title=mt(card)||'my card collection', contact=s.contact||s.url;
    const note=txt(card,'condition'),comp=txt(card,'comp'),ask=txt(card,'ask'), grade=txt(card,'grade');
    const verified=live(s), intake=verified&&[presets.direct,presets.consignment].includes(s.type), posted=verified&&s.type===presets.local;
    const row={
      id:crypto.randomUUID(),category:'tradingcards',name:s.name+' · '+title,
      kind:posted?'brief':intake?'intake':'prospect',source:s.url,contact,verified:intake||posted,checked:verified?s.checked:'',
      deadline:s.deadline||'',notes:s.description,keyword:title,evidence:https(comp),buy:s.type===presets.direct?s.url:'',
      input:[title,note&&'Condition: '+note,grade&&'Label: '+grade,comp&&'Comparable: '+comp,ask&&'Asking: '+ask].filter(Boolean).join('\n'),
      draft:'Hi '+s.name+',\n\nI have '+title+(note?' ('+note+')':'')+'. '+(s.type===presets.market?
        'I’m checking listing eligibility and the best pricing research route.':'Is this a fit for your current buying or consignment intake?')+
        ' I can provide original photos of the front, back, edges and any visible flaws. Please let me know your requirements and expected fees or payment terms.\n',
      approval:'draft'
    };
    if(window.ArchiveWorkdesk.addCampaign(row))location.hash='workdesk';
  }

  function action(value){
    if(!saveEditor())return;
    const rows=catalog().cards,card=item(),native=window.ArchiveNative;
    if(value==='new'){
      const id=crypto.randomUUID();
      if(apply({cards:[{id,created:new Date().toISOString(),fields:{},checks:{},photos:[]},...rows]})){selected=id;page=0;render();root.querySelector('input[name=title]')?.focus();}
    }else if(value==='next'||value==='prev'){page+=value==='next'?1:-1;renderList();}
    else if(value==='save'){render();api.changed('Card saved.');}
    else if(value==='delete' && card && confirm('Remove this card from the portfolio? Its original files will be kept on this device.')){
      if(apply({cards:rows.filter(c=>c.id!==card.id)})){selected='';render();}
    }else if(value==='collector')addCollector();
    else if(value==='scout'){
      if(!native?.scoutCards){api.changed('Install the Android app for live source checks.');return;}
      if(!scouting){scouting=true;renderScout();native.scoutCards();}
    }else if(value==='bundle'){
      const metadata={version:1,cards:rows,collectors:catalog().collectors};
      const files=rows.flatMap(x=>images(x).map(p=>p.file));
      if(native?.exportCardPortfolio)native.exportCardPortfolio(JSON.stringify({metadata,files}));
      else window.archiveDownload('Trading-card-catalog.json',JSON.stringify(metadata,null,2),'application/json');
    }else if(!native)api.changed('This tool opens in the Android app.');
    else if(value==='acid')native.openAcidCamera?.();
    else if(value==='stack')openStack(native,card);
    else if(value==='hud')native.openCardCamera?.('','General image');
    else if(value==='capture'&&card){const present=images(card).map(p=>p.view);native.openCardCamera?.(card.id,views.find(v=>!present.includes(v))||'Front');}
    else if(value==='import'&&card)native.importCardPhoto?.(card.id,root.querySelector('[data-card-import-view]').value);
  }

  function openStack(native,card){
    let assets=[];
    try{assets=JSON.parse(native.acidAssets?.()||'[]').filter(p=>filePattern.test(p.file));}catch{}
    const dialog=document.createElement('dialog');
    const choices=views.map(view=>'<option>'+esc(view)+'</option>').join('');
    dialog.innerHTML=`<h2>HUD asset stack</h2><p>Recent standalone captures. Open one in Raster Desk or attach it to the selected card.</p>
      ${card?`<label class="field">Attach as<select>${choices}</select></label>`:''}
      <div class="card-views card-asset-list">${assets.map(p=>`<figure>
        <img src="/card-image/${p.file}" alt="HUD capture" loading="lazy">
        <figcaption>${esc(new Date(Number(p.date)).toLocaleString())}</figcaption>
        <button type="button" class="quiet" data-raster="${p.file}">Crop / export</button>
        ${card?`<button type="button" class="quiet" data-attach="${p.file}">Attach to card</button>`:''}
        </figure>`).join('')||'<p>Open Capture HUD and take a photo to start the stack.</p>'}</div>
      <button type="button" class="quiet" data-close>Close stack</button>`;
    document.body.append(dialog);
    dialog.addEventListener('click',e=>{
      const button=e.target.closest('button');if(!button)return;
      if(button.hasAttribute('data-close'))dialog.close();
      if(button.dataset.raster){dialog.close();native.openCardRaster?.(button.dataset.raster);}
      if(button.dataset.attach&&card){native.attachAcidAsset?.(card.id,button.dataset.attach,dialog.querySelector('select').value);dialog.close();}
    });
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
  }

  function library(){
    if(!ocrModule)ocrModule=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='/ocr/tesseract.min.js';
      script.onload=()=>resolve(window.Tesseract);
      script.onerror=()=>{script.remove();ocrModule=null;reject(Error('Text reader unavailable'));};
      document.head.append(script);
    });
    return ocrModule;
  }

  function suggestions(text,view){
    const rows=text.split(/\r?\n/).map(t=>t.trim()).filter(Boolean);
    const names=rows.filter(line=>/^[A-Za-z][A-Za-z .’'&-]{4,44}$/.test(line) &&
      !/copyright|pokemon|pokémon|trading card|wizards|official|authentic|made in|all rights/i.test(line));
    const year=text.match(/(?:^|[^\d])((?:18|19|20)\d{2})(?!\d)/m)?.[1]||'';
    const number=text.match(/(?:#|\b(?:no|number)\.?\s*)([a-z]{0,4}[- ]?\d{1,5}[a-z]?)(?![a-z0-9])/i)?.[1]||
      text.match(/\b([a-z]{0,3}\d{1,4}[a-z]?\s*\/\s*\d{1,5})\b/i)?.[1]||'';
    const grader=view==='Slab label'?(text.match(/\b(PSA|CGC|BGS|SGC|BECKETT)\b/i)?.[1]||'').toUpperCase():'';
    const cert=view==='Slab label'?text.match(/(?:^|[^\d])(\d{7,12})(?!\d)/m)?.[1]||'':'';
    return {title:view==='Back'?'':names[0]||'',year,number,grader:['BGS','BECKETT'].includes(grader)?'Beckett':grader,cert};
  }

  function reviewText(card,photo,text){
    if(!root?.isConnected || selected!==card.id || document.querySelector('dialog[open]'))return;
    const options=suggestions(text,photo.view);
    const dialog=document.createElement('dialog');
    dialog.innerHTML=`<h2>Review card text</h2><p>Check each suggestion against the card. Choose the fields to apply.</p>
      <details><summary>Read all detected text</summary><pre class="card-ocr-text">${esc(text||'No readable text detected.')}</pre></details>
      <form class="card-fields">${Object.entries({title:'Name',year:'Year',number:'Card number',grader:'Grader',cert:'Cert number'}).map(([key,label])=>
        `<div><label class="field">${label}<input name="${key}" maxlength="100" value="${esc(options[key]||'')}"></label>
        <label><input type="checkbox" name="apply-${key}" ${options[key]&&!txt(card,key)?'checked':''}> Apply this value</label></div>`).join('')}
        <div class="row"><button type="button" class="quiet" data-cancel>Close</button><button type="submit" class="primary">Apply selected fields</button></div></form>`;
    document.body.append(dialog);
    dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
    dialog.querySelector('form').onsubmit=e=>{
      e.preventDefault();
      if(!saveEditor())return;
      const current=item();
      if(current?.id!==card.id){dialog.close();return;}
      const values=new FormData(e.target),fields={...current.fields};
      for(const key of Object.keys(options)){
        if(values.has('apply-'+key)&&values.get(key)?.trim())fields[key]=values.get(key).trim();
      }
      if(apply({cards:catalog().cards.map(c=>c.id===card.id?{...c,fields}:c)})){dialog.close();render();}
    };
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});
    dialog.showModal();
  }

  async function readText(file){
    const card=item(), photo=images(card).find(p=>p.file===file);
    if(!photo || readingText)return;
    readingText=true;
    api.changed('Reading the selected photo on this device.');
    let worker;
    try{
      const ocr=await library();
      const img=await new Promise((resolve,reject)=>{
        const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src='/card-image/'+file;
      });
      const ratio=Math.min(1,1650/Math.max(img.naturalWidth,img.naturalHeight));
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
      const ctx=canvas.getContext('2d',{alpha:false});
      ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      worker=await ocr.createWorker('eng',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr/tesseract-core-lstm.wasm.js',
        langPath:location.origin+'/ocr',workerBlobURL:false,cacheMethod:'none'});
      await worker.setParameters({tessedit_pageseg_mode:'11'});
      const result=await worker.recognize(canvas);
      reviewText(card,photo,result.data.text);
    }catch{api.changed('Text could not be read. You can still enter the card details.');}
    finally{readingText=false;if(worker)await worker.terminate().catch(()=>{});}
  }

  function receive(type,value){
    if(type==='photo' && idPattern.test(value?.id) && filePattern.test(value?.file)){
      const cards=catalog().cards, c=cards.find(x=>x.id===value.id);
      const added=c && !images(c).some(p=>p.file===value.file);
      if(added) {
        if(!apply({cards:cards.map(x=>x.id===c.id?{...c,photos:[...images(c),value]}:x)}))return;
      }
      if(c)window.ArchiveNative?.acknowledgeCardPhoto?.(value.file);
      if(added && root?.isConnected && location.hash==='#cards'){
        selected=c.id;render();api.changed('Original added to the card.');
        if(catalog().autoRead && ['Front','Back','Slab label'].includes(value.view))readText(value.file);
      }
    }else if(type==='scout' || type==='scoutError'){
      scouting=false;
      if(type==='scout' && Array.isArray(value)){
        apply({sources:value});
        api.changed(value.filter(s=>s.status==='Source verified').length+' source checks passed.');
      }else api.changed('Could not complete the check. Reopen the official sources to verify.');
      if(root?.isConnected && location.hash==='#cards')renderScout();
    }
  }

  function mount(host){
    root=host.querySelector('.card-desk');
    if(!item())selected=catalog().cards[0]?.id||'';
    const panel=root;
    if(!sources.length)fetch('./cards-sources.json').then(r=>r.json()).then(data=>{
      if(Array.isArray(data)){sources=data;if(panel.isConnected)renderScout();}
    }).catch(()=>{});
    root.addEventListener('input',e=>{
      if(e.target.matches('[data-card-filter]')){page=0;renderList();}
      else if(e.target.closest('[data-card-fields]'))saveEditor();
    });
    root.querySelector('[data-card-auto-read]').checked=!!catalog().autoRead;
    root.addEventListener('change',e=>{
      if(e.target.matches('[data-card-auto-read]'))apply({autoRead:e.target.checked});
      if(e.target.closest('[data-card-fields]')){saveEditor();renderList();renderScout();}
    });
    root.addEventListener('click',e=>{
      const b=e.target.closest('button');if(!b)return;
      const k=b.dataset;
      if(k.cardAction){action(k.cardAction);return;}
      if(!saveEditor())return;
      if(k.cardOpen){selected=k.cardOpen;render();}
      if(k.cardRaster)window.ArchiveNative?.openCardRaster?.(k.cardRaster);
      if(k.cardRead)readText(k.cardRead);
      if(k.cardRemove && item() && confirm('Remove this view from the record? Its original file will stay on this device.')){
        const c=item();
        if(apply({cards:catalog().cards.map(x=>x.id===c.id?{...c,photos:images(c).filter(p=>p.file!==k.cardRemove)}:x)}))renderEditor();
      }
      if(k.cardQueue){const s=routeList().find(x=>x.id===k.cardQueue);if(s)queue(s);}
    });
    render();
    try{for(const photo of JSON.parse(window.ArchiveNative?.cardPhotoInbox?.()||'[]'))receive('photo',photo);}catch{}
  }
  return {markup,mount,receive,connect(adapter){api=adapter;}};
})();
