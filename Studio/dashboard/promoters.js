'use strict';
window.CreatorDesk=(()=>{
  const sources=[
    ['SheBloggin','https://shebloggin.com/contact/','Streetwear tips and sponsored-post inquiries'],
    ['Streetwear Nation','https://streetwearnation.com/submit','Independent streetwear submissions'],
    ['Fashionista','https://fashionista.com/page/about','Brand profile consideration']
  ];
  const stages=['Researching','Pitch ready','Contacted','Negotiating','Agreed','Published','Declined'];
  let api,root;
  const el=k=>root.querySelector('[data-c="'+k+'"]');
  const current=()=>api.read();
  const status=s=>{if(root?.isConnected)el('status').textContent=s;};
  function write(patch){
    const ok=api.write({...current(),...patch});
    if(!ok)status('Storage full or unavailable. Export your backup before continuing.');
    return ok;
  }
  function safe(raw){
    try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}
  }
  function link(label,url){
    const a=document.createElement('a');a.href=safe(url);a.textContent=label;a.className='quiet';return a;
  }
  function importRows(raw,rows){
    const known=new Map(rows.map(p=>[p.url,p]));
    for(const [i,line] of raw.split(/\r?\n/).entries()){
      if(!line.trim())continue;
      const cells=line.split('\t').map(x=>x.trim()),url=safe(cells[1]);
      if(cells.length!==2||!cells[0]||!url)throw Error('Line '+(i+1)+' needs a name, a tab and a public HTTPS product link.');
      known.set(url,{name:cells[0],url});
    }
    return [...known.values()];
  }
  const label=(title,id,type='text')=>'<label class="field">'+title+'<input data-c="'+id+'" type="'+type+'" maxlength="500"></label>';
  function economics(price,cost,keep){
    const values=[price,cost,keep];
    if(values.some(x=>String(x).trim()===''||!Number.isFinite(Number(x))||Number(x)<0)||Number(price)<=0)return null;
    return Math.max(0,Math.round(Number(price)*100)-Math.round(Number(cost)*100)-Math.round(Number(keep)*100));
  }
  function products(){
    const s=current(),sel=el('product');
    sel.replaceChildren(new Option('Select a published design',''));
    for(const p of s.products||[])sel.add(new Option(p.name,p.url));
    sel.value=s.inputs?.product||'';
  }
  function report(){
    const cap=economics(el('price').value,el('cost').value,el('keep').value);
    el('margin').textContent=cap===null?'Enter all three amounts to calculate an incentive.':'Maximum available for one creator payment: $'+(cap/100).toFixed(2)+' per qualifying sale.';
    return cap;
  }
  function showSources(){
    const box=el('sources');box.replaceChildren();
    for(const [name,url,fit] of sources){
      const row=document.createElement('p');row.append(link(name,url),' · '+fit+' ');
      const b=document.createElement('button');b.className='quiet';b.textContent='Use contact route';
      b.onclick=()=>{el('creator').value=name;el('route').value=url;saveInputs();};row.append(b);box.append(row);
    }
  }
  function results(){
    const box=el('results');box.replaceChildren();
    const search=current().search;
    if(!search)return;
    const p=document.createElement('p');p.textContent=search.query+' · '+new Date(search.at).toLocaleString()+' · '+search.summary;box.append(p);
    for(const s of search.shows){
      const row=document.createElement('p');row.append(link(s.name,s.url),' · '+s.publisher);box.append(row);
    }
    for(const t of search.matches){
      const row=document.createElement('p');row.textContent=t;box.append(row);
    }
  }
  function receive(r){
    const words=String(r.query||'').toLowerCase().match(/[a-z0-9]{3,}/g)||[];
    let matches=[],trendOK=false;
    if(r.trends){
      const doc=new DOMParser().parseFromString(r.trends,'application/xml');
      trendOK=!!doc.querySelector('rss channel')&&!doc.querySelector('parsererror');
      for(const item of doc.querySelectorAll('item')){
        const title=item.querySelector('title')?.textContent||'';
        if(words.some(w=>title.toLowerCase().split(/[^a-z0-9]+/).includes(w))){
          const traffic=item.getElementsByTagNameNS('*','approx_traffic')[0]?.textContent;
          matches.push(title+(traffic?' · Google approximate searches '+traffic:''));
        }
      }
    }
    const shows=Array.isArray(r.shows)?r.shows.filter(x=>safe(x.url)):[];
    const summary=(r.showsError?'Podcast source unavailable':shows.length+' potential shows')+' · '+
      (trendOK?matches.length+' US trending headlines match niche words':'Trend source unavailable');
    if(!trendOK&&!Array.isArray(r.shows)){status(summary+'. Last saved results retained.');return;}
    if(write({search:{query:r.query,at:Date.now(),shows,matches,summary}})&&root?.isConnected){results();status(summary);}
  }
  const inputNames=['product','niche','creator','route','evidence','price','cost','keep','offer','credit','angle'];
  function saveInputs(){return write({inputs:Object.fromEntries(inputNames.map(k=>[k,el(k).value]))});}
  function scoutLinks(){
    const q=encodeURIComponent(el('niche').value.trim()+' independent fashion');
    el('platforms').replaceChildren(link('YouTube channels','https://www.youtube.com/results?search_query='+q),' ',
      link('Blogs and newsletters','https://www.google.com/search?q='+q+'+newsletter+contact'),' ',
      link('Compare niche in Google Trends','https://trends.google.com/trends/explore?geo=US&q='+encodeURIComponent(el('niche').value)));
  }
  function kits(){
    const list=el('kits');list.replaceChildren();
    for(const k of current().kits||[]){
      const d=document.createElement('details'),h=document.createElement('summary');h.textContent=k.name+' · '+k.stage;
      const pre=document.createElement('pre');pre.style.whiteSpace='pre-wrap';pre.textContent=k.draft;
      const stage=document.createElement('select');stage.setAttribute('aria-label','Outreach stage');
      for(const s of stages)stage.add(new Option(s,s));stage.value=k.stage;
      stage.onchange=()=>{if(write({kits:current().kits.map(x=>x.id===k.id?{...x,stage:stage.value}:x)}))kits();};
      const b=document.createElement('button');b.textContent='Open a copy in Workdesk';b.onclick=()=>{
        if(window.ArchiveWorkdesk.addCampaign({id:crypto.randomUUID(),name:k.name,category:'affiliate',kind:'prospect',verified:false,
          source:k.route,contact:k.route,buy:k.product,draft:k.draft,notes:k.evidence,approval:'draft'}))location.hash='workdesk';
      };
      const metrics=document.createElement('div');
      const inputs={};
      for(const [key,title] of [['views','Measured impressions'],['clicks','Measured clicks'],['orders','Confirmed attributed orders']]){
        const label=document.createElement('label');label.className='field';label.textContent=title;
        const input=document.createElement('input');input.type='number';input.min='0';input.step='1';input.value=k.metrics?.[key]??'';
        label.append(input);metrics.append(label);inputs[key]=input;
      }
      const record=document.createElement('button');record.textContent='Save campaign totals';
      record.onclick=()=>{
        const v=Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,input.value===''?NaN:Number(input.value)]));
        if(!Object.values(v).every(n=>Number.isSafeInteger(n)&&n>=0)||v.clicks>v.views)return status('Enter nonnegative counts from the same reporting period. Clicks must be at most impressions.');
        if(write({kits:current().kits.map(x=>x.id===k.id?{...x,metrics:v}:x)})){kits();status('Campaign totals saved.');}
      };
      if(k.metrics){const summary=document.createElement('p');summary.textContent=(k.metrics.views?
        (100*k.metrics.clicks/k.metrics.views).toFixed(1)+'% observed click-through':'No impressions yet')+' · '+k.metrics.orders+' attributed orders';metrics.prepend(summary);}
      metrics.append(record);
      d.append(h,pre,stage,b,metrics);list.append(d);
    }
  }
  function create(){
    const a=Object.fromEntries(inputNames.map(k=>[k,el(k).value.trim()]));
    const product=(current().products||[]).find(p=>p.url===a.product),cap=report(),amount=Number(a.offer);
    if(!product||!a.niche||!a.creator||!safe(a.route)||!safe(a.evidence)||!a.angle||!a.credit)
      return status('Choose a product and add the niche, creator, public contact page, relevant coverage, story angle and order attribution method.');
    if(cap===null||amount<=0||!Number.isFinite(amount)||Math.round(amount*100)>cap||!/^\d+(\.\d{1,2})?$/.test(a.offer))
      return status('Choose a positive USD incentive within your available margin, using up to two decimal places.');
    const money='$'+amount.toFixed(2),name=a.creator+' × '+product.name;
    const draft=['Subject: '+product.name+' for your '+a.niche+' audience','Hi '+a.creator+',',
      'I found your work through '+a.evidence+'. '+a.angle,
      'I make XXXINK clothing. Would you consider a short feature on '+product.name+'? I can provide the product image, caption and shop link. I propose '+money+' per attributable, paid and unrefunded sale, with no posting fee. Would that fit your channel?',
      'Product: '+product.url,'Proposed attribution: '+a.credit,
      'Before launch: agree on the attribution window, refunds, payout date and how both sides can check credited orders.',
      'Creator caption to adapt: '+a.angle+' See '+product.name+' here: '+product.url+' . I earn a commission on qualifying sales.',
      'Asset checklist: approved mockup, close-up crop, public product link, current size and shipping information.'].join('\n\n');
    if(write({kits:[{id:crypto.randomUUID(),name,stage:'Pitch ready',route:a.route,evidence:a.evidence,product:product.url,draft},...(current().kits||[])]})){kits();status('Pitch and caption saved. Review before contacting the creator.');}
  }
  function mount(node){
    root=node;
    root.innerHTML='<details open><summary><strong>Start here · XXXINK creator launch</strong></summary><p>Start with one published design. Save a short list, a commission offer and a pitch; return here to pick up where you left off.</p>'+
      '<h3>1 · Choose your merch</h3>'+label('Product name','newName')+label('Public POPCUSTOMS-connected product URL','newUrl','url')+
      '<button data-c="add">Add product</button><details><summary>Add a collection</summary><label>Paste two spreadsheet columns: product name and public product URL<textarea data-c="batch"></textarea></label><button data-c="import">Import rows</button></details>'+
      '<label class="field">Campaign product<select data-c="product"></select></label>'+
      '<h3>2 · Find a promoter</h3>'+label('Audience niche','niche')+'<button data-c="scout">Scout podcasts and check US trends</button><div data-c="platforms"></div><div data-c="results"></div><details><summary>Fashion publication contact routes</summary><div data-c="sources"></div></details>'+
      label('Creator or publication','creator')+label('Public business contact page','route','url')+label('Relevant post, issue or episode','evidence','url')+label('Why this design fits their audience','angle')+
      '<h3>3 · Price a commission-only pilot</h3>'+label('Item revenue after discount, excluding tax (USD)','price','number')+
      label('All costs per sale, including fees, shipping you cover and returns reserve (USD)','cost','number')+
      label('Profit to retain per sale (USD)','keep','number')+'<p data-c="margin"></p>'+label('Proposed creator payment per eligible sale (USD)','offer','number')+
      label('How checkout will credit the creator, e.g. a working unique order code','credit')+
      '<button data-c="create">Build creator pitch and caption</button><p role="status" data-c="status"></p><div data-c="kits"></div></details><h2>Merchant affiliate programs</h2>';
    products();
    for(const k of inputNames){
      const x=el(k);x.value=current().inputs?.[k]||'';
      if(x.type==='number'){x.min='0';x.step='0.01';}
      x.oninput=()=>{saveInputs();report();if(k==='niche')scoutLinks();};
    }
    function add(raw){
      try{
        const ps=importRows(raw,current().products||[]);
        if(!write({products:ps}))return;
        products();el('product').value=ps.at(-1)?.url||'';saveInputs();status(ps.length+' products saved.');
      }catch(e){status(e.message);}
    }
    el('add').onclick=()=>add(el('newName').value+'\t'+el('newUrl').value);
    el('import').onclick=()=>add(el('batch').value);
    el('scout').onclick=()=>{
      const q=el('niche').value.trim();if(!q||q.length>120)return status('Enter a niche of 1–120 characters.');
      const native=window.ArchiveNative;
      if(!native?.scoutCreators)return status('Use the platform searches here or refresh from the Android app.');
      status(native.scoutCreators(q)?'Checking US podcast listings and Google Trends…':'A search is in progress.');
    };
    el('create').onclick=create;showSources();results();scoutLinks();report();kits();
  }
  return {application(id){return current().applications?.[id]||'Considering';},setApplication(id,stage){return write({applications:{...current().applications,[id]:stage}});},connect(adapter){api=adapter;},mount,receive};
})();
