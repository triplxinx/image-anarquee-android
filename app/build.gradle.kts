plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android { namespace = "com.triplxinx.imageanarquee"; compileSdk = 35; defaultConfig { applicationId = "com.triplxinx.imageanarquee"; minSdk = 26; targetSdk = 35; versionCode = 2; versionName = "0.2.0" } }
dependencies { implementation("androidx.work:work-runtime-ktx:2.9.1") }
