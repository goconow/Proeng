# APK Conversion Guide (Android)

> [!IMPORTANT]
> **CRITICAL ENVIRONMENT NOTE:** This process MUST be done on your **local computer** (Laptop/Desktop). You cannot run these commands in the AI Studio browser or on Vercel. You need **Android Studio** and **Node.js** installed on your machine.

## Prerequisites
1. **Node.js installed**: Download from [nodejs.org](https://nodejs.org/). If you get "Windows cannot find npx", it means Node.js is not installed or not in your PATH.
2. **Android Studio installed**: Required to actually build the APK file.
3. **Download your code**: Go to Settings > Download ZIP in AI Studio and extract it to your computer.

---

## Step 1: Install Capacitor
1. **Open a terminal** (PowerShell on Windows, or Terminal on Mac).
2. **Navigate to your project folder** (the one with `package.json`).
3. Run:
```bash
npm install @capacitor/core @capacitor/cli
```

## Step 2: Initialize Capacitor
Run this in the same terminal:
- **FIX FOR "cannot run init... Delete capacitor.config.ts":** If you see this error, simply delete that file from your folder and run the command below again.
- **IMPORTANT:** If you get an error that the package name is "already in use", change `com.proeng.app` to something unique like `com.suraj.proeng`.
```bash
npx cap init Proeng com.proeng.app --web-dir dist
```

### If you need to CHANGE your package name later:
If you already ran the commands and need to change the name because Google rejected it:
1. Open `capacitor.config.json` and change the `"appId"`.
2. **Delete** your `android` folder on your computer.
3. Run `npm run build` then `npx cap add android` again. 
4. This will recreate the folder with the new ID.

## Step 3: Build your Web App
```bash
npm install
npm run build
```

## Step 4: Create the Android Folder
This is the command that creates the `android` folder. 
**Wait!** Before you run this, you **MUST** ensure Step 3 finished successfully.
1. Check your project folder: Do you see a folder named `dist`? If not, run `npm run build` again.
2. Run these commands:
```bash
npm install @capacitor/android
npx cap add android
```

---

## Why is my "android" folder missing? (Checklist)

If you ran the commands but the `android` folder is not there, check these 3 things in your terminal:

1. **Missing "dist" folder**: Capacitor will refuse to create the android project if it can't find your web files. 
   - **Fix:** Run `npm run build`. You should see a `dist` folder appear.
2. **Capacitor not initialized**: Did you run `npx cap init`? 
   - **Fix:** If you see a file named `capacitor.config.ts`, you are good. If not, run `npx cap init`.
3. **Internal Errors**: Look at the terminal output. If it says "Platform android already exists", then it's already there (rare if you can't see it). If it says "Error: ...", copy that error.

---

## Step 5: Get your SHA-1 Key (Critical for Sign-In)
If Google Sign-In shows "Invalid Request" or fails on the APK, you **must** add your computer's "signature" (SHA-1) to Firebase.

### Method A: Using Android Studio (Easiest)
1. Open your project in **Android Studio**.
2. **If you don't see "signingReport":**
   - Click the **Gradle** tab on the far right.
   - Click the **Execute Gradle Task** icon (the small Elephant icon in the Gradle toolbar).
   - A small window pops up. Type: `signingReport` and press **Enter**.
   - **OR (The Settings way):**
     - Click **File > Settings** (on Mac: **Android Studio > Settings**).
     - Go to **Experimental**.
     - **Uncheck** "Do not build Gradle task list during Gradle sync".
     - Click **OK** and then click the **Sync Project with Gradle Files** icon (Elephant with a blue arrow) at the top.
3. Once the task runs, look at the **Run** window at the bottom. Scroll up until you see `Variant: debug`.
4. Copy the **SHA1** value.

### Method B: Using Command Prompt
1. **Open Command Prompt** in your project folder.
2. **Run these commands exactly**:
   ```cmd
   cd android
   gradlew signingReport
   ```
3. Look for **`Variant: debug`** and copy the **SHA1**.

---

## Step 6: Add Fingerprint to Firebase
The Firebase UI can be tricky. Follow this path exactly:

