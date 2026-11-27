# iMAG3 Anarqeə! Studio with Wide Net

This release extends the iMAG3 Next phone-host build and the XXX!NK PHP webspace package. The Android app and desktop or mobile browser use the same Studio interface. The existing Album Intake, Lead Desk, Workdesk, merch, cards and affiliates sections remain available.

## Make a digital or print deliverable

1. Open **Authoring Studio** and choose a JPEG, PNG or WebP up to 45 MiB and 32 megapixels. Album Intake can also open a record with an original or edited copy in Studio. From Lead Desk, use **Compose in Studio** on a pitch. Workdesk offers the same action for a reviewed draft.
2. Pick a format. Compare title-at-top, title-at-bottom and image-only layouts. Adjust the crop, headline, subtitle and color. The preview uses the same rendering instructions as the export.
3. Record the credit and any release notes and confirm permission for the intended use. The **Rights record** is an operator record. Keep your actual releases and agreements with the project.
4. Export a PNG for a digital layout, or a print PDF at 300 DPI. Print PDFs have a centered TrimBox and ⅛ in bleed on every side. Print PDF export requires the selected crop to have at least 300 effective source PPI.
5. **Save local draft** keeps one active draft and its image in this browser or Android app. **Export editable project** includes the source, layout, rights notes and any private buyer details in an `.imag3` file. Open it in another Studio and review permissions again. Keep these editable files private.

| Format | Output |
| --- | --- |
| Square cover | 2400 × 2400 px |
| Vertical story | 1080 × 1920 px |
| Web banner | 2400 × 1000 px |
| Postcard | 6 × 4 in trim |
| Flyer | 8.5 × 11 in trim |
| Poster | 11 × 17 in trim |

The print format is a one-page raster RGB PDF. Confirm the printer's acceptance and color requirements before submitting it. Use the PNG export for a full-resolution raster that includes the bleed area when a print preset is selected.

## Make a licensing offer

Fill in the buyer, project context, intended usage and pitch. **Draft pitch** writes editable copy from the brief without an external service. Review it, then open the private offer desk.

- The Android phone host and the Studio served from the XXX!NK site can preattach a reduced proof. The receiving desk applies its own watermark when it creates the private offer.
- For a separately hosted desk, save the watermarked JPEG and attach it in the receiving editor.
- Review the offer and confirm permission again before creating its expiring link. Buyers can submit a request through that link. You can review the request and revoke access in the owner desk.
- On the hosted Studio, **Queue in XXX!NK archive** forwards a watermarked proof to the archive. Sign in as the owner first. Review visibility in archive admin. The archive can also accept supported images, PDFs, videos and text through its upload form.

The current Studio works on one source image per project. Provider account automation, contract execution, checkout and physical fulfillment are separate workflows.

## Build the Android APK from source

From the repository, run `bash Studio/assemble.sh`, then change to `studio-build/android-source/`. Use Android SDK platform 35, build-tools 35.0.0, JDK 17 or a compatible JDK, and your own signing key.

```bash
export ANDROID_SDK_ROOT=/path/to/android-sdk
export ARCHIVE_KEYSTORE=/path/to/your-keystore.p12
export ARCHIVE_APPLICATION_ID=studio.ellis.archivedesk.authoring
read -rs ARCHIVE_KEY_PASSWORD
export ARCHIVE_KEY_PASSWORD
bash android/build.sh iMAG3-Studio.apk
unset ARCHIVE_KEY_PASSWORD
```

Set `ARCHIVE_KEY_ALIAS` if the signing alias differs from `archive`. The Wide Net preview uses application ID `studio.ellis.archivedesk.authoring` and has separate storage from iMAG3 Next. For an in-place upgrade use the installed app’s application ID and signing identity. If you use a different signer, choose a new ID such as `studio.ellis.archivedesk.authoring.local` for a side-by-side install. Export supported records and editable projects before migration, and copy local media separately. Use the existing private host data and signing key when moving a PHP installation so active offer links can survive.
