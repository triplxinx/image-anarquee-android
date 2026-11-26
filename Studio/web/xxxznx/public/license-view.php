<?php
declare(strict_types=1);
if (!function_exists('licenseOffer')) {
    http_response_code(404);
    exit;
}
$owner = $screen === 'owner';
$ownerUrl = '?license=owner';
$offerUrl = '?license'.($offer ? '&offer='.$offer['id'] : '');
$proofUrl = ($owner ? $ownerUrl.'&offer='.$id : $offerUrl).'&proof=1';
function licenseField(array $values, string $name, string $label, int $limit, string $type = 'text', bool $required = true): void {
    $raw = $values[$name] ?? '';
    $value = h(is_string($raw) ? $raw : '');
    $attributes = ' name="'.h($name).'" maxlength="'.$limit.'"'.($required ? ' required' : '');
    echo '<label>'.h($label);
    if ($type === 'textarea') echo '<textarea'.$attributes.'>'.$value.'</textarea>';
    else echo '<input type="'.h($type).'"'.$attributes.' value="'.$value.'">';
    echo '</label>';
}
?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title><?= $owner ? 'Licensing desk' : 'Licensing preview' ?> | XXX!NK</title>
<link rel="stylesheet" href="license.css">
<script src="license-client.js" defer></script>
</head>
<body>
<header class="masthead"><a class="mark" href="./">XXX!NK.</a><span>Independent art &amp; image licensing</span></header>
<main>
<?php if ($error): ?><p class="notice" role="alert"><?=h($error)?></p><?php endif; ?>
<?php if ($owner): ?>
    <h1>Licensing desk</h1>
    <?php if (!admin()): ?>
        <form class="stack compact" method="post" action="<?=h($ownerUrl)?>">
            <?=token()?><input type="hidden" name="task" value="owner-login">
            <label>Site admin password<input type="password" name="password" autocomplete="current-password" required></label>
            <button>Sign in</button>
        </form>
    <?php elseif ($root): ?>
        <?php if ($offer): ?>
            <p><a href="<?=h($ownerUrl)?>">Create or find an offer</a></p>
            <section class="panel">
                <p class="eyebrow"><?= licenseLive($offer) ? 'Link active through '.h(gmdate('M j, Y', $offer['expires'])).' UTC' : 'Link closed' ?></p>
                <h2><?=h($offer['project'])?></h2><p>Prepared for <?=h($offer['buyer'])?></p>
                <?php if (licenseLive($offer)): ?>
                    <div class="stack" data-license-share data-key="<?=h(licenseKey($root, $id))?>" data-recipient="<?=h($offer['email'])?>" data-project="<?=h($offer['project'])?>">
                        <label>Private link<input data-share-link readonly></label>
                        <label>Personalized key<input readonly value="<?=h(licenseKey($root, $id))?>"></label>
                        <label>Pitch with preview link<textarea data-share-pitch rows="9"><?=h($offer['pitch'])?></textarea></label>
                        <div class="actions">
                            <button type="button" data-copy="link">Copy link</button>
                            <button type="button" data-copy="pitch">Copy pitch</button>
                            <?php if ($offer['email']): ?><a class="button" data-compose>Open email draft</a><?php endif; ?>
                        </div>
                        <p data-copy-status role="status">For a DM or submission form, paste the pitch into your preferred channel.</p>
                    </div>
                    <form method="post" action="<?=h($ownerUrl.'&offer='.$id)?>">
                        <?=token()?><input type="hidden" name="task" value="revoke">
                        <button class="secondary">Revoke this link</button>
                    </form>
                <?php endif; ?>
            </section>
            <section class="panel">
                <h2>License request</h2>
                <?php if ($request = $offer['request']): ?>
                    <p><?=h($request['name'])?> · <a href="mailto:<?=h($request['email'])?>"><?=h($request['email'])?></a></p>
                    <p class="multiline"><?=h($request['notes'])?></p>
                    <p>Reference <?=h($request['reference'])?> · <?=h(gmdate('M j, Y H:i', $request['received']))?> UTC</p>
                <?php else: ?><p>No request received yet.</p><?php endif; ?>
            </section>
        <?php else: ?>
            <form class="stack panel" method="post" enctype="multipart/form-data" action="<?=h($ownerUrl)?>" data-license-create<?= $submitted ? ' data-returned' : '' ?>>
                <?=token()?><input type="hidden" name="task" value="create">
                <h2>Create a private preview</h2>
                <div class="pair"><?php licenseField($submitted, 'buyer', 'Lead or organization', 250); licenseField($submitted, 'email', 'Recipient email (optional)', 254, 'email', false); ?></div>
                <?php licenseField($submitted, 'source', 'Original post URL (optional)', 1000, 'url', false); ?>
                <?php licenseField($submitted, 'project', 'Project or campaign title', 250); ?>
                <?php licenseField($submitted, 'context', 'What the post asked for and how the work fits', 2200, 'textarea'); ?>
                <?php licenseField($submitted, 'placement', 'Example placement, such as newsletter hero or album cover', 250); ?>
                <label>Contextual mockup <small>JPEG, PNG or WebP, up to 10 MB. Upload the version composed for this lead’s placement.</small>
                    <input type="file" name="preview" accept="image/jpeg,image/png,image/webp" required>
                </label>
                <p class="notice" data-studio-proof-notice hidden>Proof attached from Authoring Studio. You can replace it before creating the link.</p>
                <?php licenseField($submitted, 'scope', 'Proposed usage (channels, term, territory, exclusivity)', 2200, 'textarea'); ?>
                <?php licenseField($submitted, 'price', 'Proposed fee and currency (optional)', 180, 'text', false); ?>
                <?php licenseField($submitted, 'pitch', 'Pitch to review and send', 6000, 'textarea'); ?>
                <label>Expires after this many days<input name="days" type="number" min="1" max="90" required value="<?=h($submitted['days'] ?? '14')?>"></label>
                <label class="check"><input type="checkbox" name="rights" value="yes" required> I have permission to use this mockup and offer the proposed usage.</label>
                <button>Create preview and pitch link</button>
            </form>
            <?php
            $paths = glob($root.'/[0-9a-f]*/offer.json') ?: [];
            $offers = [];
            foreach ($paths as $path) {
                $item = licenseOffer($root, basename(dirname($path)));
                if ($item) $offers[] = $item;
            }
            usort($offers, fn($a,$b) => $b['created'] <=> $a['created']);
            ?>
            <section class="panel">
                <h2>Offers and requests</h2>
                <?php if (!$offers): ?><p>Your created offers will appear here.</p><?php endif; ?>
                <ul class="offer-list"><?php foreach ($offers as $item): ?>
                    <li><a href="<?=h($ownerUrl.'&offer='.$item['id'])?>"><?=h($item['project'])?> · <?=h($item['buyer'])?></a>
                        <span><?= $item['request'] ? 'Request received' : (licenseLive($item) ? 'Link active' : 'Link closed') ?></span></li>
                <?php endforeach; ?></ul>
            </section>
        <?php endif; ?>
    <?php endif; ?>
