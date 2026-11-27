'use strict';
window.ArchiveStudio = (() => {
  const engine=window.StudioRender, formats=engine.formats;
  const defaults={format:'cover',look:'masthead',headline:'',caption:'',accent:'#c6ff78',x:50,y:50,
    rights:false,credit:'',notes:'',buyer:'',contact:'',source:'',context:'',scope:'',price:'',pitch:''};
  const deployed=/\/studio\/(?:index\.html)?$/.test(location.pathname);
  const maxBytes=45*1024*1024, maxPixels=32_000_000;
  const projectMagic='IMAG3v1\n', maxHeader=16_384;
  const textLimits={headline:95,caption:120,credit:250,notes:1200,buyer:120,contact:180,source:400,
    context:400,scope:400,price:100,pitch:1100};
  let draft={...defaults}, media=null, image=null, initialized, loadRevision=0, pendingLead=null;
  const markup=`
    <div class="sectiontop"><h1>Authoring Studio</h1><p class="muted">Compose a portfolio image for screens, print or a private licensing offer.</p></div>
    <section class="studio-workspace" id="authoring-studio">
      <div class="card studio-controls">
        <h2>Compose</h2>
        <label class="field">Choose an image<input type="file" data-studio-file accept="image/jpeg,image/png,image/webp"></label>
        <p class="small" data-studio-source>Images stay on this device while you compose.</p>
        <div class="formgrid">
          <label class="field">Format<select data-studio-field="format">${Object.entries(formats).map(([key,value])=>'<option value="'+key+'">'+value.label+'</option>').join('')}</select></label>
          <label class="field">Composition<select data-studio-field="look"><option value="masthead">Title at top</option><option value="caption">Title at bottom</option><option value="photo">Image only</option></select></label>
          <label class="field">Headline<input maxlength="95" data-studio-field="headline"></label>
          <label class="field">Subtitle<input maxlength="120" data-studio-field="caption"></label>
          <label class="field">Horizontal crop<input type="range" data-studio-field="x" min="0" max="100"></label>
          <label class="field">Vertical crop<input type="range" data-studio-field="y" min="0" max="100"></label>
          <label class="field">Subtitle color<input type="color" data-studio-field="accent"></label>
        </div>
        <details class="studio-details" open><summary>Rights and credits</summary>
          <label class="field">Credit line<input maxlength="250" data-studio-field="credit"></label>
          <label class="field">Rights or release notes<textarea maxlength="1200" data-studio-field="notes" rows="2"></textarea></label>
          <label><input type="checkbox" data-studio-field="rights"> I have permission for this version and its intended use</label>
        </details>
        <details class="studio-details" data-studio-offer><summary>Licensing brief</summary>
          <label class="field">Buyer<input maxlength="120" data-studio-field="buyer"></label>
          <label class="field">Buyer email or contact route<input maxlength="180" data-studio-field="contact"></label>
          <label class="field">Original brief URL<input type="url" maxlength="400" data-studio-field="source"></label>
          <label class="field">Project context<textarea rows="2" maxlength="400" data-studio-field="context"></textarea></label>
          <label class="field">Usage, term, territory and exclusivity<textarea rows="2" maxlength="400" data-studio-field="scope"></textarea></label>
          <label class="field">Proposed fee<input maxlength="100" data-studio-field="price"></label>
          <label class="field">Pitch<textarea rows="4" maxlength="1100" data-studio-field="pitch"></textarea></label>
          <div class="row"><button class="quiet" data-studio-action="draft-pitch">Draft pitch</button><button class="primary" data-studio-action="offer">Open private offer desk</button></div>
        </details>
        <div class="row studio-actions"><button class="quiet" data-studio-action="save">Save local draft</button><button class="quiet" data-studio-action="clear">Clear draft</button>
          <button class="quiet" data-studio-action="project">Export editable project</button></div>
        <label class="field studio-actions">Open editable project<input type="file" data-studio-project accept=".imag3,application/octet-stream"></label>
      </div>
      <div class="card studio-output">
        <div class="spread"><h2>Proof</h2><span class="badge" data-studio-size></span></div>
        <div class="studio-stage"><p data-studio-empty>Choose artwork to start composing.</p><canvas hidden aria-label="Composition preview"></canvas></div>
        <p class="small" data-studio-preflight></p>
        <details class="studio-details" data-studio-variations hidden><summary>Try three layout directions</summary><div class="studio-variations"></div></details>
        <div class="row"><button class="primary" data-studio-action="png" data-help="Export a full-resolution PNG when the rights check is set. Print layouts include the bleed area.">Export PNG</button>
          <button class="primary" data-studio-action="pdf" data-help="Export a 300 DPI raster PDF with separate trim and bleed boxes. Use a print format and an image that meets resolution.">Export print PDF</button>
          <button class="quiet" data-studio-action="proof" data-help="Save a low-resolution watermarked JPEG you can attach in the private licensing desk.">Save watermarked proof</button>
          <button class="quiet" data-studio-action="record">Export rights record</button>
          ${deployed?'<button class="quiet" data-studio-action="archive">Queue in XXX!NK archive</button>':''}</div>
        <p class="small" role="status" aria-live="polite" data-studio-status></p>
      </div>
    </section>`;
  function storage(operation,mode='readonly') {
    return new Promise((resolve,reject)=>{
      const open=indexedDB.open('imag3-authoring',1);
      open.onupgradeneeded=()=>open.result.createObjectStore('drafts');
      open.onerror=()=>reject(open.error);
      open.onsuccess=()=>{
        const db=open.result, tx=db.transaction('drafts',mode);
        const request=operation(tx.objectStore('drafts'));
        tx.oncomplete=()=>{db.close();resolve(request.result);};
        tx.onabort=()=>{db.close();reject(tx.error||Error('Local storage was interrupted.'));};
      };
    });
  }
  async function picture(blob) {
    if (!blob.size || blob.size>maxBytes) throw Error('Choose a JPEG, PNG or WebP image under 45 MiB.');
    const header=new Uint8Array(await blob.slice(0,12).arrayBuffer());
    const sig=String.fromCharCode(...header);
    if (!(sig.startsWith('\xFF\xD8\xFF') || sig.startsWith('\x89PNG\r\n\x1A\n') ||
        (sig.startsWith('RIFF')&&sig.slice(8)==='WEBP'))) throw Error('Choose a JPEG, PNG or WebP image.');
    const url=URL.createObjectURL(blob);
    try {
      const candidate=new Image();candidate.src=url;await candidate.decode();
      if (!candidate.width || candidate.width*candidate.height>maxPixels) throw Error('Choose an image with at most 32 megapixels.');
      return candidate;
    } finally { URL.revokeObjectURL(url); }
  }
  function normalize(raw) {
    const next={...defaults};
    if (!raw || typeof raw!=='object') return next;
    for (const [field,limit] of Object.entries(textLimits)) {
      if (typeof raw[field]==='string') next[field]=raw[field].slice(0,limit);
    }
    if (Object.hasOwn(formats,raw.format)) next.format=raw.format;
    if (['masthead','caption','photo'].includes(raw.look)) next.look=raw.look;
    if (/^#[0-9a-f]{6}$/i.test(String(raw.accent))) next.accent=String(raw.accent);
    for (const key of ['x','y']) if (Number.isFinite(raw[key])) next[key]=Math.max(0,Math.min(100,raw[key]));
    next.rights=raw.rights===true;
    return next;
  }
  function editableProject() {
    const encoder=new TextEncoder();
    const metadata=encoder.encode(JSON.stringify({draft, name:media.name, mime:media.blob.type}));
    if (metadata.byteLength>maxHeader) throw Error('The project metadata is too large.');
    const header=new ArrayBuffer(4);
    new DataView(header).setUint32(0,metadata.byteLength);
    return new Blob([projectMagic,header,metadata,media.blob],{type:'application/octet-stream'});
  }
  async function openProject(root,file) {
    if (file.size>maxBytes+maxHeader+12) throw Error('This editable project is too large.');
    const revision=++loadRevision;
    const bytes=await file.slice(0,12).arrayBuffer();
    if (bytes.byteLength!==12 || new TextDecoder().decode(bytes.slice(0,8))!==projectMagic) {
      throw Error('Choose an iMAG3 editable project (.imag3).');
    }
    const length=new DataView(bytes).getUint32(8);
    if (!length || length>maxHeader || 12+length>=file.size) throw Error('The project header is incomplete.');
    const metadata=JSON.parse(await file.slice(12,12+length).text());
    if (typeof metadata?.name!=='string' || !metadata.draft) throw Error('The project is missing its source information.');
    const mime=['image/jpeg','image/png','image/webp'].includes(metadata.mime)?metadata.mime:'';
    const blob=file.slice(12+length,file.size,mime);
    const loaded=await picture(blob);
    if (revision!==loadRevision) return;
    draft=normalize(metadata.draft);draft.rights=false;
    image=loaded;media={blob,name:metadata.name.slice(0,250)};
    sync(root);
    root.querySelector('[data-studio-offer]').open=Boolean(draft.buyer);
    status(root,'Project opened. Review permissions before exporting.');
  }
  function status(root,message) { root.querySelector('[data-studio-status]').textContent=message; }
  function reset() {
    ++loadRevision;draft={...defaults};media=null;image=null;
  }
  function applyLead(lead) {
    draft={...draft,buyer:lead.buyer||'',contact:lead.contact||'',source:lead.source||'',context:(lead.context||'').slice(0,400),pitch:(lead.pitch||'').slice(0,1100),rights:false,scope:'',price:''};
  }
  async function initialize() {
    try {
      const entry=await storage(store=>store.get('active'));
      if (entry?.draft) draft=normalize(entry.draft);
      if (entry?.media) {
        image=await picture(entry.media.blob);
        media=entry.media;
      }
    } catch {
      return 'The last saved draft could not be fully restored.';
    }
    return '';
  }
  function sync(root) {
    for (const field of root.querySelectorAll('[data-studio-field]')) {
      const value=draft[field.dataset.studioField];
      if (field.type==='checkbox') field.checked=value;
      else field.value=value;
    }
    redraw(root);
  }
  function prep() {
    const f=engine.size(draft.format);
    const ratio=image?engine.crop(image,f.width,f.height,draft.x,draft.y)[4]:0;
    return {f,ppi:Math.floor(ratio*engine.dpi+1e-6),adequate:ratio>=1-1e-6};
  }
  function redraw(root) {
    const canvas=root.querySelector('canvas'), {f,ppi,adequate}=prep();
    canvas.hidden=!image;
    root.querySelector('[data-studio-empty]').hidden=Boolean(image);
    root.querySelector('[data-studio-source]').textContent=media?
      media.name+' · '+image.width+' × '+image.height+' px':'Images stay on this device while you compose.';
    root.querySelector('[data-studio-size]').textContent=f.trim?f.trim.join(' × ')+' in':f.width+' × '+f.height+' px';
    root.querySelector('[data-studio-preflight]').textContent=f.trim?
      '300 DPI output · ⅛ in bleed on all sides · RGB'+(image?' · '+ppi+' effective source PPI'+(adequate?'':' · choose a larger source for PDF'):''):
      (image&&!adequate?'This crop will enlarge the source for the selected output.':'Digital output · RGB');
    if (image) engine.render(canvas,image,draft,850);
    const ideas=root.querySelector('[data-studio-variations]');
    ideas.hidden=!image;
    if (image && ideas.open) drawVariations(ideas.querySelector('.studio-variations'));
    root.querySelector('[data-studio-action="project"]').disabled=!image;
    const ready=Boolean(image&&draft.rights);
    for (const action of ['png','pdf','offer','proof','record',...(deployed?['archive']:[])]) {
      root.querySelector('[data-studio-action="'+action+'"]').disabled=!ready || (action==='pdf'&&(!f.trim||!adequate));
    }
  }
  const layouts=[['masthead','Title at top'],['caption','Title at bottom'],['photo','Image only']];
  function drawVariations(container) {
    if (!container.children.length) for (const [look,label] of layouts) {
      const button=document.createElement('button');
      button.className='quiet';
      button.dataset.studioLook=look;
      button.append(document.createElement('canvas'),label);
      container.append(button);
    }
    for (const button of container.children) {
      const look=button.dataset.studioLook;
      button.setAttribute('aria-pressed',String(look===draft.look));
      engine.render(button.querySelector('canvas'),image,{...draft, look},210);
    }
  }
  async function queueArchive(canvas,stem,title) {
    const endpoint=new URL('../',location.href);
    endpoint.searchParams.set('action','studio-session');
    const auth=await fetch(endpoint,{cache:'no-store'});
    if (auth.status===401) throw Error('Sign in to the XXX!NK archive in another tab, then retry.');
    if (!auth.ok) throw Error('Could not reach the XXX!NK archive.');
    const {csrf}=await auth.json();
    endpoint.searchParams.set('action','upload');
    const payload=new FormData();
    payload.set('csrf',csrf);
    payload.set('source','studio');
    payload.set('title',title);
    payload.set('gallery','Authoring Studio');
    payload.set('file',await engine.encode(canvas,'image/jpeg',.85),stem+'-proof.jpg');
    const reply=await fetch(endpoint,{method:'POST',body:payload});
    if (!reply.ok || !(await reply.json()).ok) throw Error('The XXX!NK archive did not accept the proof.');
  }
  function readBase64(blob) {
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(String(reader.result).split(',',2)[1]);
      reader.onerror=()=>reject(Error('The proof could not be prepared.'));
      reader.readAsDataURL(blob);
    });
  }
  function draftPitch() {
    const target=draft.buyer?'Hi '+draft.buyer+',':'Hello,';
    return target+'\n\nI put together '+(draft.headline?'“'+draft.headline+'”':'a composition')+' as a '+formats[draft.format].label.toLowerCase()+
      ' example for your project.'+(draft.context?'\n\n'+draft.context:'')+
      (draft.scope?'\n\nProposed use: '+draft.scope:'')+(draft.price?'\nProposed fee: '+draft.price:'')+
      '\n\n[Relevant sample link]\n\nIf the direction fits, let me know which placements and timing you need.';
  }
  async function action(root,kind) {
    if (kind==='save') {
      await storage(store=>store.put({draft:{...draft},media},'active'),'readwrite');
      return 'Saved on this device. The source image is included in this local draft.';
    }
    if (kind==='clear') {
      await storage(store=>store.delete('active'),'readwrite');
      reset();root.querySelector('[data-studio-file]').value='';sync(root);return 'Local draft cleared.';
    }
    if (kind==='draft-pitch') {
      if (draft.pitch && !window.confirm('Replace the current pitch with a new draft?')) return '';
      draft.pitch=draftPitch().slice(0,1100);sync(root);return 'Pitch drafted. Review the copy and proposed use.';
    }
    if (!image) throw Error('Choose an image first.');
    if (!draft.rights && kind!=='project') throw Error('Confirm permission first.');
    const {f,ppi,adequate}=prep(), design={...draft}, asset=image;
    const title=design.headline.trim() || media.name.replace(/\.[^.]+$/,'') || 'Artwork';
    const stem=title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,72)||'artwork';
    if (kind==='project') {
      download(stem+'.imag3',editableProject(),'application/octet-stream');
      return 'Editable project prepared. It contains the original image and any private brief details.';
    }
    if (kind==='offer') {
      if (![design.buyer,design.context,design.scope,design.pitch].every(value=>value.trim())) {
        throw Error('Enter the buyer, context, proposed use and reviewed pitch.');
      }
      const desk=window.ArchiveLicensing, destination=desk.proofDestination();
      let proof='';
      if (destination) {
        const canvas=document.createElement('canvas');
        try {
          engine.render(canvas,asset,design,1100);
          proof=await readBase64(await engine.encode(canvas,'image/jpeg',.85));
        } finally {canvas.width=canvas.height=1;}
      }
      if (destination==='site') await storage(store=>store.put({draft:design,media},'active'),'readwrite');
      const result=desk.launch({...design,project:title.slice(0,180), placement:f.label},proof);
      return result==='attached'?'Offer draft opened with the proof attached.':'Offer draft opened. Attach the saved proof in the offer desk.';
    }
    if (kind==='record') {
      const record={version:1, title, sourceFile:media.name, sourcePixels:[asset.width,asset.height], outputPixels:[f.width,f.height],
        format:f.label, trimInches:f.trim||null, bleedInches:f.trim?engine.bleed:0, effectivePpi:f.trim?ppi:null,
        credit:design.credit, rightsNotes:design.notes, intendedUsage:design.scope, rightsConfirmedByOperator:true,
        recordedAt:new Date().toISOString()};
      download(stem+'-rights.json',JSON.stringify(record,null,2),'application/json');
      return 'Rights record prepared.';
    }
    const canvas=document.createElement('canvas');
    if (kind==='pdf'&&(!f.trim||!adequate)) throw Error('Select a print format and a source with at least 300 effective PPI.');
    try {
      const proof=kind==='proof'||kind==='archive';
      engine.render(canvas,asset,design,proof?1100:Infinity,proof);
      if (kind==='archive') {
        await queueArchive(canvas,stem,title);
        return 'Watermarked proof queued. Review its visibility in XXX!NK archive admin.';
      }
      if (kind==='pdf') {
        const jpeg=await engine.encode(canvas,'image/jpeg',.96);
        download(stem+'-print.pdf',await engine.printPdf(jpeg,design.format),'application/pdf');
      } else {
        const mime=proof?'image/jpeg':'image/png';
        download(stem+(proof?'-proof.jpg':'.png'),await engine.encode(canvas,mime,.88),mime);
      }
      return 'Export prepared.';
    } finally { canvas.width=canvas.height=1; }
  }
  async function setSource(root,blob,name) {
    const revision=++loadRevision;
    const loaded=await picture(blob);
    if (revision!==loadRevision) return;
    image=loaded;media={blob,name:name.slice(0,250)};draft.rights=false;
    if (!draft.headline) draft.headline=name.replace(/\.[^.]+$/,'').slice(0,95);
    sync(root);status(root,'Image ready. Check the composition and rights.');
  }
  async function mount(view) {
    const root=view.querySelector('#authoring-studio');
    const warning=await (initialized ||= initialize());
    if (!root.isConnected) return;
    if (pendingLead) {
      applyLead(pendingLead);pendingLead=null;
      root.querySelector('[data-studio-offer]').open=true;
    }
    sync(root);
    status(root,warning);
    let frame=0,busy=false;
    root.addEventListener('input',event=>{
      const field=event.target,key=field.dataset.studioField;
      if (!key) return;
      draft[key]=field.type==='checkbox'?field.checked:field.type==='range'?Number(field.value):field.value;
      cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>redraw(root));
    });
    root.querySelector('[data-studio-file]').addEventListener('change',async event=>{
      const file=event.target.files[0];
      if (!file) return;
      status(root,'Reading image…');
      try {await setSource(root,file,file.name);}
      catch (error) {status(root,error.message||'The image could not be read.');}
      finally {event.target.value='';}
    });
    root.querySelector('[data-studio-project]').addEventListener('change',async event=>{
      const file=event.target.files[0];
      if (!file) return;
      try {await openProject(root,file);}
      catch (error) {status(root,error.message||'The project could not be read.');}
      finally {event.target.value='';}
    });
    root.querySelector('[data-studio-variations]').addEventListener('toggle',()=>redraw(root));
    root.addEventListener('click',async event=>{
      const variant=event.target.closest('[data-studio-look]');
      if (variant) {draft.look=variant.dataset.studioLook;sync(root);return;}
      const button=event.target.closest('[data-studio-action]');
      if (!button || busy) return;
      busy=true;button.setAttribute('aria-busy','true');
      try {status(root,await action(root,button.dataset.studioAction));}
      catch (error) {status(root,error.message||'The action could not be completed.');}
      finally {busy=false;button.removeAttribute('aria-busy');}
    });
  }
  function useLead(data) { pendingLead=data;location.hash='studio'; }
  async function useMedia(blob,name) {
    await (initialized ||= initialize());
    const loaded=await picture(blob);
    ++loadRevision;image=loaded;media={blob,name:name.slice(0,250)};draft.rights=false;
    if (!draft.headline) draft.headline=name.replace(/\.[^.]+$/,'').slice(0,95);
    location.hash='studio';
  }
  return {markup,mount,useLead,useMedia};
})();
