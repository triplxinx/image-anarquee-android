# iMAG3 Anarqeə! (I.A) for Android

A native Android activity hosts the bundled dashboard in an isolated, offline WebView. The Android Photo Picker and Storage Access Framework handle image and JSON selection. Android's system save dialog handles exports.

## Use the app

- The first launch offers a skippable tour. Open **Quick tour** in the header to replay it.
- After 3 minutes and 33 seconds of inactivity with the app visible, a pixel monster offers a tip. Tap to reveal an original revolutionary line, then tap again to return and refresh remote and Seattle-area creative leads. **Systems → Idle monster** lets you preview or turn off the feature.
- The refresh reads seven public employer boards through Ashby, Lever and Greenhouse. It sends no portfolio or account data and keeps saved leads if a request fails. Tips and quotes are available offline. Fresh listings require internet access.
- **Workdesk** adds verified lead intake, a workload filtered by deliverable, and an editor for pitches, previews and reviewed exports. Use **Refresh leads** or swipe down on the refresh strip. This checks the public visual-work boards. Photography standing intakes are listed separately in the workload.
- Market ranking requires an active sourced buyer route and an evidence link. Record comparable demand and competing listing counts, then add views, clicks, purchases and a checkout link where known. The score ranks supplied evidence. It does not predict sales.
- For an approved external data source, export a JSON file with a top-level `version` of `1` and an `opportunities` array. JSONL and NDJSON files accept one opportunity object per line. A file can contain up to 5,000 records and occupy up to 8 MiB, subject to available app storage. Each item needs `name`, an HTTPS `source`, and a `category` of `licensing`, `copy`, `proof`, `index`, `data`, `landing`, `seo`, `maps`, `reviews`, `social`, `scheduling`, `email`, `service` `design`, `video` or `apk`. Optional fields include `contact`, `notes`, `corroboration`, `kind` (`prospect`, `brief`, `intake` or `represented`), `deadline`, `evidence`, `keyword`, and numerical `demand`, `competition`, `views`, `clicks`, `purchases`, `volume`, and `pay`. Verify imported records in the app before they enter the active list.
- **Auto-draft** supports light text cleanup, line-reference indexing, and TSV structure checks. Choose standard scope only when the source supports it. Enter the deadline, volume, total USD pay, throughput, minimum rate, and available working hours. Proofread volume is in words. Index and data volume are in lines or rows. Review the output before exporting a handoff copy. **Prepare AI prompt** creates an editable prompt locally for optional use in an external model.
- In **Album intake**, choose the album label, then select images from Photos (Google Photos if enabled) or Files and Drive. The first 50 are queued together. Tap **Import next batch** to process them and expose the next 50.
- Each queued image opens a lazy preview with optional crop bounds and 4× width and height. Edits are saved as a separate file to export from the catalog. Skip the editor for the original import path. Full-size output is limited to 40 megapixels for edited files.
- During the same app session, reusing the album label skips completed selections with matching file metadata. The catalog also uses content fingerprints to detect duplicates.
- Turn on the phone's cloud media provider for Google Photos if Android offers that setting. Google Drive is available through Files if the Drive provider is installed and signed in. You can also select downloaded images. A shared album URL is a reference, not an image import source.
- Systems → Lead updates → Import lead feed accepts the version 1 JSON emitted by **Export lead feed**. Match existing leads by ID or name. Outreach history stays on the device. New entries need a name. Optional fields include priority, budget, album, background, angleA, angleB, contact, URL (as url) and researchUrl.
- To move outreach history and settings between web and Android, use **JSON backup** and restore it on the other device. This export does not include originals or thumbnails. Keep independent copies of original media.
- Outreach stays manual. Google authentication is managed by the selected Android provider.

## Build and extend

Use Linux, a JDK, Android SDK platform 35 and build-tools 35.0.0, plus zip. Set `ANDROID_SDK_ROOT`, `ARCHIVE_KEYSTORE`, and `ARCHIVE_KEY_PASSWORD` in the environment. The default signing alias is `archive`, configurable with `ARCHIVE_KEY_ALIAS`. Use your own keystore for your release line. Run `./android/build.sh /absolute/path/Archive-Launch-Desk.apk` from the source bundle. Min Android is API 23.

Dashboard files are in `dist/`. Native pickers, external links and exports live in MainActivity.java. iMAG3 Anarqeə! (I.A) updates Archive Desk Studio in place when signed with the existing Studio key. It can coexist with earlier editions that use other package IDs. Export a backup in the earlier app and restore it in Studio to move settings and lead history. Export or reimport images separately. The source bundle excludes the signing key.

## Affiliate campaigns

Open Affiliates to browse 16 program routes, review the merchant terms, associate an album and save a disclosed recommendation to Workdesk. Drafts use the existing Image Anarquee backup. The native AffiliateFlow Owner Desk (Android 9+) uses its existing HTTPS AffiliateFlow backend and owner account. Configure the deployed site in Settings and sign in. Links → Use link in Image Anarquee sends a single chosen provider link into the campaign editor. Network accounts, server configuration, and session credentials are independent of local Workdesk backups. The Printful entry is available for local campaigns. Account-side programs and checklist availability follow the connected server’s catalog.

## XXXINK creator launch

Affiliates opens a local setup for merch campaigns. Add published product links individually or paste a two-column, tab-separated catalog. Scout a niche against Apple US podcast listings and Google's US trending RSS feed. The blog submission routes and manual channel searches work independently of the feeds. Confirm a creator's public business contact and relevant work before creating a pitch. The commission calculator uses your own costs, reserve and retained margin. Verify the order attribution method with your actual checkout before launch. Record cumulative, same-period impressions, clicks and confirmed orders manually. Campaigns, entered products and application stages are included in the existing workspace backup.

