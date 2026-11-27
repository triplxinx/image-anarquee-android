<?php
declare(strict_types=1);

if (!function_exists('admin')) {
    http_response_code(404);
    exit;
}

header('Cache-Control: no-store, private');
header('X-Robots-Tag: noindex, nofollow, noarchive');
header("Content-Security-Policy: default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");

function licenseText(array $input, string $name, int $limit): string {
    $value = $input[$name] ?? '';
    if (!is_string($value) || strlen($value) > $limit || !preg_match('//u', $value)) {
        throw new InvalidArgumentException('A field is too long or contains invalid text.');
    }
    return trim($value);
}

function licenseDirectory(string $dir): string {
    $private = realpath($dir);
    $public = realpath($_SERVER['DOCUMENT_ROOT'] ?? '') ?: __DIR__;
    if (!$private || $private === $public || str_starts_with($private, $public.DIRECTORY_SEPARATOR)) {
        throw new RuntimeException('Set XXXINK_DATA to a writable directory outside the website document root.');
    }
    $offers = $private.'/license-offers';
    if (!is_dir($offers) && !@mkdir($offers, 0700) && !is_dir($offers)) {
        throw new RuntimeException('Could not create private licensing storage.');
    }
    if (realpath($offers) !== $offers) throw new RuntimeException('Use a direct directory for licensing storage.');
    return $offers;
}

function licenseWrite(string $path, string $bytes): void {
    $tmp = tempnam(dirname($path), 'stage-');
    if ($tmp === false) {
        throw new RuntimeException('Could not stage licensing data.');
    }
    try {
        if (file_put_contents($tmp, $bytes) !== strlen($bytes) || !chmod($tmp, 0600) || !rename($tmp, $path)) {
            throw new RuntimeException('Could not save licensing data.');
        }
    } finally {
        if (is_file($tmp)) unlink($tmp);
    }
}

function licenseLocked(string $path, callable $operation) {
    $lock = fopen($path, 'c');
    if (!$lock) throw new RuntimeException('Could not open licensing storage.');
    try {
        if (!flock($lock, LOCK_EX)) throw new RuntimeException('Could not lock licensing storage.');
        return $operation();
    } finally {
        fclose($lock);
    }
}

function licenseKey(string $root, string $id): string {
    $path = $root.'/signing.key';
    if (!is_file($path)) {
        licenseLocked($root.'/signing.lock', function () use ($path) {
            if (!is_file($path)) licenseWrite($path, random_bytes(32));
        });
    }
    $secret = file_get_contents($path);
    if ($secret === false || strlen($secret) !== 32) throw new RuntimeException('Invalid licensing signing key.');
    return $id.'.'.substr(hash_hmac('sha256', 'license-offer:'.$id, $secret), 0, 32);
}

function licenseOffer(string $root, string $id): ?array {
    if (!preg_match('/\A[0-9a-f]{24}\z/', $id)) return null;
    $path = $root.'/'.$id.'/offer.json';
    if (!is_file($path)) return null;
    return json_decode(file_get_contents($path), true, 32, JSON_THROW_ON_ERROR);
}

function licenseLive(?array $offer): bool {
    return $offer !== null && empty($offer['revoked']) && $offer['expires'] > time();
}

function licenseSave(string $root, array $offer): void {
    licenseWrite($root.'/'.$offer['id'].'/offer.json', json_encode($offer, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE));
}