<?php elseif (!$offer): ?>
    <h1>Open your private preview</h1>
    <p>Enter the personalized key from your pitch to see the proposed work.</p>
    <form method="post" action="?license" class="stack panel compact" data-license-unlock>
        <?=token()?><input type="hidden" name="task" value="unlock">
        <label>Preview key<input name="key" required maxlength="80" autocapitalize="none" autocomplete="off" spellcheck="false"></label>
        <button>Open preview</button>
    </form>
<?php else: ?>
    <p class="eyebrow">Private preview for <?=h($offer['buyer'])?></p>
    <h1><?=h($offer['project'])?></h1>
    <p class="lede multiline"><?=h($offer['context'])?></p>
    <?php if ($offer['source']): ?><p><a href="<?=h($offer['source'])?>" rel="noreferrer noopener" target="_blank">Original brief ↗</a></p><?php endif; ?>
    <figure class="panel">
        <figcaption><?=h($offer['placement'])?></figcaption>
        <img src="<?=h($proofUrl)?>" alt="<?=h('Watermarked example for '.$offer['placement'])?>">
    </figure>
    <div class="pair terms">
        <section class="panel"><h2>Proposed usage</h2><p class="multiline"><?=h($offer['scope'])?></p>
            <p><strong><?=h($offer['price'] ?: 'Fee available on request')?></strong></p>
            <small>Preview available through <?=h(gmdate('M j, Y', $offer['expires']))?> UTC.</small>
        </section>
        <section class="panel">
            <h2>Request this license</h2>
            <?php if ($offer['request']): ?>
                <p>A request has been received for this offer.</p>
                <?php if (isset($_SESSION['license_receipts'][$id])): ?><p>Reference <strong><?=h($_SESSION['license_receipts'][$id])?></strong>. The owner has your reply email and requested use.</p><?php endif; ?>
            <?php else: ?>
                <form method="post" action="<?=h($offerUrl)?>" class="stack">
                    <?=token()?><input type="hidden" name="task" value="request">
                    <?php licenseField($_POST, 'name', 'Your name', 180); licenseField($_POST, 'email', 'Reply email', 254, 'email'); ?>
                    <?php licenseField($_POST, 'notes', 'Changes or questions (optional)', 2200, 'textarea', false); ?>
                    <small>This starts a licensing conversation. Usage starts after both sides agree to the final terms.</small>
                    <button>Send license request</button>
                </form>
            <?php endif; ?>
        </section>
    </div>
    <p><a href="?license">Open another preview</a></p>
<?php endif; ?>
</main>
</body>
</html>
