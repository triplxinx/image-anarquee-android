# iMAG3 Studio and XXX!NK
`Studio/android/` is the Android app, `Studio/dashboard/` is the dashboard shared by Android and the browser, and `Studio/web/` is the XXX!NK PHP site. Change the dashboard here once and assemble both deliverables from the same commit.

Run `bash Studio/assemble.sh` to create `studio-build/android-source/` and `studio-build/web/`. Pass a new directory path as an argument for another build. The script checks the historical Next archive's checksum and extracts only the bundled brand media, OCR dependencies, NanoHTTPD and the raster color profile. The tracked Studio directories supply the application code. See [Android build and signing](ANDROID.md) and [web deployment](web/IONOS-SETUP.md). Generated output belongs outside source control.

The earlier native scaffold and Phone Host Next build are available in Git history. Studio includes Phone Host Next's host, scanner and workdesk, plus the authoring and Wide Net work. Remotive is available as a source link in Wide Net. Its earlier polling implementation was retired with the scaffold.

## Wide Net

Open **Wide Net** to review opportunities for photography and licensing, design, film and audio, editorial work, web projects, and exhibitions. Enter your own causes and aesthetic terms, browse the source directory, or run language-specific public web searches. Android's manual live sweep retrieves U.S. arts and humanities funding from Grants.gov, selected recent EU film/photography/graphic design tenders from TED, and dated arts calls from On the Move. Browser live sweep uses Grants.gov. Other directories and public web searches open in the browser.

Wide Net saves candidates locally. Open the organizer's listing and check the deadline, location, eligibility, application route, rights and payment before relying on it. A narrow eligibility or medium is a niche signal. Use the applicant-count field only when a source shows an actual count. The strict filter requires a checked organizer, dated review, published evidence URL and an observed count of 10 or fewer. Unmeasured competition stays unknown.

To scope work you could make from scratch, enter a production deadline, estimated hours and hours available by delivery. The estimate uses a 30% buffer rounded to the next half hour. The application deadline is independent. Send promising briefs into Workdesk for review, drafting and Studio handoff.

This release uses bounded, user-initiated searches. It does not mark candidates verified on discovery, apply or send messages. The browser provides broader discovery through search links, with manual review and capture of their results.