function licensePreview(array $file): string {
    if (($file['error'] ?? null) !== UPLOAD_ERR_OK || ($file['size'] ?? 0) > 10 * 1024 * 1024 ||
        !is_uploaded_file($file['tmp_name'] ?? '')) {
        throw new InvalidArgumentException('Upload a JPEG, PNG or WebP mockup up to 10 MB.');
    }
    if (!extension_loaded('gd')) throw new RuntimeException('Enable PHP GD to create watermarked previews.');
    $info = @getimagesize($file['tmp_name']);
    if (!$info || !$info[0] || !$info[1] || $info[0] * $info[1] > 16000000 ||
        !in_array($info['mime'], ['image/jpeg', 'image/png', 'image/webp'], true)) {
        throw new InvalidArgumentException('Use a JPEG, PNG or WebP under 16 megapixels.');
    }
    $original = @imagecreatefromstring(file_get_contents($file['tmp_name']));
    if (!$original) throw new InvalidArgumentException('The mockup image could not be read.');
    if ($info['mime'] === 'image/jpeg' && function_exists('exif_read_data')) {
        $orientation = (int)(@exif_read_data($file['tmp_name'])['Orientation'] ?? 1);
        if (in_array($orientation, [2,4,5,7], true)) imageflip($original, IMG_FLIP_HORIZONTAL);
        $rotation = [3=>180, 4=>180, 5=>90, 6=>270, 7=>270, 8=>90][$orientation] ?? 0;
        if ($rotation) $original = imagerotate($original, $rotation, 0) ?: $original;
    }
    $width = imagesx($original);
    $height = imagesy($original);
    if (min($width, $height) < 120) throw new InvalidArgumentException('Use a mockup at least 120 pixels wide and tall.');
    $scale = min(1, 1100 / max($width, $height));
    $preview = imagecreatetruecolor(max(1, (int)round($width*$scale)), max(1, (int)round($height*$scale)));
    imagefill($preview, 0, 0, imagecolorallocate($preview, 245, 245, 245));
    imagecopyresampled($preview, $original, 0, 0, 0, 0, imagesx($preview), imagesy($preview), $width, $height);
    $label = 'PRIVATE PREVIEW';
    $font = 4;
    $labelWidth = imagefontwidth($font) * strlen($label);
    $left = max(0, (int)((imagesx($preview) - $labelWidth) / 2));
    $middle = (int)(imagesy($preview) / 2);
    imagefilledrectangle($preview, 0, $middle - 12, imagesx($preview), $middle + 12, imagecolorallocatealpha($preview, 17, 17, 17, 33));
    imagestring($preview, $font, $left, $middle - 8, $label, imagecolorallocate($preview, 255, 255, 255));
    ob_start();
    $encoded = imagejpeg($preview, null, 80);
    $bytes = ob_get_clean();
    if (!$encoded || $bytes === false || $bytes === '') throw new RuntimeException('Could not render the preview.');
    return $bytes;
}

function licenseGo(array $parameters = []): void {
    header('Location: ?'.http_build_query($parameters + ['license'=>'']), true, 303);
    exit;
}