1. Open [Firebase Console](https://console.firebase.google.com/).
2. Select your project.
3. **IMPORTANT FIRST STEP:** Go to **Authentication** (left menu) > **Sign-in method**. 
   - Click **Add new provider** > **Google**.
   - **Enable** it, select your **Support email**, and click **Save**.
4. Now, click the **Gear icon (⚙️)** next to "Project Overview" and select **Project settings**.
5. Stay on the **General** tab.
6. Scroll down to the **"Your apps"** section.
6. Look for your Android app (The one with `com.proeng.app`).
7. **If you don't see an Android app:** Click **Add app** (the Android icon) and follow the prompts. Use package name: `com.proeng.app`.
8. Once selected, look for the **"SHA certificate fingerprints"** section. Click **Add fingerprint**.
9. Paste your **SHA-1** value and save.
10. **IMPORTANT:** Scroll back to the top of the **General** tab. Ensure you have a **"Support email"** selected. If it is empty, select your email and save.
11. **CRITICAL:** Scroll back up slightly and click the **google-services.json** button to download the LATEST version.
12. **Replace the old file**: Copy the new `google-services.json` and paste it into `android/app/` (overwrite the existing one).

## Step 7: Authorized Domains and Google Cloud (Auth Fix)
If you still get "Invalid Request" or "Action is invalid":

### A. The "Not Configured Yet" Fix (OAuth Consent Screen)
If Google Cloud says "Not configured yet" or if you get "Access denied":
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project at the top (Ensure it matches your Firebase Project ID: `gen-lang-client-0379443319`).
3. Go to **APIs & Services** > **OAuth consent screen**.
4. **If not created:** Select **External** and click **CREATE**.
5. Fill in the required fields:
   - **App name**: `ProEng`
   - **User support email**: Select your email.
   - **Developer contact information**: Type your email.
6. Click **SAVE AND CONTINUE** through the next few screens (Scopes, Test users) and click **BACK TO DASHBOARD** at the end.
7. **CRITICAL:** Look for the **"Publishing status"**. If it says "Testing", click the **"PUBLISH APP"** button. If you leave it in Testing, ONLY your email can log in.

### B. Add Capacitor Domains (CRITICAL)
1. In Firebase, go to **Authentication** (left sidebar) > **Settings** tab > **Authorized domains**.
2. Click **Add domain**.
3. **If it doesn't let you add `capacitor://localhost`**:
   - Just add **`localhost`**.
   - Ensure **`gen-lang-client-0379443319.firebaseapp.com`** and **`gen-lang-client-0379443319.web.app`** are also in the list.
4. **Why?** On Android, Capacitor usually identifies as `http://localhost`. On iOS, it uses `capacitor://localhost`. If the UI rejects the scheme, stick to `localhost`.
5. **Note:** Go to **Sign-in method** > **Google**. Ensure a **Support email** is selected in the settings there.

### C. The Google Cloud Console Fix (Create Clients)
If you see "No clients" or if auth fails:
1. In Google Cloud Console, go to **APIs & Services** > **Credentials**.
2. **Verify the SHA-1:** Click your "Android client ID". If it's missing, click **+ CREATE CREDENTIALS** > **OAuth client ID**.
   - Application type: **Android**.
   - Name: `Android Client (Release)`.
   - Package name: `com.proeng.app`.
   - SHA-1 fingerprint: Paste your SHA-1 from Step 5.
3. **Double Check SHA-1:** If you created a "Signed APK" using a `.jks` file, the SHA-1 will be DIFFERENT than the one from `gradlew signingReport`. You MUST get the SHA-1 from your keystore file if you use one.

### D. Update google-services.json (Again!)
Every time you change something in Google Cloud or Firebase:
1. Download the latest `google-services.json` from Firebase Project Settings.
2. Replace the one in `android/app/`.
3. Stop Android Studio, run `npx cap sync` in terminal.
4. **Clean Project** in Android Studio (Build > Clean Project) before building the APK again.

### E. Speech Recognition & Microphone Permissions
If speech recognition shows a **"network"** or **"not-allowed"** error in the APK:
1. Open `android/app/src/main/AndroidManifest.xml`.
2. Ensure these permissions are inside the `<manifest>` tag but outside the `<application>` tag:
   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   <uses-permission android:name="android.permission.RECORD_AUDIO" />
   <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
   ```
3. If using an emulator, ensure the emulator has **Google Play Services** and the **Google App** installed/updated, as the web speech API relies on them.

### F. Enable the Google Play Signing (If you uploaded to Play Store)
If your app works when you run it from your computer but fails after you download it from the Play Store:
1. Go to **Google Play Console** > **Setup** > **App integrity**.
2. Look for the **SHA-1 certificate fingerprint** under "App signing key certificate".
3. **Copy it** and add it to your Firebase Project Settings (Step 6) just like your debug SHA-1.

### E. Ensure Google People API is Enabled
1. In Google Cloud Console, go to **APIs & Services** > **Library**.
2. Search for **"Google People API"** and ensure it is **Enabled**.

## Step 8: Sync and Open
Once you've updated your Firebase fingerprints, support email, authorized domains, and the JSON file, run:
```bash
npx cap sync
npx cap open android
```
This will launch **Android Studio**.

---

## Step 9: Build the APK (Inside Android Studio)
1. In **Android Studio**, wait for the bottom progress bar ("Gradle Sync") to finish.
2. At the top menu, go to: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
3. Android Studio will spend a few minutes compiling.
4. When it finishes, a small "Build APK" notification pops up in the bottom right corner. Click **"locate"** to find your `app-debug.apk` file.

## Step 10: Fix Microphone Permissions
If you get "Microphone access denied" when clicking record in the app:

1. **Open your project folder** on your computer.
2. Go to: `android/app/src/main/AndroidManifest.xml`.
3. Open that file in a text editor (like Notepad or VS Code).
4. **Add these lines** inside the `<manifest>` tag, but **before** the `<application>` tag:
   ```xml
   <uses-permission android:name="android.permission.RECORD_AUDIO" />
   <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
   ```
5. **Rebuild the APK** in Android Studio (Step 9).
6. **Important:** When you open the app on your phone for the first time after this change, it should ask for permission. Click **"Allow"**.

---

## Troubleshooting common errors

### 9. Sign-in works in Emulator but fails in the APK
- **Cause:** You probably used the **Debug SHA-1** for the **Release APK**.
- **Fix:**
    1. If you created a "Signed APK" in Android Studio and used a "Key Store" (.jks file), you need the SHA-1 from THAT file.
    2. In Android Studio, go to the terminal and type:
       `keytool -list -v -keystore path/to/your/keystore.jks`
    3. Copy the SHA-1 from there and add it to Firebase Project Settings (Step 6).
    4. **Wait 5 minutes** for Google to sync before trying again.

### 10. "capacitor://localhost" still won't add
- **Fix:** If the Firebase UI rejects "capacitor://localhost", just ignore it for now and ensure **`localhost`** is added. Most Android versions work with just `localhost`.
- **Alternative:** Go to the [Google Cloud Console](https://console.cloud.google.com/) > **APIs & Services** > **Credentials**.
    1. Find your **"Web client (Auto-generated by Google Service)"**.
    2. Under **"Authorized JavaScript origins"**, try adding `http://localhost` and `https://localhost`.

### 5. "Windows cannot find the folder" (signingReport error)
- **Cause:** You are likely trying to run `./android/gradlew` which is a Mac/Linux command.
- **Fix:** In Windows, you must type `cd android` first, THEN type `gradlew signingReport`. If `gradlew` is not recognized, ensure you are actually inside the `android` folder.

### 6. "JAVA_HOME is not set"
- **Cause:** Your Windows environment variables are not configured to find Java.
- **Fix (The Easy Way):** Don't use the terminal!
    1. In **Android Studio**, click the **Gradle** tab on the far right.
    2. Click the **Elephant icon** (Execute Gradle Task).
    3. Type `signingReport` and press Enter.
- **Fix (The Professional Way):** 
    1. Search for "Edit the system environment variables" in your Windows taskbar.
    2. Click **Environment Variables**.
    3. Under **System Variables**, click **New**.
    4. Variable name: `JAVA_HOME`.
    5. Variable value: The path to your Android Studio Java folder (e.g., `C:\Program Files\Android\Android Studio\jbr`).
    6. Find the `Path` variable, click **Edit**, click **New**, and add `%JAVA_HOME%\bin`.
    7. **Restart** your Command Prompt.

### 7. "Using flatDir should be avoided..."
- **Cause:** This is a standard warning generated by Capacitor's internal settings.
- **Fix:** **Nothing.** You can safely ignore this. It will not stop your app from building or working.

---

## Technical Note on Full-Stack
Your `server.ts` contains Stripe logic. When running as an APK:
1. The Phone runs the **React frontend**.
2. The **Express backend** must be running on a cloud server (Vercel/Heroku/Render).
3. Update your frontend `fetch` calls to point to `https://your-vercel-app.vercel.app/api/...` instead of `/api/...`.
