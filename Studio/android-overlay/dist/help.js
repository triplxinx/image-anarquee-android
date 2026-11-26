'use strict';
(()=>{
  const toggle=document.getElementById('help-switch'),dialog=document.getElementById('control-help');
  const title=dialog.querySelector('h2'),body=dialog.querySelector('p'),count=dialog.querySelector('small');
  const back=dialog.querySelector('[data-help-back]'),next=dialog.querySelector('[data-help-next]');
  const selector='button,a[href],input,select,textarea,summary,label,[role="button"],[contenteditable="true"],[tabindex="0"],[data-desk-refresh-zone]';
  const rules=[
    ['[data-tab="studio"],[data-photo-studio],[data-studio-lead],[data-desk-studio]','Bring in one original image and choose a digital or print format.','Set the composition and check the rights. For a print PDF, check effective source resolution.','Export the layout, or fill in the licensing brief and open a private offer.'],
    ['[data-studio-variations] summary,[data-studio-look]','Compare the same crop with the title at the top, title at the bottom, or image only.','Tap the direction you want in the main proof.'],
    ['[data-studio-action="archive"]','Send a watermarked proof to the XXX!NK archive for owner review.','Sign in to archive admin first, then queue the image here. Review its visibility in archive admin.'],
    ['[data-studio-action="offer"]','Enter the buyer, project context, proposed usage and reviewed pitch.','The offer desk lets you review and attach the proof, confirm permissions, and issue a private link.'],
    ['[data-studio-action="save"]','Save the active design, brief and source image to this device. The next save replaces the active local draft.'],
    ['[data-studio-action="project"],[data-studio-project]','Export or open a portable .imag3 project.','It contains the editable layout, original image and any private brief details. Open it in Studio on another device and review permissions again.'],
    ['[data-studio-action="clear"]','Remove the active Studio draft from this device.'],
    ['[data-studio-action="draft-pitch"]','Prepare a draft from the buyer, format and intended use. Review the wording before opening the offer desk.'],
    ['[data-studio-action="record"]','Export a JSON record of the source, output, credit line and permission you recorded.'],
    ['[data-tab="cards"]','Create a card record and enter the identity and condition you can confirm.','Scan the front, back and edges or import originals, then scout buying routes.','Send a route into Workdesk to review its draft before reaching out.'],
    ['[data-card-action="capture"]','Choose the face or edge you are photographing.','Steady the card in the guide. Tap Shutter, or arm Auto and wait for the capture.','Review the original, then use Crop / export for a separate raster.'],
    ['[data-card-action="hud"]','Open the standalone capture HUD.','Try shutter, torch and zoom controls. Calibrate starts with white printer paper, then asks you to cover the lens for the black reference.','After capture, tune crop, color and print settings in Raster Desk.'],
    ['[data-card-action="stack"],[data-attach]','Browse recent standalone captures.','Open a capture in Raster Desk or select a card view and attach an original to the active card.'],
    ['[data-card-action="acid"]','Open the full ACID Camera studio with effects, lens controls and sensor tools.','Use Trading cards to document a collectible with an original and condition notes.'],
    ['[data-card-action="scout"]','Check published buying, consignment and marketplace routes.','Choose a card to rank sources by its category and details.','Open the original source and confirm that it accepts the exact card and condition.'],
    ['[data-card-action="collector"]','Enter the collector’s public wanted post and public contact page.','Record the wanted edition and closing date. Mark it verified after checking those pages.'],
    ['[data-card-queue]','Create a Workdesk entry using this route and the selected card.','Review the private draft and evidence before using the contact route.'],
    ['[data-card-read],[data-card-auto-read]','Read candidate fields such as card name, year, number and certification number using on-device text recognition.','Check the suggested text against the photo and choose the fields you want to copy.'],
    ['[data-card-raster]','Crop a derivative using the corners, then choose a print or digital preset.','Check effective source resolution and tune brightness or color before choosing a destination.'],
    ['[data-card-action="bundle"]','Export a catalog and the original files for the card views you’ve saved.','Choose a folder for the ZIP and retain it with your other backups.'],
    ['[data-tab="merch"]','Find a XXXINK design by name or SKU.','Choose its size and check costs, tags and buyer link.','Save a local listing draft or use the product in a creator campaign.'],
    ['[data-tab="affiliates"]','Choose your path: promote your own clothing or recommend a merchant.','For XXXINK, choose a product and a creator. For a merchant, open its application and record your progress.','Save your pitch or recommendation to Workdesk for review.'],
    ['[data-tab="workdesk"]','Browse opportunities and open one with a contact route.','Fill in the buyer, scope and evidence, then build and review a draft.'],
    ['[data-tab="albums"]','Group photos for a pitch.','Choose an album, add images from your device, then review the batch.'],
    ['[data-tab="systems"]','Manage your profile, progress backups and imported leads.','Choose the specific import or export for the data you want to move.'],
    ['[data-tab="leads"]','Browse prospects. Open a name to see the source, sample pitch and follow-up fields.'],
    ['[data-tab="launch"]','Pick a launch task and tick its checklist as you finish each item.'],
    ['#export,[data-backup]','Make a copy of your saved workspace.','Tap the export control, choose where to save the JSON file, and keep it for a later restore.'],
    ['#import','Restore your workspace from a backup.','Export your current workspace first if you need a copy.','Choose the backup JSON. Restoring replaces your current workspace data.'],
    ['#lead-feed,[data-desk-import]','Bring opportunities from a file into this list.','Choose a feed in the format shown beside the control.','Review the imported records and verify the buyer and contact route.'],
    ['[data-desk-refresh],[data-desk-refresh-zone]','Check the public boards for current creative work.','Tap Refresh leads or swipe down on the refresh strip in Android.','Read the board counts, then open a matching record.'],
    ['[data-c="scout"]','Find possible promoters for a clothing niche.','Enter an audience or style and start the search.','Review matching podcasts and trends, then verify a creator’s public contact page.'],
    ['[data-c="create"]','Build a creator pitch and a caption for your product.','Choose a design, creator, contact page and an example of their work.','Enter costs, commission and how sales will be credited. Review the saved kit before outreach.'],
    ['[data-c="import"]','Add several published products at once.','Paste product names and HTTPS shop links in two tab-separated columns.','Import the rows, then choose the design for your campaign.'],
    ['[data-photo-run],#photo-pick','Prepare a batch of photos for your album.','Choose images from Photos or Files. Review the queue and optional edits.','Import the next batch to add its images.'],
    ['[data-photo-edit],[data-photo-edit-save]','Prepare an edited copy of a photo.','Review its crop and output size.','Save the edited copy and check the preview before exporting.'],
    ['[data-desk-mode="automatic"]','Prepare a draft for a supported task using its source material.','Enter the input, delivery requirements, available hours and rate floor.','Run Auto-draft, then review the result before exporting.'],
    ['[data-desk-mode],[data-desk-prompt]','Prepare writing from this opportunity’s saved details.','Fill in the buyer, source and requested deliverable.','Review the generated text and edit any claims before using it.'],
    ['[data-desk-export]','Export the selected work from this record.','Review your draft, mark approval if requested, then choose where to save the file.'],
    ['[data-owner]','Open your private AffiliateFlow account tools.','In Settings, connect your AffiliateFlow server and sign in with the owner account.','Open Links to bring a provider-issued link into a campaign.'],
    ['[data-desk-open],[data-open-lead]','Open this specific record to review its source, details and next action.'],
    ['[data-phone-host]','Start a licensing site inside this app.','Choose phone-only or Wi-Fi access, then start hosting.','Use the displayed address for tests. Use local Wi-Fi without a relay, export portable HTML, or configure a reachable HTTPS endpoint for remote buyers.'],
    ['[data-license-pitch],[data-desk-license]','Open your site’s private licensing desk with this lead and pitch prefilled.','Review the brief, upload your contextual mockup, and enter the proposed usage.','Create the link, then copy the pitch or open your email draft.'],
    ['[data-copy-pitch]','Copy the draft for this lead. Paste it into your editor and personalize it before sending.'],
    ['[data-application]','Record the decision the merchant gave you. Select Applied after submitting the application, then update it when you hear back.'],
    ['[data-c="credit"]','Describe how an order will be credited to this creator. Enter the actual checkout code or tracking method you have tested.'],
    ['#scan-files','Check selected files for duplicates.','Choose local images. The scanner compares their fingerprints and displays matches.'],
    ['[data-photo-next],[data-next]','Show the next page of saved records.'],
    ['[data-photo-previous],[data-prev]','Show the previous page of saved records.'],
    ['[data-photo-clear]','Remove pending selections from this batch. Photos already imported stay in the catalog.'],
    ['[data-photo-original]','Save the original image using the device file picker.'],
    ['[data-crop-reset]','Restore the full photo as the crop area and review the preview.'],
    ['[data-crop-close]','Close the crop editor and return to the photo queue.'],
    ['[data-monster-preview]','Preview the idle tip.','Read the first message, reveal its quote, then return to your workspace.'],
    ['[data-monster-toggle]','Switch the idle tips on or off on this device.'],
    ['[data-step]','Move to this launch step. Review its task list and check off completed items.'],
    ['[data-check]','Tick this launch task when you have finished it. Tap again to clear it.'],
    ['[data-calendar]','Build a calendar file from dated follow-ups.','Save the file, then import it in your calendar app to see the reminders.'],
    ['[data-feed]','Export this lead directory as a JSON feed to import into another copy of the app.'],
    ['[data-csv]','Export the current outreach log as a CSV file for a spreadsheet.'],
    ['[data-c="add"]','Add a published product to the campaign list.','Enter its name and its public product page, then tap Add product.'],
    ['#welcome-back','Go back one page in the beginner tour.'],
    ['#welcome-skip','Close the beginner tour. You can replay it from Quick tour.'],
    ['#show-welcome','Replay the beginner tour. You can skip it or jump directly to a workspace.'],
    ['#welcome-next','Move to the next tour page. Finish closes the tour on the last page.'],
    ['#welcome-action','Leave the tour and open the workspace described on this page.'],
    ['#monster-next','Reveal the next part of the idle tip.','Finish the tip to return to your workspace and trigger a lead refresh on Android.']
  ];
  const named=[
    [/add album/i,'Create an album reference for organizing your photos.','Enter the album details, save, then select it when importing a batch of images.'],
    [/use contact route/i,'Fill the creator and contact page using this publication. Review the site to check whether your clothing fits its coverage.'],
    [/mockup/i,'Open the supplier’s product image so you can check how the print appears on the garment.'],
    [/use edits/i,'Apply the selected crop and resize settings to this queued photo and return to the batch.'],
    [/open popcommerce storefront/i,'Open the customer-facing XXXINK shop in your browser to check a published product.'],
    [/use in creator campaign|use link in image anarquee|open a copy in workdesk|save campaign in workdesk/i,'Carry this selection into the next workspace.','Check the product or provider link and fill the required fields.','Tap the control and review the new campaign or draft.'],
    [/save listing draft/i,'Save the selected product’s title, tags, link and price scenario on this device. Reopen the design to edit them.'],
    [/save campaign totals/i,'Record results for this creator.','Enter impressions, clicks and confirmed orders for the same period.','Save to calculate observed click-through and keep the totals with the pitch.'],
    [/export|download|save pdf/i,'Create a file from the current selection.','Check the selected content, then choose a destination in the save dialog.'],
    [/new opportunity|add a prospect/i,'Create a new record.','Enter the name, evidence and contact route. Save it so you can find it again.'],
    [/save|update/i,'Keep the changes in this form. Review the fields, then tap this control and check the status message.']
  ];
  let enabled=false,steps=[],page=0;
  try{enabled=localStorage.getItem('ia.help.mode')==='on';}catch{}
  function sync(){
    toggle.textContent=enabled?'(!)':'(?)';toggle.setAttribute('aria-pressed',String(enabled));
    toggle.setAttribute('aria-label',enabled?'Turn help mode off':'Turn help mode on');
    document.body.classList.toggle('help-active',enabled);
  }
  toggle.onclick=()=>{enabled=!enabled;sync();try{localStorage.setItem('ia.help.mode',enabled?'on':'off');}catch{}
    document.getElementById('help-announcement').textContent=enabled?'Help is on. Select any control to learn what it does.':'Help is off. Controls work normally.';};
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  function label(e){
    const l=e.labels?.[0]||e.closest('label');
    return clean(e.getAttribute('aria-label')|| (l&&Array.from(l.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ')) ||
      (e.matches('input,textarea,select')?e.placeholder||e.name:e.textContent)||e.title||'This control').slice(0,160);
  }
  function guidance(e,name){
    if (e.dataset.help) return [e.dataset.help];
    for(const [sel,...parts] of rules)if(e.matches(sel))return parts;
    if(e.matches('select'))return ['Choose a value for “'+name+'”. Open the list and tap the option you want.'];
    if(e.matches('[type=checkbox]'))return ['Mark or clear “'+name+'”. Tap once to change the check mark. Save the form if it has a Save button.'];
    if(e.matches('input,textarea'))return [e.type==='file'?'Open the device picker and choose files for '+name+'.':'Enter '+name+' in this field.'+ (e.type==='url'?' Use the full web address.':e.type==='number'?' Use a number in the units shown.':'')];
    if(e.matches('a'))return ['Open '+name+'. '+(e.href.startsWith(location.origin)?'Follow this link to the indicated workspace.':'Tap to visit '+new URL(e.href).hostname+' or use the indicated contact app.')];
    if(e.matches('summary'))return ['Show or hide the details for '+name+'. Tap the heading again to collapse it.'];
    for(const [pattern,...parts] of named)if(pattern.test(name))return parts;
    return ['Use “'+name+'” in '+(document.querySelector('#breadcrumb')?.textContent.split('/').pop().trim()||'this workspace')+'. Close this explanation, turn help off, then tap the control to run it.'];
  }
  function paint(){body.textContent=steps[page];count.textContent=steps.length>1?'Step '+(page+1)+' of '+steps.length:'Control help';back.hidden=page===0;next.hidden=page===steps.length-1;}
  function explain(e){if(dialog.open)return;const n=label(e);title.textContent=n;steps=guidance(e,n);page=0;paint();dialog.showModal();}
  back.onclick=()=>{page--;paint();};next.onclick=()=>{page++;paint();};
  dialog.querySelector('[data-help-close]').onclick=()=>dialog.close();
  function target(evt){
    if(!enabled||dialog.open||!(evt.target instanceof Element)||toggle.contains(evt.target))return null;
    const e=evt.target.closest(selector);return e?.matches('label')?e.control||e:e;
  }
  function block(evt){evt.preventDefault();evt.stopImmediatePropagation();}
  for(const type of ['pointerdown','mousedown','pointerup','mouseup','click','auxclick','contextmenu','beforeinput','keydown','keyup','submit']){
    window.addEventListener(type,evt=>{
      const e=target(evt);if(!e)return;
      if(evt.type.startsWith('key')&&['Tab','Escape','Shift','Control','Alt','Meta'].includes(evt.key))return;
      block(evt);
      if(type==='click'||type==='contextmenu'||(type==='keydown'&&['Enter',' '].includes(evt.key)))explain(e);
    },{capture:true,passive:false});
  }
  // Modal dialogs are in the browser top layer. Keep the switch inside the active modal.
  function place(){const open=[...document.querySelectorAll('dialog[open]')].filter(d=>d!==dialog).pop();
    const host=open||document.body;if(toggle.parentNode!==host)host.append(toggle);}
  new MutationObserver(place).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
  sync();place();
})();
