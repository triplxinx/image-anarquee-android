'use strict';
window.ArchiveIntake = (() => {
  const cap = 50;
  const pageSize = 24;
  let queue = [], running = false, offset = 0, database, imageURLs = [];
  let unsubscribeView;
  let albumLabel = 'Unassigned', keepOriginals = false, drawnQueue;
  const progress = new Map(), edits = new WeakMap();
  const full = {left:0,top:0,width:100,height:100,scale:1};
  function fileKey(file){return JSON.stringify([file.name,file.size,file.lastModified]);}
  const clean = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const panel = () => document.querySelector('#photo-intake');
  function init() {
    if (!database) database = new Promise((resolve, reject) => {
      const request = indexedDB.open('archive-launch-desk-media', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        const store = db.createObjectStore('images', {keyPath:'hash'});
        store.createIndex('created','created');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch(error => {database = null;throw error;});
    return database;
  }
  async function request(mode, op) {
    const db = await init();
    return new Promise((resolve,reject) => {
      const transaction = db.transaction('images',mode);
      const call = op(transaction.objectStore('images'));
      transaction.oncomplete = () => resolve(call.result);
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  }
  async function page(start) {
    const db = await init();
    return new Promise((resolve,reject) => {
      const rows = [], transaction = db.transaction('images');
      const cursor = transaction.objectStore('images').index('created').openCursor(null,'prev');
      let skipped = false;
      cursor.onsuccess = () => {
        const item = cursor.result;
        if (!item || rows.length >= pageSize) {resolve(rows);return;}
        if(start && !skipped){skipped=true;item.advance(start);return;}
        const {original, edited, ...display} = item.value;
        rows.push({...display, hasOriginal:Boolean(original),hasEdit:Boolean(edited)});
        item.continue();
      };
      cursor.onerror = () => reject(cursor.error);
    });
  }
  async function composePhoto(hash) {
    try {
      const record=await request('readonly',store=>store.get(hash));
      const blob=record?.edited||record?.original;
      if (!blob) throw Error('The original or edited file is unavailable.');
      await window.ArchiveStudio.useMedia(blob,record.name);
    } catch (error) { displayProgress(error.message||'The saved image could not be opened.'); }
  }
  function clearURLs(){for(const url of imageURLs)URL.revokeObjectURL(url);imageURLs=[];}
  function displayProgress(message) {
    const node = panel();
    if(!node)return;
    node.querySelector('[data-photo-progress]').textContent = message;
    node.querySelector('[data-photo-run]').disabled = running || queue.length === 0;
    node.querySelector('[data-photo-clear]').disabled = running || queue.length === 0;
    node.querySelector('#photo-pick').disabled = running;
    node.querySelector('[data-photo-album]').disabled = running;
  }
  async function render() {
    const node = panel();
    if (!node){clearURLs();return;}
    const gallery = node.querySelector('[data-photo-gallery]');
    try {
      const total = await request('readonly', store => store.count());
      offset = Math.min(offset, Math.max(0,Math.floor((total-1)/pageSize)*pageSize));
      const records = await page(offset);
      if (panel()!==node)return;
      clearURLs();
      node.querySelector('[data-photo-count]').textContent = records.length
        ? (offset+1)+'–'+(offset+records.length)+' of '+total+' imported'
        : 'No images imported yet';
      gallery.innerHTML = records.map(r => {
        const url = r.thumbnail?URL.createObjectURL(r.thumbnail):'';
        if(url)imageURLs.push(url);
        return '<figure class="photo-record">'+(url?'<img src="'+url+'" alt="" loading="lazy">':'<div class="photo-placeholder">Preview unavailable</div>')+
          '<figcaption><strong>'+clean(r.name)+'</strong><small>'+clean(r.album)+(r.width?' · '+r.width+' × '+r.height:'')+'</small>'+(r.hasOriginal?'<button class="quiet" type="button" data-photo-original="'+clean(r.hash)+'">Save original</button>':'')+(r.hasEdit?'<button class="quiet" type="button" data-photo-edit-save="'+clean(r.hash)+'">Save edited image</button>':'')+((r.hasOriginal||r.hasEdit)?'<button class="quiet" type="button" data-photo-studio="'+clean(r.hash)+'">Compose in Studio</button>':'')+'</figcaption></figure>';
      }).join('');
      node.querySelector('[data-photo-previous]').disabled = offset===0;
      node.querySelector('[data-photo-next]').disabled = offset+pageSize>=total;
    } catch {
      if(panel()===node)gallery.textContent='Local image storage could not be opened in this browser.';
    }
  }
  async function preview(file) {
    let image, sourceURL;
    try {
      if(typeof createImageBitmap==='function'){
        try {image = await createImageBitmap(file);} catch {}
      }
      if(!image){
        sourceURL = URL.createObjectURL(file);
        image = new Image();image.src=sourceURL;await image.decode();
      }
      const width=image.width,height=image.height,scale=Math.min(1,320/Math.max(width,height));
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
      const context=canvas.getContext('2d',{alpha:false});
      context.fillStyle='#f4f4ee';context.fillRect(0,0,canvas.width,canvas.height);
      context.drawImage(image,0,0,canvas.width,canvas.height);
      const thumbnail=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.79));
      return {width,height,thumbnail};
    } finally {
      image?.close?.();if(sourceURL)URL.revokeObjectURL(sourceURL);
    }
  }
  async function fingerprint(file) {
    const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
    return Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  }
  function queued() {
    return queue.length ? Math.min(queue.length,cap)+' selected in this batch · '+queue.length+' waiting.' : 'Choose images from your device or an enabled provider.';
  }
  function renderQueue() {
    const node = panel();
    if(!node)return;
    const list = node.querySelector('[data-photo-queue]');
    const first = queue.slice(0,cap);
    list.innerHTML = first.map((file,index) => '<li><span>'+clean(file.name)+'</span><button class="quiet" type="button" data-photo-edit="'+index+'">'+(edits.has(file)?'Adjust edits':'Crop / upscale')+'</button></li>').join('');
    drawnQueue = first;
  }
  function editImage(index) {
    const file = drawnQueue?.[index];
    const dialog = panel()?.querySelector('[data-photo-dialog]');
    if (!file || !dialog || typeof dialog.showModal !== 'function') return;
    const form = dialog.querySelector('form');
    const image = dialog.querySelector('img');
    const outline = dialog.querySelector('[data-crop-outline]');
    const url = URL.createObjectURL(file);
    image.src = url;
    function fill(values) {
      for (const key of ['left','top','width','height']) form.elements[key].value = values[key];
      form.elements.upscale.checked = values.scale === 4;
      sync();
    }
    function sync() {
      const read = (key,min,max) => Math.max(min,Math.min(max,Number(form.elements[key].value) || min));
      const left = read('left',0,99), top = read('top',0,99);
      const width = read('width',1,100-left), height = read('height',1,100-top);
      Object.assign(outline.style,{left:left+'%',top:top+'%',width:width+'%',height:height+'%'});
      return {left,top,width,height,scale:form.elements.upscale.checked?4:1};
    }
    form.oninput = sync;
    form.onsubmit = event => {
      event.preventDefault();
      event.stopPropagation();
      const values = sync();
      if (Object.keys(full).every(key => full[key] === values[key])) edits.delete(file);
      else edits.set(file,values);
      dialog.close(); renderQueue();
    };
    dialog.querySelector('[data-crop-reset]').onclick = () => fill(full);
    dialog.querySelector('[data-crop-close]').onclick = () => dialog.close();
    dialog.addEventListener('close',() => { image.removeAttribute('src');URL.revokeObjectURL(url); },{once:true});
    fill(edits.get(file) ?? full);
    dialog.showModal();
  }
  async function applyEdit(file, edit) {
    const image = await createImageBitmap(file);
    try {
      const x=Math.floor(image.width*edit.left/100),y=Math.floor(image.height*edit.top/100);
      const w=Math.max(1,Math.min(image.width-x,Math.round(image.width*edit.width/100)));
      const h=Math.max(1,Math.min(image.height-y,Math.round(image.height*edit.height/100)));
      const width=w*edit.scale,height=h*edit.scale;
      if(width>16384||height>16384||width*height>40000000)throw Error('Crop tighter or switch off 4× for this image.');
      const canvas=document.createElement('canvas');
      canvas.width=width;canvas.height=height;
      const context=canvas.getContext('2d');
      if(!context)throw Error('This device could not allocate the image.');
      context.imageSmoothingQuality='high';
      context.drawImage(image,x,y,w,h,0,0,width,height);
      return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Image export failed.')),'image/webp',.92));
    } finally {image.close();}
  }
  async function run() {
    const node=panel();
    if(!node||running||!queue.length)return;
    const album=albumLabel, keep=keepOriginals;
    const batch=queue.splice(0,cap);
    const retry=[];
    const seen=progress.get(album) ?? new Set();
    progress.set(album,seen);
    running=true;
    renderQueue();
    let added=0,duplicates=0,failed=0,withoutPreview=0;
    displayProgress('Importing '+batch.length+' files…');
    for (const [i,file] of batch.entries()) {
      try {
        const originalHash=await fingerprint(file);
        const edit=edits.get(file);
        const hash=edit?originalHash+':'+JSON.stringify(edit):originalHash;
        if(await request('readonly',store=>store.getKey(hash)))duplicates++;
        else{
          const edited=edit?await applyEdit(file,edit):null;
          let image={};
          try{image=await preview(edited ?? file);}catch{withoutPreview++;}
          const record={hash,created:Date.now(),name:file.name,album,size:file.size,type:file.type,...image};
          if(keep)record.original=file;
          if(edited)record.edited=edited;
          await request('readwrite',store=>store.add(record));
          added++;
        }
        seen.add(fileKey(file));
      } catch {failed++;retry.push(file);}
      if((i+1)%10===0)displayProgress('Processed '+(i+1)+' of '+batch.length+'…');
    }
    queue.unshift(...retry);
    running=false;offset=0;
    renderQueue();
    displayProgress(added+' imported · '+duplicates+' exact duplicates · '+failed+' failed'+(withoutPreview?' · '+withoutPreview+' previews unavailable':'')+'. '+queue.length+' left in queue.'+(failed?' For failed edits, reset the crop or switch off 4× and retry.':''));
    await render();
  }
  function mount(albums) {
    const node=panel();
    if(!node){clearURLs();return;}
    node.querySelector('[data-photo-album]').innerHTML='<option>Unassigned</option>'+albums.map(a=>'<option>'+clean(a.name)+'</option>').join('');
    node.querySelector('[data-photo-album]').value=albumLabel;
    node.querySelector('[data-photo-originals]').checked=keepOriginals;
    displayProgress(running?'Import is running…':queued());renderQueue();render();
  }
  async function saveOriginal(hash, edited=false){
    try {
      const record=await request('readonly',store=>store.get(hash));
      const blob=edited?record?.edited:record?.original;
      if(blob)window.archiveDownload(edited?record.name.replace(/\.[^.]+$/,'')+(blob.type==='image/webp'?'.webp':'.png'):record.name,blob,blob.type||'application/octet-stream');
    } catch {displayProgress('The original file could not be opened.');}
  }
  function bind(root) {
    if(unsubscribeView)return;
    root.addEventListener('change',event=>{
      if(event.target.matches('[data-photo-album]')){albumLabel=event.target.value;return;}
      if(event.target.matches('[data-photo-originals]')){keepOriginals=event.target.checked;return;}
      if(event.target.id!=='photo-pick')return;
      const seen=new Set([...(progress.get(albumLabel)??[]),...queue.map(fileKey)]);
      for(const file of event.target.files){
        const key=fileKey(file);
        if(!seen.has(key)){seen.add(key);queue.push(file);}
      }
      event.target.value='';renderQueue();displayProgress(queued());
    });
    root.addEventListener('click',event=>{
      const compose=event.target.closest('[data-photo-studio]');
      if(compose)void composePhoto(compose.dataset.photoStudio);
      const original=event.target.closest('[data-photo-original]');
      if(original)void saveOriginal(original.dataset.photoOriginal);
      const edited=event.target.closest('[data-photo-edit-save]');
      if(edited)void saveOriginal(edited.dataset.photoEditSave,true);
      const editor=event.target.closest('[data-photo-edit]');
      if(editor)editImage(Number(editor.dataset.photoEdit));
      if(event.target.closest('[data-photo-run]'))void run();
      if(event.target.closest('[data-photo-clear]')){queue=[];renderQueue();displayProgress(queued());}
      if(event.target.closest('[data-photo-previous]')){offset=Math.max(0,offset-pageSize);void render();}
      if(event.target.closest('[data-photo-next]')){offset+=pageSize;void render();}
    });
    unsubscribeView=true;
  }
  return {mount,bind,markup: `
    <section class="card photo-intake" id="photo-intake">
      <div class="spread"><div><p class="kicker">Image catalog</p><h2>Import photos</h2></div><span class="badge">50 per batch</span></div>
      <p>Choose the images you want to catalog. Imports are private to this browser or Android app. A thumbnail and file details are saved for each unique image.</p>
      <div class="photo-controls">
        <label class="field">Choose images<input id="photo-pick" type="file" accept="image/*" multiple></label>
        <label class="field">Label this batch<select data-photo-album></select></label>
      </div>
      <label class="photo-option"><input type="checkbox" data-photo-originals> Keep original files here too</label>
      <p class="small">Keeping originals uses more storage. Keep a separate copy of important files. Different crops and edits are preserved.</p>
      <div class="row"><button class="primary" type="button" data-photo-run>Import next batch</button><button class="quiet" type="button" data-photo-clear>Clear pending selection</button></div>
      <p class="small photo-status" role="status" data-photo-progress></p>
      <ul class="intake-queue" data-photo-queue></ul>
      <dialog class="intake-editor" data-photo-dialog aria-label="Crop and upscale">
        <h2>Crop and upscale</h2><div class="intake-stage"><img alt="Crop preview"><div data-crop-outline></div></div>
        <form class="formgrid"><div class="intake-crop-fields">
          <label class="field">Left %<input name="left" type="number" min="0" max="99" required></label>
          <label class="field">Top %<input name="top" type="number" min="0" max="99" required></label>
          <label class="field">Width %<input name="width" type="number" min="1" max="100" required></label>
          <label class="field">Height %<input name="height" type="number" min="1" max="100" required></label>
        </div><label class="photo-option"><input name="upscale" type="checkbox"> Resize to 4× width and height</label>
        <div class="row"><button class="primary" type="submit">Use edits</button><button class="quiet" type="button" data-crop-reset>Reset</button><button class="quiet" type="button" data-crop-close>Cancel</button></div></form>
      </dialog>
      <div class="spread"><h3 data-photo-count>Loading catalog…</h3><div class="row"><button class="quiet" data-photo-previous>Previous</button><button class="quiet" data-photo-next>Next</button></div></div>
      <div class="photo-grid" data-photo-gallery></div>
    </section>`};
})();
