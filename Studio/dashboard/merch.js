'use strict';
window.Merch=(()=>{
 const markup='<section class="card"><h1>XXXINK merch studio</h1><p>Threadshop for the curious,Hood-Wearz for the cultured</p><a class="quiet" href="https://fuckyeah.3xink.com">Open PopCommerce storefront</a><p data-count></p><label class="field">Find a design or variant SKU<input data-find></label><select aria-label="Design" data-list></select><div data-editor></div><details><summary>Store relaunch and order setup</summary><p>Start with one tee, one hoodie and one accessory. Keep the design name, add the garment type, then tag the visible motif, garment construction and collection. Add a size chart and a close-up of each featured print before promotion.</p><p>Store 27621 · General order connection awaiting provider instructions. Keep the order credential in the sending platform’s protected integration settings or your server’s secret store. Check signature, required fields and duplicate handling in the provider instructions before enabling fulfillment.</p><p>Supplier transfer: locate the original print file, request the new supplier’s panel template, and compare a single-unit sample including shipping to the same ZIP. Check seam alignment, color, size and wash results.</p></details><details><summary>Recovered storefront artwork</summary><div data-art></div></details><p role="status" data-msg></p></section>';
 let data;
 function floor(cost,shipping,fixed,profit,fee,commission,discount){
   const v=[cost,shipping,fixed,profit,fee,commission,discount];
   if(v.some(n=>n===''||!Number.isFinite(Number(n))||Number(n)<0)||Number(discount)>=100||Number(fee)+Number(commission)>=100)return null;
   return Math.ceil(100*(Number(cost)+Number(shipping)+Number(fixed)+Number(profit))/((1-discount/100)*(1-(Number(fee)+Number(commission))/100)))/100;
 }
 async function mount(view,read,write,send){
  const get=k=>view.querySelector('[data-'+k+']'),editor=get('editor'),list=get('list');
  try{if(!data){const r=await fetch('./brand/archive.json');if(!r.ok)throw Error();data=await r.json();}}
  catch{get('msg').textContent='Catalog could not be opened.';return;}
  if(!editor.isConnected)return;
  get('count').textContent=data.products.length+' archived product groups · '+data.products.reduce((n,p)=>n+p.variants.length,0)+' variant SKUs';
  for(const asset of data.assets){const img=document.createElement('img');img.loading='lazy';img.src='./brand/'+asset;img.alt=asset;img.style.maxWidth='200px';get('art').append(img);}
  function show(){
   editor.replaceChildren();const p=data.products.find(x=>x.id===list.value);if(!p)return;
   const old=read()[p.id]||{},v=p.variants[0],text={};
   const note=document.createElement('p');note.textContent='Supplier export · '+p.id+' · '+p.variants.length+' variants. Verify current costs before publishing.';editor.append(note);
   for(const [i,url] of p.images.slice(0,5).entries()){const a=document.createElement('a');a.href=url;a.className='quiet';a.textContent='Mockup '+(i+1);editor.append(a,' ');}
   function input(key,label,value,type='text'){
    const l=document.createElement('label');l.className='field';l.textContent=label;const e=document.createElement('input');e.type=type;e.value=old[key]??value;
    if(type==='number'){e.min='0';e.step='0.01';}l.append(e);editor.append(l);text[key]=e;return e;
   }
   const title=p.name.toLowerCase().includes(p.kind.toLowerCase())?p.name:p.name+' — '+p.kind;
   input('name','Listing title',title);
   const tags=['XXXINK',p.kind,...(/all.over.print/i.test(p.desc)?['all-over print']:[]),...(/zipper|full.zip/i.test(p.desc)?['zip closure']:[])];
   input('tags','Tags to review',tags.join(', '));
   input('copy','Opening line',title+' from XXXINK. '+(p.desc.split(/[.!?]\s+|\s*\*\s*/).filter(Boolean)[0]||'').slice(0,175));
   input('url','Verified buyer-facing product URL','', 'url');
   const variant=document.createElement('select');variant.setAttribute('aria-label','Supplier variant');
   for(const sku of p.variants)variant.add(new Option(sku.sku+' · '+sku.size+' · '+sku.color,sku.sku));editor.append(variant);
   variant.value=old.variant||v.sku;
   const values=[['cost','Production cost USD',v.cost],['shipping','Seller-paid shipping and reserve USD',''],['fixed','Fixed payment fee USD',''],['profit','Desired dollars left per sale',''],['fee','Variable fees %',''],['commission','Creator commission %',''],['discount','Buyer discount %','0']];
   for(const [k,label,val] of values)input(k,label,val,'number');
   const result=document.createElement('p');editor.append(result);
   function calc(){const f=floor(...values.map(([k])=>text[k].value));result.textContent=f===null?'Enter each cost and percentage (zero if none).':'Minimum list price for this scenario: $'+f.toFixed(2);}
   const quote=document.createElement('p');editor.append(quote);
   function historical(reset){const sv=p.variants.find(s=>s.sku===variant.value)||v;quote.textContent='Archived base $'+sv.cost.toFixed(2)+' · archived suggested retail $'+sv.suggested.toFixed(2);if(reset)text.cost.value=sv.cost;calc();}
   variant.onchange=()=>historical(true);historical(false);
   for(const [k] of values)text[k].oninput=calc;
   function save(){return write(p.id,{...Object.fromEntries(Object.entries(text).map(([k,e])=>[k,e.value])),variant:variant.value});}
   const b=document.createElement('button');b.textContent='Save listing draft';b.onclick=()=>{if(save())get('msg').textContent='Listing draft saved on this device.';};editor.append(b);
   const c=document.createElement('button');c.textContent='Use in creator campaign';c.onclick=()=>{
    let u;try{u=new URL(text.url.value);}catch{}if(!u||u.protocol!=='https:'||u.username||u.password||!text.name.value.trim()){get('msg').textContent='Enter the listing title and a checked HTTPS product link.';return;}
    if(save()&&send({name:text.name.value,url:u.href}))location.hash='affiliates';
   };editor.append(c);
  }
  function filter(){const q=get('find').value.toLowerCase();list.replaceChildren();for(const p of data.products)if([p.id,...p.names,p.kind,...p.variants.map(v=>v.sku)].some(s=>s.toLowerCase().includes(q)))list.add(new Option(p.name+' · '+p.id,p.id));show();}
  get('find').oninput=filter;list.onchange=show;filter();
 }
 return {markup,mount,floor};
})();
