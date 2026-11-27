'use strict';

window.AffiliateCampaigns=(()=>{
  const printful={id:'printful',name:'Printful',network:'Printful',category:'Print on demand',
    url:'https://www.printful.com/affiliates',terms:'https://www.printful.com/policies/download/affiliate',
    eligibility:'Apply through Printful and use the unique link from your approved dashboard.',
    restrictions:['Review the agreement for eligible referrals and permitted placements.']};
  const markup=`<section class="card"><h1>Affiliate campaigns</h1><div data-creators></div>
    <p>Choose a program and prepare a recommendation for an album, article, or product page.</p>
    <button class="quiet" data-owner>Open AffiliateFlow owner desk</button>
    <p class="small" role="status" data-aff-status>Loading programs…</p>
    <form class="formgrid" data-campaign>
      <label class="field">Program<select name="program" required></select></label>
      <div data-terms></div><label class="field">Application progress<select data-application><option>Considering</option><option>Applied</option><option>Approved</option><option>Declined</option></select></label><p class="small">Open the program application, register your publishing channel, then record the provider’s decision here. After approval, paste the issued link below. Creator redistribution depends on the merchant’s terms.</p>
      <label class="field">Album<select name="album"></select></label>
      <label class="field">Placement<input name="placement" required maxlength="160" placeholder="Vintage styling guide"></label>
      <label class="field">What makes this relevant to your audience?<textarea name="reason" required maxlength="1600"></textarea></label>
      <label class="field">Provider-issued HTTPS link, if approved<input name="link" type="url" maxlength="3000"></label>
      <button class="primary" disabled>Save campaign in Workdesk</button>
    </form>
    <details><summary>Network portals</summary><ul data-networks></ul></details>
    </section>`;
  function secure(value){
    try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}
  }
  function anchor(label,url){
    const a=document.createElement('a');a.textContent=label;a.className='quiet';a.href=secure(url);return a;
  }
  function draft(program,placement,album,reason,link){
    const disclosure=program.id==='amazon-associates'
      ?'As an Amazon Associate I earn from qualifying purchases.'
      :'I may earn a commission if you buy through my link.';
    return {id:crypto.randomUUID(),kind:'prospect',verified:false,category:'affiliate',
      name:program.name+' · '+placement,source:program.url,buy:link,approval:'draft',
      notes:[placement,album,program.name+' program terms: '+program.terms].filter(Boolean).join('\n'),
      draft:[reason,disclosure,link||'[Add your provider-issued link before publishing.]'].join('\n\n')};
  }
  let catalog;
  async function mount(view,albums){
    window.CreatorDesk.mount(view.querySelector('[data-creators]'));
    const form=view.querySelector('[data-campaign]'),status=view.querySelector('[data-aff-status]');
    view.querySelector('[data-owner]').onclick=()=>window.ArchiveNative?.openAffiliateDesk
      ?window.ArchiveNative.openAffiliateDesk():status.textContent='Open the Android app to access the native owner desk.';
    try{
      if(!catalog){
        const response=await fetch('./catalog.json');
        if(!response.ok)throw Error();
        catalog=await response.json();
      }
      if(!form.isConnected)return;
      const programs=[...catalog.programs,printful], f=form.elements;
      for(const p of programs)f.program.add(new Option(p.name,p.id));
      f.album.add(new Option('General campaign',''));
      for(const a of albums)f.album.add(new Option(a.name,a.name));
      for(const n of catalog.networks){
        const li=document.createElement('li');li.append(anchor(n.name,n.url),' '+n.note);view.querySelector('[data-networks]').append(li);
      }
      const chosen=()=>programs.find(p=>p.id===f.program.value);
      function terms(){
        const p=chosen(),box=view.querySelector('[data-terms]'),summary=document.createElement('p');
        summary.textContent=[p.eligibility,...p.restrictions].join(' ');
        const stage=view.querySelector('[data-application]');stage.value=window.CreatorDesk.application(p.id);
        stage.onchange=()=>{if(!window.CreatorDesk.setApplication(p.id,stage.value))stage.value=window.CreatorDesk.application(p.id);};
        box.replaceChildren(summary,anchor('Program application',p.url),' ',anchor('Official terms',p.terms));
      }
      let handoff=window.ArchiveNative?.pendingAffiliateChoice?.()||'';
      if(handoff){
        const incoming=JSON.parse(handoff);
        if(programs.some(p=>p.id===incoming.program)&&secure(incoming.url)){
          f.program.value=incoming.program;f.link.value=incoming.url;f.placement.value=incoming.label||'';
        }
      }
      f.program.onchange=()=>{f.link.value='';terms();};
      terms();status.textContent=programs.length+' programs · '+catalog.networks.length+' network portals';
      form.querySelector('.primary').disabled=false;
      form.onsubmit=event=>{
        event.preventDefault();event.stopPropagation();
        const link=f.link.value.trim(),reason=f.reason.value.trim(),placement=f.placement.value.trim();
        if(link&&!secure(link)){status.textContent='Use a provider-issued HTTPS link.';return;}
        if(!reason||!placement){status.textContent='Enter the placement and recommendation.';return;}
        if(!window.ArchiveWorkdesk.addCampaign(draft(chosen(),placement,f.album.value,reason,link))){
          status.textContent='Campaign could not be saved. Your draft is still here.';return;
        }
        if(handoff)window.ArchiveNative?.clearAffiliateChoice?.(handoff);
        location.hash='workdesk';
      };
    }catch{status.textContent='Could not load campaign details. Reopen Affiliates to retry.';}
  }
  return {markup,mount};
})();