## Trading cards and ACIDBATH

From the left navigation, tap **Trading cards**. Add a record, then **Scan a
view**. The scanner suggests the next missing view after you save an original.
You can import each view from Files instead. The catalog stores edition,
identity, grade and certification, condition, provenance, market evidence and
pricing details. Each physical checklist item has a review status. Use the
grader links in the app to check current definitions and submission policies.

### Capture and calibration

- Lay the card on a plain, matte surface whose color contrasts with the edges.
  Keep hands, sleeves, harsh reflections and other objects outside the guide
  when possible. Select the correct view. Front and back auto capture look for
  four aligned edges, steady samples, visible detail and usable exposure.
  Re-frame or tap **Shutter** when foil, dark artwork, an irregular shape or a
  similar background prevents auto capture.
- **Light auto** waits for persistent darkness before enabling the supported
  rear torch. It turns the light off on sustained clipping. You can force the
  light on or off. The HUD includes zoom, exposure compensation, sampled RGBA,
  contrast, clipping and detail. The alpha value is 255 for the opaque
  camera preview.
- **Calibrate** starts with blank white printer paper under your capture
  lighting. Zoom until the page fills the frame, then tap **Sample white**.
  Next, cover the camera completely with your hand and tap **Sample black**
  when ready. Keep the lens covered until the shot is done. The app keeps the
  torch off during the black step and checks the actual reference JPEG before
  accepting it. Uncover the lens to continue to the light evenness and
  exposure checks. **Undo**, **Redo**, **Skip**, and **Restart** are available.
  Progress resumes at the black step for an older saved white sample.
- A matching pair is saved with each new capture and applied by default in
  Raster Desk. The correction offsets each RGB channel so its measured black
  maps to zero. It scales each remaining range so the paper becomes neutral
  near its measured brightness, retaining highlight headroom. When editing an
  import or an older image without a saved reference, a valid current pair
  can be enabled manually. Use this for photos from the same camera and
  lighting. Android display preferences affect the preview. The file retains
  its sRGB encoding.
- Full-resolution JPEG originals remain intact. The stricter capture audit
  measures tone clipping, glare proxies, contrast and detail. Its feedback is
  diagnostic. The thresholds are app defaults. Foil and high-key art may give
  a review result even with a clean shot. The two samples estimate a relative neutral point and shadow floor in the
  phone’s processed RGB. FADGI conformance requires a measured reference
  target, a controlled setup and conformance software.
- Priority is raised only for queued calibration and armed auto-shutter samples
  or for saving and checking a still. Each scoped operation checks restoration
  on the same worker thread three times. A worker that cannot restore its
  priority exits. Idle monitoring, text recognition, exports and scouting use
  normal priority. Torch and camera resources are released on pause.

### Text, raster and evidence export

**Read card text** uses bundled English Tesseract on the device. It proposes
name, year, card number, grader or cert number when available. Review the
image and choose which suggestions to copy. The optional checkbox opens
this review after front, back or slab-label captures.

**Crop / export** opens the Raster Desk. Drag the crop handles, choose a
physical/digital preset and adjust width, height, PPI, aspect fit, brightness,
contrast, warmth and saturation. **Suggest conservative adjustment** previews
a bounded adjustment, including the neutral reference when available.
The result reports when the profile needs upsampling. Large exports can be
limited by working memory. Save PNG, JPEG (with resolution tags on Android
7+) or 8-bit RGB TIFF (ICC tagged). The archive preset uses lossless TIFF.
Follow the receiving lab's specifications for final dimensions, bleed,
substrate, spot plates and device-specific profiles. The presets supply
raster sizing for print workflows; shop-specific CMYK conversions, screen
separations and fabric compensation need the printer's specifications.

**Capture HUD** opens this camera without a card record. **HUD asset stack**
shows recent standalone captures for further editing or attachment to a card. **ACID FX Studio**
opens the included ACID Camera 0.2 workspace on Android 10+, including
its effect stack, presets, lens tools, comparison, and advertised sensor lab.
The camera hardware controls reflect what the device exposes. Use the
originals and dedicated card views for actual condition evidence. Use FX
and raster edits for creative copies and mockups. The studio's bundled
license and effects attribution are under `android/assets/`.

**Export portfolio ZIP** packages the catalog JSON and associated originals
for handoff. Keep this ZIP with the normal desk backup if you need both
records and image bytes. Removing a card or view removes the catalog
association while retaining the original inside the app.

### Scout and Workdesk

**Verify live routes** rechecks published direct-buy, consignment, referral
and marketplace pages. The check looks for current first-party intake text.
Ranking uses route type, card category, identity keywords, location and
recent verification. It does not infer guaranteed liquidity, actual buyer
commitment or an appraisal. The eBay sold search and marketplace links
use the selected card's identity. Review exact variants and conditions,
then record actual sale date, price, currency, shipping and source.
Public collector posts can be added with dated source and contact evidence.
Use **Send to Workdesk** to save an editable draft with the selected route
and card. The app does not send outreach.

Standards used as references include [PSA](https://www.psacard.com/gradingstandards),
[CGC](https://www.cgccards.com/card-grading/grading-scale/),
[Beckett](https://beckett.com/grading), [TCGplayer's listing photo guidance](https://help.tcgplayer.com/hc/en-us/articles/360000111227-Tips-for-Listings-with-Photos)
and the [FADGI Technical Guidelines, third edition](https://www.digitizationguidelines.gov/guidelines/digitize-technical.html).
