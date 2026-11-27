<?php
declare(strict_types=1);
// Data must be outside the public document root.
$dir = getenv('XXXINK_DATA') ?: dirname(__DIR__).'/private';
$webRoot = realpath($_SERVER['DOCUMENT_ROOT'] ?? '') ?: __DIR__;
$configuredDir = realpath($dir) ?: $dir;
if ($configuredDir === $webRoot || str_starts_with($configuredDir, $webRoot.DIRECTORY_SEPARATOR)) {
    http_response_code(503);
    exit('The site document root must point to the public folder.');
}
if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
    http_response_code(503);
    exit('The site needs a writable private folder.');
}
$dir = realpath($dir);
if (!$dir || $dir === $webRoot || str_starts_with($dir, $webRoot.DIRECTORY_SEPARATOR) || !is_writable($dir)) {
    http_response_code(503);
    exit('The site needs a writable private folder outside the document root.');
}
if (!is_dir($dir.'/media') && !@mkdir($dir.'/media', 0700) && !is_dir($dir.'/media')) {
    http_response_code(503);
    exit('The site could not initialize private media.');
}
function xxxinkPasswordHash() {
    global $dir;
    $hash = getenv('XXXINK_PASSWORD_HASH');
    if ($hash) return $hash;
    $path = $dir.'/admin-password.hash';
    return is_readable($path) ? trim(file_get_contents($path)) : '';
}
header('X-Content-Type-Options: nosniff'); header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; frame-src https://www.youtube-nocookie.com; media-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
session_set_cookie_params(['httponly'=>true,'secure'=>!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off','samesite'=>'Strict']); session_start();
$_SESSION['csrf'] ??= bin2hex(random_bytes(32));
function h($s){return htmlspecialchars((string)$s,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');}
function fail($s,$code=400){http_response_code($code);exit($s);}
function archiveRows(string $path): array {
    if (!is_file($path)) return [];
    $bytes = file_get_contents($path);
    if ($bytes === false) throw new RuntimeException('Archive read failed.');
    if ($bytes === '') return []; // Older releases initialized files before their first write.
    $rows = json_decode($bytes, true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($rows)) throw new RuntimeException('Invalid archive data.');
    return $rows;
}
function readRows(string $name): array {
    global $dir;
    return archiveRows($dir.'/'.$name.'.json');
}
function mutate(string $name, callable $change): void {
    global $dir;
    $path = $dir.'/'.$name.'.json';
    $lock = fopen($path.'.lock', 'c');
    if (!$lock) throw new RuntimeException('Archive lock unavailable.');
    $temp = null;
    try {
        if (!flock($lock, LOCK_EX)) throw new RuntimeException('Archive lock unavailable.');
        $json = json_encode($change(archiveRows($path)), JSON_INVALID_UTF8_SUBSTITUTE|JSON_THROW_ON_ERROR);
        $temp = tempnam($dir, 'archive-');
        if ($temp === false || file_put_contents($temp, $json) !== strlen($json) || !rename($temp, $path)) {
            throw new RuntimeException('Archive write failed.');
        }
    } finally {
        if (is_string($temp) && is_file($temp)) @unlink($temp);
        fclose($lock);
    }
}
function inputString(array $values, string $name): string {
    return is_string($values[$name] ?? null) ? $values[$name] : '';
}
function archiveId(array $values): string {
    $id = inputString($values, 'id');
    if (!preg_match('/^[a-f0-9]{64}$/D', $id)) fail('Not found', 404);
    return $id;
}
function admin(){return !empty($_SESSION['admin']);}
function csrf(){if(!hash_equals($_SESSION['csrf'],inputString($_POST, 'csrf')))fail('Invalid request',403);}
function token(){return '<input type="hidden" name="csrf" value="'.h($_SESSION['csrf']).'">';}
function redirect($p){header('Location: ?page='.$p, true,303);exit;}
if (isset($_GET['license'])) {
 require __DIR__.'/license.php';
 exit;
}
$action=inputString($_GET, 'action');
if ($action==='studio-session') {
    header('Content-Type: application/json');
    header('Cache-Control: private, no-store');
    if (!admin()) {http_response_code(401); echo '{"error":"Sign in to the XXX!NK archive first."}'; exit;}
    echo json_encode(['csrf'=>$_SESSION['csrf']], JSON_THROW_ON_ERROR);
    exit;
}
if($action==='media'){
 $id=archiveId($_GET);$rows=readRows('assets');$a=$rows[$id]??null;if(!$a||(!$a['public']&&!admin()))fail('Not found',404);
 $path=$dir.'/media/'.$id;if(!is_file($path))fail('Missing file',404);
 if($a['kind']==='pdf'&&($_COOKIE['pdfConsent']??'')!=='1'&&!admin())fail('Accept the PDF warning first',403);
 $size=filesize($path);$start=0;$end=$size-1;header('Content-Type: '.$a['mime']);header('Accept-Ranges: bytes');header('Cache-Control: private, no-store');
 if($a['kind']==='pdf')header('Content-Disposition: attachment; filename="'.preg_replace('/[^a-zA-Z0-9._-]/','_',$a['title']).'.pdf"');
 if(isset($_SERVER['HTTP_RANGE'])){if(!preg_match('/^bytes=(\d+)-(\d*)$/D',$_SERVER['HTTP_RANGE'],$m))fail('Unsupported range',416);$start=(int)$m[1];$end=$m[2]===''?$end:min($end,(int)$m[2]);if($start>$end)fail('Invalid range',416);http_response_code(206);header("Content-Range: bytes $start-$end/$size");}
 header('Content-Length: '.($end-$start+1));session_write_close();$f=fopen($path,'rb');fseek($f,$start);$left=$end-$start+1;while($left>0&&!feof($f)){ $b=fread($f,min(65536,$left));echo $b;$left-=strlen($b);}fclose($f);exit;
}
if($action==='cover'){$id=archiveId($_GET);$a=readRows('assets')[$id]??null;if(!$a||(!$a['public']&&!admin())||!is_file($dir.'/media/'.$id.'.png'))fail('No cover',404);header('Content-Type: image/png');header('Cache-Control: private, no-store');readfile($dir.'/media/'.$id.'.png');exit;}
if($action==='catalog'){$rows=array_values(array_filter(readRows('assets'),fn($a)=>$a['public']));header('Content-Type: application/json');echo json_encode(array_slice($rows,max(0,(int)($_GET['offset']??0)),24));exit;}
if($_SERVER['REQUEST_METHOD']==='POST'){
 $studio=$action==='upload' && inputString($_POST,'source')==='studio';
 $api=$action==='upload'&&isset($_SERVER['HTTP_AUTHORIZATION'])&&getenv('XXXINK_API_TOKEN')&&hash_equals('Bearer '.getenv('XXXINK_API_TOKEN'),$_SERVER['HTTP_AUTHORIZATION']);if(!$api)csrf();
 if($action==='login'){$hash=xxxinkPasswordHash();if(!$hash||!password_verify(inputString($_POST, 'password'),$hash)){sleep(1);fail('Login failed',403);}session_regenerate_id(true);$_SESSION['csrf']=bin2hex(random_bytes(32));$_SESSION['admin']=true;redirect('admin');}
 if($action==='append'){if(time()-($_SESSION['last_append']??0)<30)fail('Wait before contributing',429);$body=trim(inputString($_POST, 'body'));if(!$body||strlen($body)>16000)fail('Contribution must be 1–16000 bytes');mutate('text',function($r)use($body){$r[]=['id'=>bin2hex(random_bytes(12)),'body'=>$body,'public'=>admin(),'time'=>gmdate('c')];return $r;});$_SESSION['last_append']=time();redirect('text');}
 if(!admin()&&!$api)fail('Login required',403);
 if($action==='logout'){session_destroy();redirect('home');}
 if($action==='upload'){
 $f=$_FILES['file']??null;if(!$f||($f['error']??null)!==UPLOAD_ERR_OK||!is_uploaded_file($f['tmp_name'])||$f['size']>100*1024*1024)fail('Upload failed or exceeds 100 MB');
 $mime=(new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);$types=['image/jpeg'=>'image','image/png'=>'image','image/webp'=>'image','application/pdf'=>'pdf','video/mp4'=>'video','video/webm'=>'video','text/plain'=>'text'];$kind=$types[$mime]??null;if(!$kind)fail('Unsupported format');
 $title=trim(inputString($_POST,'title'))?:pathinfo($f['name'],PATHINFO_FILENAME);$title=substr($title,0,180);$gallery=substr(trim(inputString($_POST,'gallery'))?:'General',0,100);
 if($kind==='text'){if($f['size']>200000)fail('Text too large');$body=file_get_contents($f['tmp_name']);mutate('text',function($r)use($body){$r[]=['id'=>bin2hex(random_bytes(12)),'body'=>$body,'public'=>false,'time'=>gmdate('c')];return $r;});}
 else {$id=hash_file('sha256',$f['tmp_name']);if(!is_file($dir.'/media/'.$id)&&!move_uploaded_file($f['tmp_name'],$dir.'/media/'.$id))fail('Storage failure',500);
 $cover=false;if($kind==='pdf'&&function_exists('exec')&&getenv('XXXINK_PDF_RENDER')==='1'){exec('timeout 20 pdftoppm -f 1 -l 1 -scale-to 480 -singlefile -png '.escapeshellarg($dir.'/media/'.$id).' '.escapeshellarg($dir.'/media/'.$id).' 2>/dev/null');$cover=is_file($dir.'/media/'.$id.'.png');}
 mutate('assets',function($r)use($id,$title,$gallery,$kind,$mime,$cover){if(!isset($r[$id]))$r[$id]=compact('id','title','gallery','kind','mime','cover')+['public'=>false];return $r;});}
 if($api||$studio){header('Content-Type: application/json');header('Cache-Control: private, no-store');$row=isset($id)?readRows('assets')[$id]??null:null;echo json_encode(['ok'=>true,'id'=>$id??null,'public'=>(bool)($row['public']??false)]);exit;}redirect('admin');}
 if($action==='publish'){ $id=archiveId($_POST);mutate('assets',function($r)use($id){if(isset($r[$id])){$r[$id]['public']=isset($_POST['approved']);$r[$id]['title']=substr(trim(inputString($_POST,'title') ?: $r[$id]['title']),0,180);$r[$id]['gallery']=substr(trim(inputString($_POST,'gallery') ?: $r[$id]['gallery']),0,100);}return $r;});redirect('admin');}
 if($action==='moderate'){mutate('text',function($r){foreach($r as &$x)if($x['id']===($_POST['id']??'')){$x['public']=isset($_POST['approved']);$x['body']=substr($_POST['body']??$x['body'],0,200000);}return $r;});redirect('admin');}
 fail('Unknown action',404);
}
$page=inputString($_GET,'page') ?: 'home';$legacy=json_decode(file_get_contents(__DIR__.'/legacy.json'),true);$assets=readRows('assets');
?><!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>XXX!NK</title><style>body{background:#111;color:#eee;font:16px system-ui;margin:auto;max-width:1200px;padding:20px}a{color:#a8f49c}nav{display:flex;gap:12px;flex-wrap:wrap;border-block:1px solid #555;padding:14px 0}h1{font-size:clamp(42px,10vw,100px);color:#a8f49c;letter-spacing:-.08em;margin:0}button,input,textarea,select{font:inherit;padding:10px;background:#242424;color:white;border:1px solid #777;border-radius:5px}button{cursor:pointer}textarea{width:95%;min-height:100px}article{background:#202020;padding:12px;border-radius:8px;overflow-wrap:anywhere}img,video,iframe{width:100%;max-height:440px;object-fit:contain;border:0}iframe{aspect-ratio:16/9}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}pre{white-space:pre-wrap}form{margin:12px 0}small{color:#bbb}.cover{position:relative;background:#343434;min-height:150px;display:grid;place-items:center}.cover strong{position:absolute;bottom:0;background:#000d;padding:8px;width:calc(100% - 16px)}dialog{max-width:520px;background:#222;color:white;border:1px solid #999}</style><header><h1>XXX!NK.</h1><p>Independent archive / art / tools</p></header><nav><?php foreach(['home','gallery','archive','cinema','text','tools','admin'] as $p)echo '<a href="?page='.$p.'">'.h(ucfirst($p)).'</a>';?><a href="?license">Licensing preview</a><a href="studio/">Authoring Studio</a></nav><main>
<?php if(in_array($page,['gallery','archive','cinema'])): $kind=['gallery'=>'image','archive'=>'pdf','cinema'=>'video'][$page]; ?>
<h2><?=h(ucfirst($page))?></h2><input id="search" placeholder="Filter title or gallery"><select id="group"><option value="">All galleries</option><?php foreach(array_unique(array_column(array_filter($assets,fn($a)=>$a['public']&&$a['kind']===$kind),'gallery')) as $g)echo '<option>'.h($g).'</option>';?></select><div class="grid" id="cards"></div><button id="more">Load more</button><p id="status"></p>
<dialog id="warning"><h2>A PDF is not necessarily just a document.</h2><p>Unknown PDFs can contain deceptive links, embedded attachments, scripts and exploits targeting vulnerable readers. A fake research paper could redirect you to a credential-stealing page; an attachment could disguise malicious software. Use an updated reader, disable unnecessary scripting, avoid attachments and consider isolated viewing. Screening cannot guarantee safety or accuracy.</p><button id="accept">Understand and download</button> <button onclick="warning.close()">Cancel</button></dialog>
<script>const kind=<?=json_encode($kind)?>,cards=document.querySelector('#cards'),more=document.querySelector('#more'),search=document.querySelector('#search'),group=document.querySelector('#group');let offset=0,busy=false,done=false,all=[],pending='';function render(){cards.replaceChildren();for(const a of all.filter(a=>a.kind===kind&&(!group.value||a.gallery===group.value)&&(a.title+' '+a.gallery).toLowerCase().includes(search.value.toLowerCase()))){let c=document.createElement('article'),u='?action=media&id='+encodeURIComponent(a.id),v=document.createElement(kind==='video'?'video':'img');if(kind==='video'){v.controls=true;v.preload='metadata';v.src=u;c.append(v)}else if(kind==='image'||a.cover){v.loading='lazy';v.alt=a.title;v.src=kind==='image'?u:'?action=cover&id='+a.id;c.append(v)}else{let p=document.createElement('div');p.className='cover';p.textContent='PDF';c.append(p)}let t=document.createElement('h3');t.textContent=a.title;c.append(t);let g=document.createElement('small');g.textContent=a.gallery;c.append(g);if(kind==='pdf'){let b=document.createElement('button');b.textContent='Download PDF';b.onclick=()=>{if(document.cookie.split('; ').includes('pdfConsent=1'))location.href=u;else{pending=u;warning.showModal()}};c.append(b)}cards.append(c)}}async function load(){if(busy||done)return;busy=true;try{let r=await fetch('?action=catalog&offset='+offset);if(!r.ok)throw Error('Catalog unavailable');let a=await r.json();all.push(...a);offset+=a.length;done=a.length<24;more.hidden=done;render();document.querySelector('#status').textContent=done&&!cards.children.length?'No matching published media.':''}catch(e){document.querySelector('#status').textContent=e.message}finally{busy=false}}search.oninput=group.onchange=render;more.onclick=load;new IntersectionObserver(e=>{if(e[0].isIntersecting)load()}).observe(more);document.querySelector('#accept').onclick=()=>{document.cookie='pdfConsent=1; Max-Age=31536000; Path=/; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');warning.close();location.href=pending};load();</script>
<?php if($page==='cinema'): foreach($legacy['home']['videos'] as $id): ?><article><a href="https://www.youtube.com/watch?v=<?=h($id)?>">Original video reference <?=h($id)?></a> <button onclick="let f=document.createElement('iframe');f.src='https://www.youtube-nocookie.com/embed/<?=h($id)?>';f.allowFullscreen=true;this.replaceWith(f)">Load external player</button></article><?php endforeach;endif; ?>
<?php elseif($page==='text'): ?><h2>Continuous text</h2><?php foreach(readRows('text') as $x)if($x['public'])echo '<article><pre>'.h($x['body']).'</pre><small>'.h($x['time']).'</small></article>';?><form method="post" action="?action=append"><?=token()?><textarea name="body" required maxlength="16000"></textarea><button>Submit contribution</button><p>Public contributions are reviewed before publication.</p></form>
<?php elseif($page==='admin'): ?><h2>Archive administration</h2><?php if(!admin()): ?><form method="post" action="?action=login"><?=token()?><input type="password" name="password" required><button>Sign in</button></form><?php else: ?><form method="post" action="?action=logout"><?=token()?><button>Sign out</button></form><form method="post" enctype="multipart/form-data" action="?action=upload"><?=token()?><input type="file" name="file" required><input name="title" placeholder="Optional title"><input name="gallery" placeholder="Gallery name"><button>Import privately</button></form><?php foreach($assets as $a): ?><article><form method="post" action="?action=publish"><?=token()?><input type="hidden" name="id" value="<?=h($a['id'])?>"><input name="title" value="<?=h($a['title'])?>"><input name="gallery" value="<?=h($a['gallery'])?>"><label><input type="checkbox" name="approved" <?=$a['public']?'checked':''?>> Approve public distribution (rights and safety reviewed)</label><button>Save</button></form><a href="?action=media&id=<?=h($a['id'])?>">Preview original</a></article><?php endforeach;foreach(readRows('text') as $x): ?><form method="post" action="?action=moderate"><?=token()?><input type="hidden" name="id" value="<?=h($x['id'])?>"><textarea name="body"><?=h($x['body'])?></textarea><label><input type="checkbox" name="approved" <?=$x['public']?'checked':''?>> Publish</label><button>Save text</button></form><?php endforeach;endif;?>
<?php elseif($page==='tools'): ?><h2>Tools</h2><textarea id="note" placeholder="Local notepad / speech"></textarea><button onclick="speechSynthesis.speak(new SpeechSynthesisUtterance(note.value))">Speak</button><button onclick="speechSynthesis.cancel()">Stop</button><button onclick="let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([note.value]));a.download='note.txt';a.click()">Export note</button><script>note.value=localStorage.getItem('note')||'';note.oninput=()=>localStorage.setItem('note',note.value)</script><h3>Paint</h3><input type="color" id="color"><canvas id="paint" width="800" height="500" style="width:100%;background:white;touch-action:none"></canvas><button onclick="let a=document.createElement('a');a.href=paint.toDataURL();a.download='paint.png';a.click()">Save painting</button><script>let ctx=paint.getContext('2d'),down=false;ctx.fillStyle='white';ctx.fillRect(0,0,800,500);function point(e){let r=paint.getBoundingClientRect();return [(e.clientX-r.left)*800/r.width,(e.clientY-r.top)*500/r.height]}paint.onpointerdown=e=>{down=true;paint.setPointerCapture(e.pointerId);ctx.beginPath();ctx.moveTo(...point(e))};paint.onpointermove=e=>{if(down){ctx.lineTo(...point(e));ctx.strokeStyle=color.value;ctx.lineWidth=4;ctx.stroke()}};paint.onpointerup=paint.onpointercancel=()=>down=false</script>
<?php else: ?><h2><?=h($page)?></h2><?php if(isset($legacy[$page]))echo '<pre>'.h($legacy[$page]['text']).'</pre>';if($page==='goods')echo '<a href="https://fuckyeah.3xink.com">Existing merchandise store</a>';if($page==='home')echo '<p><a href="?page=cinema">Explore original video references</a></p>';else echo '<p>Legacy page recovered; original interactive functionality may still require restoration.</p>';?><h3>Original site directory</h3><div class="grid"><?php foreach($legacy as $p=>$x)echo '<a href="?page='.rawurlencode($p).'">'.h($p).'</a>';?></div><?php endif;?></main></html>
