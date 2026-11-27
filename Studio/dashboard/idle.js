'use strict';

window.IdleMonster = (() => {
  const idleMs = 213000;
  const dialog = document.querySelector('#idle-monster');
  const title = document.querySelector('#monster-title');
  const message = document.querySelector('#monster-message');
  const category = document.querySelector('#monster-category');
  const source = document.querySelector('#monster-source');
  const next = document.querySelector('#monster-next');
  const preference = 'archive-launch-desk.idle-tips';
  const tips = [
    ['Land a sale','Offer a paid pilot','Pitch one deliverable, one turnaround, and one revision. Make it easy for the client to say yes to a small project and know what comes next.'],
    ['Recurring clients','Sell a schedule they can plan around','After a good delivery, offer four assets per month, delivered on a fixed day. Define what counts as an asset and what changes cost extra.'],
    ['Lead hunting','Look for visible deadlines','Search for venues with next month’s calendar posted. Find one event without fit-for-purpose promo graphics and pitch a square, story, and banner package.'],
    ['Niche to test','Photo archive cleanup','Offer naming, duplicate review, tagging, and a contact sheet for a client’s first 100 images. Validate demand with small archives before offering a full migration.'],
    ['Digital product','Bundle a specific job','A venue promo kit with editable sizes, an event-copy checklist, and a handoff guide solves a more specific problem than a folder of blank templates.'],
    ['Pitch hygiene','Avoid three reasons to ignore you','Skip giant attachments, generic praise, and a vague request for a meeting. Send one relevant sample and one specific question.'],
    ['Influencer pitch','Give them a useful demo','Try: “I made a [tool] that helps [audience] do [task]. Want a free demo and an optional tracked link if it’s a fit for your audience?”'],
    ['Audience building','Publish a repeatable series','Show one before-and-after each week. Use the same format, explain one useful decision, and link to one sample or offer people can act on.'],
    ['Licensing','Scope the usage first','Ask where the image will appear, for how long, and whether the client wants exclusivity. A usage quote is easier to price after those details are clear.'],
    ['Proof of value','Use one relevant sample','Pick the piece closest to what they need. Add one sentence about which problem you solved and what you delivered.'],
    ['Find buyers','Search for the role doing the buying','Try searches for photo editor, digital asset manager, promotions director, and event producer. Use the organization’s published contact or application route.'],
    ['Repeat work','Build the next request into delivery','When you deliver artwork, ask what the client is publishing next month. Suggest a draft brief or a repeatable package around that deadline.'],
    ['Marketing','Try one variable at a time','Test two pitch openings with similar prospects and track replies. If you also change the offer and the audience, you won’t know what made the difference.'],
    ['Platforms','Look at creative staffing briefs','Search Aquent for photo retouching, visual QA, and digital asset work. Check posted pay and location before spending time on the application.','https://aquent.com/find-work'],
    ['Affiliates','Demonstrate before recommending','Show a tool solving a real problem your audience has. Give the tradeoffs and clearly disclose when an eligible link earns you a commission.'],
    ['Artist opportunities','Filter for paid work','Check Seattle’s arts opportunity board for commissions and artist calls. Read the organizer’s budget, eligibility, and deadline before applying.','https://www.seattle.gov/arts/opportunities/other-opportunities'],
    ['Pricing','Split production and usage','Show what it costs to produce the work and what the proposed license covers. This makes changes in usage easier to quote without redoing the entire proposal.'],
    ['Tech in plain English','What a file hash does','A file hash fingerprints bytes. It can catch an identical copy with a new filename. A crop or an export usually changes the fingerprint.'],
    ['Get the first buyer','Write the offer around a result','Lead with what they can publish at the end of the job. A three-size promo pack with a clear delivery date is easier to buy than open-ended creative help.'],
    ['Demand check','Validate before building a full pack','Show one sample to five potential buyers. Ask what they use now, and whether they’d pay for this version. Repeated answers are more useful than likes.'],
    ['Remote gigs','Use adjacent search terms','Look for picture researcher, image QA, photo evaluator, and catalog metadata. A photo portfolio can be evidence for work that isn’t called photography.'],
    ['Follow-ups','Follow up with new information','Instead of just checking in, add a relevant sample, a rough deliverable list, or a smaller starting option. Give them something concrete to respond to.'],
    ['Scope control','Quote the handoff','List the number of files, formats, sizes, revisions, and delivery window. Name source files or usage rights separately when they are part of the deal.'],
    ['Small digital work','Productize the boring task','Try a fixed-scope service for 20 filenames, 20 alt-text drafts, and a searchable contact sheet. A narrow outcome is easy for a buyer to evaluate.']
  ];
  const quotes = [
    'Solidarity is the work we make possible for each other.',
    'Keep the tools close and the door open.',
    'Own your labor. Share the knowledge.',
    'A fair price is part of the work.',
    'Build what your community can use and your neighbors can teach.',
    'The future belongs to the people who show up for one another.',
    'A door you hold open can become a public entrance.',
    'The work is ours. So is the right to decide what it builds.',
    'Leave the tools easier to find than you found them.',
    'Every useful skill can become common ground.',
    'A community is stronger when everyone can make something.',
    'Keep asking who gets a say, and who gets paid.'
  ];
  const palettes = [
    ['#c6ff58','#2b8b52','#fc77cc'],['#ff84d4','#732f9b','#f6ff8b'],
    ['#8aafff','#504db2','#a4ffdd'],['#ff9b6e','#8c396e','#fff995'],
    ['#6bffd0','#26738c','#faabff'],['#f4ea83','#ad476a','#adbeff']
  ];
  let enabled = true, timer, stage, lastSprite = -1, lastQuote, lastTip;
  let tipBag = [], quoteBag = [], live = [], visits = 0;
  try { enabled = localStorage.getItem(preference) !== 'off'; } catch {}
  const draw = items => items.splice(Math.floor(Math.random()*items.length),1)[0];
  function rotate(bag, values, previous) {
    if (!bag.length) bag.push(...values);
    if (bag.length === values.length && previous && bag.includes(previous)) {
      const others = bag.filter(item => item !== previous);
      const item = draw(others);
      bag.splice(bag.indexOf(item),1);
      return item;
    }
    return draw(bag);
  }
  function sprite() {
    const ctx = document.querySelector('#monster-pixels').getContext('2d');
    if (!ctx) return;
    let n = Math.floor(Math.random()*95);
    if (n >= lastSprite && lastSprite >= 0) n++;
    lastSprite = n;
    const [base,shadow,glow] = palettes[n % palettes.length];
    const ears = Math.floor(n / 6) % 4;
    const eyes = Math.floor(n / 24) % 4;
    const rows = [
      '00011000011000','00111100111100','00111111111100','01111111111110',
      '11111111111111','11111111111111','11111111111111','11111111111111',
      '11111111111111','01111111111110','00111111111100','00111001110000'
    ];
    ctx.clearRect(0,0,24,24);
    const pixel = (x,y,color) => { ctx.fillStyle=color; ctx.fillRect(x,y,1,1); };
    for (const [y,row] of rows.entries()) for (let x=0;x<14;x++) {
      if (row[x] !== '1' || (y < 2 && ears === 0)) continue;
      const edge = !rows[y-1] || rows[y-1][x] !== '1' || !rows[y+1] || rows[y+1][x] !== '1' ||
        row[x-1] !== '1' || row[x+1] !== '1';
      pixel(x+5,y+6,edge ? shadow : base);
    }
    if(ears===1){pixel(8,5,glow);pixel(15,5,glow);}
    if(ears===2){pixel(6,8,base);pixel(17,8,base);pixel(5,7,glow);pixel(18,7,glow);}
    if(ears===3){pixel(11,5,base);pixel(12,4,glow);pixel(13,5,base);}
    const line = eyes===1 ? [9,10,11,13,14,15] : eyes===2 ? [11,12,13] : [9,10,14,15];
    for(const x of line){pixel(x,11,'#171220');pixel(x,12,'#171220');}
    if(eyes===3){pixel(9,11,'#fff');pixel(15,11,'#fff');}
    for (const x of [11,12,13]) pixel(x,15,'#171220');
    pixel(6,14,glow);pixel(17,14,glow);
  }

  function schedule(){
    clearTimeout(timer);
    if(!enabled || document.hidden || dialog.open) return;
    timer = setTimeout(() => {
      if (document.hidden || document.querySelector('dialog[open]')) { schedule(); return; }
      show();
    },idleMs);
  }
  function show(){
    if (document.hidden || dialog.open || document.querySelector('dialog[open]') || typeof dialog.showModal !== 'function') return;
    clearTimeout(timer);
    sprite();
    stage = 'tip';
    visits++;
    const lead = visits%4===0 && live.length ? live.shift() : null;
    source.hidden = true;
    source.removeAttribute('href');
    if (lead){
      category.textContent = 'Live board match · checked ' + lead.checked;
      title.textContent = lead.name;
      message.textContent = (lead.pay ? lead.pay + '. ' : '')+'Check the original posting for eligibility and how to apply.';
      source.href = lead.url;
      source.textContent = 'Open original listing ↗';
      source.hidden = false;
    } else {
      lastTip = rotate(tipBag,tips,lastTip);
      [category.textContent,title.textContent,message.textContent] = lastTip;
      if(lastTip[3]){
        source.href=lastTip[3];
        source.textContent='Open resource ↗';
        source.hidden=false;
      }
    }
    next.textContent = 'Reveal quote';
    dialog.showModal();
  }
  function advance(){
    if(stage==='tip'){
      stage='quote';
      lastQuote=rotate(quoteBag,quotes,lastQuote);
      category.textContent='Revolutionary quote';
      title.textContent=lastQuote;
      message.textContent='Original line for I.A.';
      source.hidden=true;
      next.textContent='Back to the desk';
      return;
    }
    if(stage!=='quote')return;
    stage=undefined;
    dialog.close();
    window.ArchiveNative?.refreshPublicLeads?.();
  }
  next.onclick=advance;
  dialog.addEventListener('click',event=>{
    if(!event.target.closest('a,button'))advance();
  });
  dialog.addEventListener('cancel',event=>{event.preventDefault();advance();});
  dialog.addEventListener('close',schedule);
  for(const event of ['pointerdown','wheel','keydown'])window.addEventListener(event,schedule,{passive:true,capture:true});
  document.addEventListener('visibilitychange',schedule);
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-monster-preview]'))show();
    const toggle=event.target.closest('[data-monster-toggle]');
    if(toggle){
      enabled=!enabled;
      try{localStorage.setItem(preference,enabled?'on':'off');}catch{}
      toggle.textContent=enabled?'Turn off idle tips':'Turn on idle tips';
      schedule();
    }
  });
  schedule();
  return {
    enabled:()=>enabled,
    setLiveLeads(rows){
      const checked=new Date().toLocaleDateString();
      live=rows.filter(row=>/^https:\/\/(jobs\.ashbyhq\.com|jobs\.lever\.co|job-boards\.greenhouse\.io|boards\.greenhouse\.io|(?:www\.)?(?:voxmedia\.com|discord\.com|wikimediafoundation\.org))\//.test(row.url))
        .map(row=>({name:row.name,url:row.url,checked,pay:row.budget==='Check original listing'?'':row.budget}));
    }
  };
})();
