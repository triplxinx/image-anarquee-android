'use strict';

window.WideTools = (() => {
  const DAY = 86400000;
  const evidenceKeys = ['posting','organizer','eligibility','pay','route'];
  const evidenceLabels = {posting:'Open status and deadline',organizer:'Organizer',eligibility:'Eligibility',pay:'Compensation',route:'Application route'};
  const recipes = {
    licensing:{name:'Photo story / image pack',base:2,unit:.45,proof:'Three small images with working captions and a rights note'},
    design:{name:'Illustration / design package',base:3,unit:2,proof:'One sketch or composition with a scope note'},
    video:{name:'Film, audio or motion edit',base:5,unit:2.5,proof:'A 30-second rough cut or a six-frame storyboard'},
    copy:{name:'Article / editorial package',base:2,unit:1.25,proof:'An outline, source list and a short opening'},
    landing:{name:'Web or exhibition prototype',base:4,unit:2.5,proof:'One screen or wall mockup with an accessibility note'}
  };
  const ideaFormats = {
    licensing:'A short captioned image pack',design:'A reusable illustration or printed mini-edition',
    video:'A short cutdown with captions',copy:'A short editorial or research packet',landing:'A reusable single-page prototype'
  };
  const dated = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const n = Date.parse(value+'T00:00:00Z');
    return Number.isFinite(n) && new Date(n).toISOString().slice(0,10)===value ? n : NaN;
  };
  const age = (today, observed) => (dated(today)-dated(observed))/DAY;
  const recent = (today, observed, days) => age(today,observed)>=0 && age(today,observed)<=days;
  const normalize = txt => ' '+String(txt??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()+' ';
  const terms = value => [...new Set(String(value??'').split(',').map(x=>x.trim()).filter(x=>normalize(x).trim().length>1))].slice(0,40);
  const matched = (text, words) => words.filter(x=>text.includes(normalize(x)));
  function https(value) {
    try {
      const u = new URL(value);
      if (u.protocol!=='https:' || u.username || u.password) return '';
      u.hash = '';
      for (const k of [...u.searchParams.keys()]) if (/^utm_|^(fbclid|gclid)$/i.test(k)) u.searchParams.delete(k);
      return u.href;
    } catch { return ''; }
  }
  const route = value => https(value) || (/^[\w.!#$%&'*+/=?^\x60{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value||'') ? value : '');
  const routeLink = value => https(value) || (route(value) ? 'mailto:'+value : '');
  function evidenceState(row,today,days=7) {
    const checks = row.checks || {};
    const source = https(row.official);
    const closed = row.providerState==='closed' || (row.closing && (!Number.isFinite(dated(row.closing))||dated(row.closing)<dated(today)));
    const known = {
      posting: Boolean(source && row.activeStatus==='open' && (row.closing || row.kind==='intake')),
      organizer: Boolean(row.organizer?.trim()),
      eligibility: ['eligible','ineligible','unclear'].includes(row.eligibilityStatus) && Boolean(row.eligibility?.trim()),
      pay: Boolean(row.payStatus==='undisclosed' || (['paid','unpaid','grant'].includes(row.payStatus)&&row.compensation?.trim())),
      route: Boolean(route(row.application))
    };
    const missing = evidenceKeys.filter(k=>!known[k] || !recent(today,checks[k],days));
    const active = !closed && row.eligibilityStatus==='eligible' && missing.length===0;
    const observed = String(row.applicants??'').trim()===''?NaN:Number(row.applicants);
    const measured = Boolean(https(row.competitionSource)) && Number.isSafeInteger(observed) && observed>=0 &&
      recent(today,checks.count,days);
    return {active,closed,missing,known,measured,observed,low:active&&measured&&observed<=10,checked:missing.length?'':evidenceKeys.map(k=>checks[k]).sort()[0]};
  }
  const dependencies = {
    posting:['official','closing','kind','activeStatus'],organizer:['official','organizer'],
    eligibility:['official','eligibilityStatus','eligibility'],pay:['official','payStatus','compensation'],
    route:['official','application'],count:['official','applicants','competitionSource']
  };
  function stampChecks(previous,row,confirmed,today) {
    const known=evidenceState(row,today).known;
    const checks={};
    for (const [key,fields] of Object.entries(dependencies)) {
      const valid=key==='count'?Boolean(https(row.competitionSource) && /^\d+$/.test(row.applicants||'')):known[key];
      if (!valid) continue;
      if (confirmed.includes(key)) checks[key]=today;
      else if (fields.every(f=>(previous?.[f]??'')===(row[f]??'')) && previous?.checks?.[key]) checks[key]=previous.checks[key];
    }
    return checks;
  }
  function portfolio(row, assets, today) {
    const brief=normalize(row.title+' '+row.description+' '+(row.niche||''));
    const allowed = assets.filter(asset=>asset.rights==='cleared' && (!asset.rightsUntil ||
      (Number.isFinite(dated(asset.rightsUntil)) && dated(asset.rightsUntil)>=dated(today))));
    const excluded = new Set(row.excludedAssets || []);
    const pinned = new Set(row.pinnedAssets || []);
    return allowed.map(asset=>{
      const causes=matched(brief, (asset.tags?.subjects||terms(asset.subjects)));
      const styles=matched(brief, (asset.tags?.styles||terms(asset.styles)));
      const medium=asset.lane===row.lane;
      return {asset,causes,styles,medium,pinned:pinned.has(asset.hash),score:causes.length*5+styles.length*3+(medium?2:0)};
    }).filter(x=>!excluded.has(x.asset.hash)&&(x.pinned||x.score>0))
      .sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.score-a.score||a.asset.name.localeCompare(b.asset.name)).slice(0,5);
  }
  function production(row, settings, today) {
    const recipe = recipes[row.lane];
    const hasUnits = Number(row.units)>0;
    const hours = Number(row.hours)>0 ? Number(row.hours) : hasUnits&&recipe ? recipe.base+Number(row.units)*recipe.unit : 0;
    const buffered=Math.ceil((hours+Number(row.dependencies||0))*1.3*2)/2;
    const calendarDays=age(row.production,today)+1;
    const dateCapacity=Math.max(0,calendarDays*24);
    const rate=Number(settings.weekly) || 0;
    const scheduled=Number.isFinite(calendarDays)&&rate>0 ? Math.max(0,calendarDays*rate/7) : Infinity;
    const reservations=(settings.commitments||[]).filter(x=>dated(x.start)<=dated(row.production)&&dated(x.end)>=dated(today)&&x.brief!==row.url);
    const booked=reservations.reduce((total,x)=>total+x.hours,0);
    const explicit=row.available!=='' && row.available!=null && Number(row.available)>=0 ? Number(row.available) : Infinity;
    const available=Number.isFinite(calendarDays) && (Number.isFinite(scheduled)||Number.isFinite(explicit)) ?
      Math.max(0,Math.min(scheduled,explicit,dateCapacity)-booked):null;
    const floor=Number(row.rateFloor!==''&&row.rateFloor!=null?row.rateFloor:settings.floor)||0;
    const costs=Number(row.costs)||0;
    const fee=row.quotedFee===''||row.quotedFee==null||row.kind==='grant'||row.payStatus==='grant'?null:Number(row.quotedFee);
    const quote=buffered>0 && (floor>0 || costs>0)?buffered*floor+costs:null;
    const earning=fee===null || !buffered ? null:(fee-costs)/buffered;
    const fits = hours>0 && available!==null && calendarDays>0 && buffered<=available &&
      (quote===null || fee===null || fee>=quote) && row.approach!=='';
    return {recipe,buffered,hours,booked,available,quote,earning,fee,fits,calendarDays,
      status:calendarDays<=0?'Production deadline passed':!row.approach?'Choose an approach':!hours||available===null?'Needs estimate, deadline and available hours':
        buffered>available?'Over available hours':fee!==null&&quote!==null&&fee<quote?'Below your rate floor':'Fits available hours'};
  }
  function market(idea, today) {
    const data=idea?.signal;
    if (!data || !recent(today,data.observed,30) || !https(data.url) || !recent(today,data.end,90) ||
        !Number.isFinite(dated(data.start)) || !Number.isFinite(dated(data.end)) || dated(data.start)>dated(data.end) ||
        !Number.isFinite(dated(data.observed)) || dated(data.observed)<dated(data.end) || !Number.isSafeInteger(data.value) || data.value<=0) return null;
    const labels={interest:'Topic attention',search:'Search interest',click:'Observed clicks',purchase:'Observed purchases'};
    const weights={interest:2,search:3,click:6,purchase:10};
    if (!Object.hasOwn(labels,data.kind)) return null;
    return {signal:labels[data.kind],points:Math.round(Math.min(35,Math.log1p(data.value)*weights[data.kind])+
      (data.kind==='purchase'?45:data.kind==='click'?22:0)),data};
  }
  function eligibleIdea(idea,row,today,days) {
    return Boolean(idea?.title?.trim() && idea?.fit?.trim() && market(idea,today) && evidenceState(row,today,days).active);
  }
  return {evidenceKeys,evidenceLabels,recipes,ideaFormats,dated,age,recent,normalize,terms,matched,https,route,routeLink,
    evidenceState,stampChecks,portfolio,production,market,eligibleIdea};
})();
