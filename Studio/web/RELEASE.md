# iMAG3 Studio and XXX!NK webspace

- **Android-Source/** contains the same Studio dashboard and Android wrapper used for the supplied APK. See **Android-Source/README.md** for formats, workflow and build instructions.
- **xxxznx/public/** is the deployable XXX!NK site. The Authoring Studio is at **/studio/**. The licensing desk is at **/?license=owner** and archive administration is at **/?page=admin**.
- **IONOS-SETUP.md** explains deployment and preserving private data. For an existing installation, replace the contents of the public folder and keep the existing private data and signing key. Upload only the `xxxznx` deployment folder to hosting.

To run the site locally with PHP 8.1+ and GD and fileinfo enabled, start from the extracted package:

```bash
php -d upload_max_filesize=100M -d post_max_size=110M -S 127.0.0.1:8000 -t xxxznx/public
```

Open [Authoring Studio](http://127.0.0.1:8000/studio/#studio). Follow the password configuration in **IONOS-SETUP.md** to test the owner and buyer flows. For public use configure HTTPS and point the site document root to **xxxznx/public/**.
