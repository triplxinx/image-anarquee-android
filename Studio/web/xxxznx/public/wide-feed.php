<?php
declare(strict_types=1);

// This endpoint relays only the feeds bundled with the Studio dashboard.
header('X-Content-Type-Options: nosniff');
header('Content-Type: text/plain; charset=utf-8');
$key = $_GET['source'] ?? null;
$cursor = $_GET['cursor'] ?? '';
$until = $_GET['until'] ?? '';
$feeds = json_decode((string) @file_get_contents(__DIR__.'/studio/wide-net-feeds.json'), true);
$feed = is_string($key) && is_array($feeds) ? ($feeds[$key] ?? null) : null;
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    exit('GET required.');
}
if ($key === 'wiki') {
    $language = $_GET['language'] ?? null;
    $topic = $_GET['topic'] ?? null;
    $start = $_GET['start'] ?? null;
    $end = $_GET['end'] ?? null;
    if (!in_array($language, ['en','es','fr','pt','de','ar','ja'], true) ||
        !is_string($topic) || !preg_match('/^[^\x00-\x1f\x7f]{1,100}$/uD', $topic) ||
        !is_string($start) || !is_string($end) ||
        !preg_match('/^\d{8}00$/D', $start) || !preg_match('/^\d{8}00$/D', $end) ||
        $end !== gmdate('Ymd00', time() - 2*86400) || $start !== gmdate('Ymd00', time() - 29*86400)) {
        http_response_code(400);
        exit('Invalid article or date window.');
    }
    $url = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/'.$language.
        '.wikipedia/all-access/user/'.rawurlencode($topic).'/daily/'.$start.'/'.$end;
} elseif ($feed && is_string($cursor) && is_string($until) &&
    (($cursor === '' && $until === '') || (!empty($feed['cursor']) && preg_match('/^[A-Za-z0-9_+.=\/-]{1,300}$/D', $cursor) &&
        preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/D', $until)))) {
    $url = $feed['url'].($cursor === '' ? '' :
        '&cursor='.rawurlencode($cursor).'&updatedTo='.rawurlencode($until));
} else {
    http_response_code(400);
    exit('Unknown feed or invalid page.');
}
$agent = 'iMAG3-Studio/1.0 (+https://github.com/triplxinx/image-anarquee-android)';
$max = 3 * 1024 * 1024;
$body = false;
$status = 0;
if (function_exists('curl_init')) {
    $body = '';
    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 3, CURLOPT_TIMEOUT => 7, CURLOPT_USERAGENT => $agent,
        CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use (&$body, $max): int {
            if (strlen($body) + strlen($chunk) > $max) return 0;
            $body .= $chunk;
            return strlen($chunk);
        },
    ]);
    $ok = curl_exec($curl);
    $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);
    if (!$ok) $body = false;
} else {
    $context = stream_context_create(['http' => ['timeout' => 6, 'follow_location' => 0, 'user_agent' => $agent]]);
    $body = @file_get_contents($url, false, $context, 0, $max + 1);
    if (preg_match('/^HTTP\/\S+ (\d{3})\b/', $http_response_header[0] ?? '', $matches)) $status = (int) $matches[1];
}

if ($status === 429) {
    http_response_code(429);
    header('Cache-Control: public, max-age=120');
    exit('Source rate limited.');
}
if ($status !== 200 || $body === false || $body === '' || strlen($body) > $max) {
    header('Cache-Control: no-store');
    http_response_code(502);
    exit('Source unavailable.');
}
header('Cache-Control: public, max-age=600');
echo $body;
