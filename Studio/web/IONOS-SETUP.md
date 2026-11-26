# Set up xxxznx.3xink.com on IONOS

This package is for IONOS Linux Web Hosting with PHP 8.1 or later, sessions, fileinfo and GD with JPEG, PNG and WebP support. Use an active HTTPS certificate that covers `xxxznx.3xink.com`.

1. In **Hosting → Webspace**, upload the `xxxznx` folder from this ZIP with both `public` and `private` intact. You can also upload using SFTP. Keep the two folders as siblings. Put only the public folder under the subdomain's document root. If another domain in the same contract serves the webspace root, choose a hosting layout where `xxxznx/private` is outside every served document root. Retain the private folder's access-denial file as a second layer.
2. In **Domains & SSL**, create the subdomain named `xxxznx` under `3xink.com` if needed. Open the **subdomain's** destination settings. Connect it to the `/xxxznx/public` webspace directory. Use the actual folder path if you uploaded it under another directory.
3. Enable or confirm SSL coverage for that subdomain, then configure the admin password. An existing `XXXINK_PASSWORD_HASH` environment setting takes precedence. Otherwise generate an admin password hash privately, then upload only its single line to `xxxznx/private/admin-password.hash`. The server can read that file, and it belongs outside the public directory. Never upload a plaintext password.

If using SSH with a PHP CLI and Bash, run the following from the uploaded `xxxznx` directory. The password is read without showing it and stays out of the command line and shell history.

```bash
umask 077
IFS= read -r -s -p 'New XXX!NK admin password: ' XXXINK_NEW_PASSWORD
printf '\n'
if [[ -n "$XXXINK_NEW_PASSWORD" ]]; then
  printf '%s' "$XXXINK_NEW_PASSWORD" | php -r 'echo password_hash(stream_get_contents(STDIN), PASSWORD_DEFAULT), PHP_EOL;' > private/admin-password.hash
fi
unset XXXINK_NEW_PASSWORD
```

4. Visit [XXX!NK](https://xxxznx.3xink.com/), [the owner licensing desk](https://xxxznx.3xink.com/?license=owner), and [the buyer entry](https://xxxznx.3xink.com/?license). Create a sample offer with a rights-cleared test image. In a separate browser session, open the link and submit a test request. Confirm it appears in the owner inbox. Revoke the link and verify the test buyer can no longer load it.
5. Open [Authoring Studio](https://xxxznx.3xink.com/studio/#studio) in the browser to compose, attach proofs and queue images for archive review. In the Android APK, use **Systems → Licensing website** to set the same base address. The Android phone host can accept proofs directly. If you route Android offers to the hosted website, save a proof JPEG in Studio and attach it there.

Keep a private backup of the data directory, including `license-offers/signing.key` once generated. With the files and signing key intact, offers can survive a server migration. Existing archive data can be retained with the existing private directory and same configured `XXXINK_DATA`.

IONOS references

- [Create a subdomain](https://www.ionos.com/help/domains/using-subdomains-with-your-website/creating-a-subdomain/)
- [Connect it to a webspace directory](https://www.ionos.com/help/domains/connecting-a-domain-to-your-webspace/connecting-a-domain-to-a-webspace-directory/)
- [Manage SSL certificates](https://www.ionos.com/help/ssl-certificates/setting-up-user-managed-ssl-certificates/managing-ssl-certificates-in-your-ionos-account/)