$screen = ($_GET['license'] ?? '') === 'owner' ? 'owner' : 'buyer';
$id = is_string($_GET['offer'] ?? null) ? $_GET['offer'] : '';
$verb = $_SERVER['REQUEST_METHOD'];
$error = '';
$offer = null;
$submitted = [];
$root = null;
try {
    $root = licenseDirectory($dir);
    if ($verb === 'POST') {
        $task = licenseText($_POST, 'task', 32);
        if (!hash_equals($_SESSION['csrf'], licenseText($_POST, 'csrf', 128))) fail('Invalid request', 403);
        if ($task === 'owner-login' && $screen === 'owner') {
            $hash = xxxinkPasswordHash();
            if (!$hash || !password_verify(licenseText($_POST, 'password', 1024), $hash)) {
                sleep(1);
                throw new InvalidArgumentException('Sign-in failed.');
            }
            session_regenerate_id(true);
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
            $_SESSION['admin'] = true;
            licenseGo(['license'=>'owner']);
        }
        if ($task === 'unlock' && $screen === 'buyer') {
            $code = strtolower(licenseText($_POST, 'key', 80));
            if (preg_match('/\A([0-9a-f]{24})\.[0-9a-f]{32}\z/', $code, $match) &&
                hash_equals(licenseKey($root, $match[1]), $code) &&
                licenseLive(licenseOffer($root, $match[1]))) {
                $grants = array_filter($_SESSION['license_grants'] ?? [], fn($expiration) => $expiration > time());
                $grants[$match[1]] = time() + 43200;
                $_SESSION['license_grants'] = array_slice($grants, -40, null, true);
                licenseGo(['offer'=>$match[1]]);
            }
            http_response_code(404);
            throw new InvalidArgumentException('This key is invalid, expired or revoked.');
        }
        if ($task === 'create' && $screen === 'owner' && admin()) {
            foreach (['buyer'=>250, 'email'=>254, 'source'=>1000, 'project'=>250, 'context'=>2200,
                      'placement'=>250, 'scope'=>2200, 'price'=>180, 'pitch'=>6000, 'days'=>3] as $name=>$limit) {
                $submitted[$name] = licenseText($_POST, $name, $limit);
            }
            foreach (['buyer', 'project', 'context', 'placement', 'scope', 'pitch'] as $required) {
                if ($submitted[$required] === '') throw new InvalidArgumentException('Complete the buyer, project, brief, placement, usage and pitch fields.');
            }
            if ($submitted['email'] && !filter_var($submitted['email'], FILTER_VALIDATE_EMAIL)) {
                throw new InvalidArgumentException('Use a valid recipient email or leave it blank for a DM or application.');
            }
            if ($submitted['source'] && (!filter_var($submitted['source'], FILTER_VALIDATE_URL) ||
                !in_array(parse_url($submitted['source'], PHP_URL_SCHEME), ['https','http'], true))) {
                throw new InvalidArgumentException('Enter the source post as a web URL.');
            }
            $days = filter_var($submitted['days'], FILTER_VALIDATE_INT, ['options'=>['min_range'=>1, 'max_range'=>90]]);
            if (!$days || ($_POST['rights'] ?? '') !== 'yes') {
                throw new InvalidArgumentException('Confirm the preview rights and set an expiry of 1–90 days.');
            }
            $preview = licensePreview($_FILES['preview'] ?? []);
            $newId = bin2hex(random_bytes(12));
            $folder = $root.'/'.$newId;
            if (!mkdir($folder, 0700)) throw new RuntimeException('Could not create the offer.');
            $new = $submitted + ['id'=>$newId, 'created'=>time(), 'expires'=>time()+86400*$days, 'revoked'=>false, 'request'=>null];
            licenseWrite($folder.'/proof.jpg', $preview);
            licenseSave($root, $new);
            licenseGo(['license'=>'owner', 'offer'=>$newId]);
        }
        if ($task === 'revoke' && $screen === 'owner' && admin() && licenseOffer($root, $id)) {
            licenseLocked($root.'/'.$id.'/offer.lock', function () use ($root, $id) {
                $current = licenseOffer($root, $id);
                $current['revoked'] = true;
                licenseSave($root, $current);
            });
            licenseGo(['license'=>'owner', 'offer'=>$id]);
        }
        if ($task === 'request' && $screen === 'buyer' && ($_SESSION['license_grants'][$id] ?? 0) > time() && licenseLive(licenseOffer($root, $id))) {
            $request = [];
            foreach (['name'=>180, 'email'=>254, 'notes'=>2200] as $name=>$limit) {
                $request[$name] = licenseText($_POST, $name, $limit);
            }
            if (!$request['name'] || !filter_var($request['email'], FILTER_VALIDATE_EMAIL)) {
                throw new InvalidArgumentException('Enter your name and a valid reply email.');
            }
            $reference = licenseLocked($root.'/'.$id.'/offer.lock', function () use ($root, $id, $request) {
                $current = licenseOffer($root, $id);
                if (!licenseLive($current)) throw new InvalidArgumentException('This preview is no longer available.');
                if ($current['request'] !== null) {
                    throw new InvalidArgumentException('A licensing request has already been received for this offer.');
                }
                $ref = bin2hex(random_bytes(8));
                $current['request'] = $request + ['reference'=>$ref, 'received'=>time()];
                licenseSave($root, $current);
                return $ref;
            });
            $_SESSION['license_receipts'][$id] = $reference;
            licenseGo(['offer'=>$id]);
        }
        fail('Invalid licensing action', 403);
    }
} catch (InvalidArgumentException $exception) {
    $error = $exception->getMessage();
    if (http_response_code() < 400) http_response_code(422);
} catch (Throwable $exception) {
    error_log('Licensing: '.$exception->getMessage());
    $error = 'Licensing is temporarily unavailable. Ask the site owner to check the setup.';
    if (admin() && $exception instanceof RuntimeException) $error = $exception->getMessage();
    http_response_code(503);
}
if ($root && $id !== '' && ($screen === 'owner' ? admin() : ($_SESSION['license_grants'][$id] ?? 0) > time())) {
    $offer = licenseOffer($root, $id);
}
if ($screen === 'buyer' && !licenseLive($offer)) $offer = null;
if (isset($_GET['proof'])) {
    if (!$offer || !is_file($root.'/'.$id.'/proof.jpg')) fail('Preview unavailable', 404);
    header('Content-Type: image/jpeg');
    session_write_close();
    readfile($root.'/'.$id.'/proof.jpg');
    exit;
}
if ($screen === 'buyer' && $id !== '' && !$offer && !$error) {
    http_response_code(404);
    $error = 'This preview is unavailable. Enter a valid key to open a preview.';
}
include __DIR__.'/license-view.php';
