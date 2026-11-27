'use strict';
window.StudioRender = (() => {
  const formats = {
    cover:{label:'Square cover', width:2400,height:2400},
    story:{label:'Vertical story',width:1080,height:1920},
    banner:{label:'Web banner',width:2400,height:1000},
    postcard:{label:'6 × 4 in postcard',trim:[6,4]},
    flyer:{label:'8.5 × 11 in flyer',trim:[8.5,11]},
    poster:{label:'11 × 17 in poster',trim:[11,17]}
  };
  const bleed = 0.125;
  const dpi = 300;
  function size(format) {
    const f = formats[format];
    return f.trim ? {...f,width:(f.trim[0]+2*bleed)*dpi,height:(f.trim[1]+2*bleed)*dpi} : f;
  }
  function crop(image, width, height, x, y) {
    const ratio = Math.min(image.width/width,image.height/height);
    const w = width*ratio, h = height*ratio;
    return [(image.width-w)*x/100,(image.height-h)*y/100,w,h,ratio];
  }
  function typography(ctx,text,x,y,maxWidth,fontSize) {
    if (!text.trim()) return;
    ctx.font = '800 '+fontSize+'px system-ui, sans-serif';
    ctx.fillText(text,x,y,maxWidth);
  }
  function render(canvas,image,draft,longEdge,watermark=false) {
    const f = size(draft.format), scale = Math.min(1,longEdge/Math.max(f.width,f.height));
    canvas.width=Math.round(f.width*scale);
    canvas.height=Math.round(f.height*scale);
    const {width:w,height:h}=canvas, ctx=canvas.getContext('2d',{alpha:false});
    const [sx,sy,sw,sh] = crop(image,f.width,f.height,draft.x,draft.y);
    ctx.drawImage(image,sx,sy,sw,sh,0,0,w,h);
    const m = Math.min(w,h), padding = m*.075;
    if (draft.look !== 'photo' && (draft.headline || draft.caption)) {
      const isTop = draft.look==='masthead';
      const g=ctx.createLinearGradient(0,isTop?0:h,0,isTop?h*.48:h*.52);
      g.addColorStop(0,'rgba(0,0,0,.91)');
      g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
      ctx.fillStyle='#fff';
      typography(ctx,draft.headline,padding,isTop?padding+m*.083:h-padding-m*.047,w-2*padding,m*.083);
      ctx.fillStyle=draft.accent;
      typography(ctx,draft.caption,padding,isTop?padding+m*.138:h-padding,w-2*padding,m*.032);
    }
    if (watermark) {
      ctx.save();
      ctx.translate(w/2,h/2);
      ctx.rotate(-Math.atan2(h,w)*.5);
      ctx.fillStyle='rgba(8,8,8,.72)';
      ctx.fillRect(-w,-m*.044,2*w,m*.088);
      ctx.fillStyle='#fff';
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      typography(ctx,'XXX!NK • LICENSING PROOF',0,0,w*.91,m*.04);
      ctx.restore();
    }
    return canvas;
  }
  function encode(canvas,mime,quality) {
    return new Promise((resolve,reject)=> canvas.toBlob(blob=>blob?resolve(blob):reject(Error('The image could not be encoded.')),mime,quality));
  }
  async function printPdf(jpeg,format) {
    const f=size(format), [tw,th]=f.trim.map(value=>value*72);
    const b=bleed*72, w=tw+2*b, h=th+2*b;
    const encoder=new TextEncoder(), chunks=[], offsets=[0];
    let length=0;
    function add(value) {
      const bytes=typeof value==='string'?encoder.encode(value):value;
      chunks.push(bytes);length+=bytes.byteLength;
    }
    function object(id, ...parts) {
      offsets[id]=length;add(id+' 0 obj\n');parts.forEach(add);add('\nendobj\n');
    }
    add('%PDF-1.4\n');
    add(new Uint8Array([37,226,227,207,211,10]));
    object(1,'<< /Type /Catalog /Pages 2 0 R >>');
    object(2,'<< /Type /Pages /Count 1 /Kids [3 0 R] >>');
    object(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+w+' '+h+'] /BleedBox [0 0 '+w+' '+h+
      '] /TrimBox ['+b+' '+b+' '+(w-b)+' '+(h-b)+'] /Resources << /XObject << /Art 4 0 R >> >> /Contents 5 0 R >>');
    object(4,'<< /Type /XObject /Subtype /Image /Width '+f.width+' /Height '+f.height+
      ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.size+' >>\nstream\n',
      new Uint8Array(await jpeg.arrayBuffer()),'\nendstream');
    const content='q '+w+' 0 0 '+h+' 0 0 cm /Art Do Q\n';
    object(5,'<< /Length '+content.length+' >>\nstream\n'+content+'endstream');
    const xref=length;
    add('xref\n0 6\n0000000000 65535 f \n');
    for (const offset of offsets.slice(1)) add(String(offset).padStart(10,'0')+' 00000 n \n');
    add('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
    return new Blob(chunks,{type:'application/pdf'});
  }
  return {formats,size,crop,render,encode,printPdf,dpi,bleed};
})();
