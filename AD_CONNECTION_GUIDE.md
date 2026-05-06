# AdSense & AdMob Connection Guide

This guide explains how to connect your real Google AdSense or AdMob account to your Proeng application and why test ads might not be appearing in the preview.

## 1. Connecting Your Account

To transition from test ads to your real account, you need to update a few values in the codebase:

### Step A: Update `src/constants/ads.ts`
Open `src/constants/ads.ts` and replace the placeholder values with your real IDs:

```typescript
export const AD_CONFIG = {
  // 1. Replace with your Publisher ID (found in AdSense/AdMob Settings)
  publisherId: 'ca-pub-XXXXXXXXXXXXXXXX', 
  
  // 2. Replace with your specific Ad Unit / Slot IDs
  slots: {
    banner: 'XXXXXXXXXX',
    rectangle: 'XXXXXXXXXX',
    sidebar: 'XXXXXXXXXX',
  },

  // 3. Set to false when you are ready to ship real ads
  testMode: false 
};
```

### Step B: Update `index.html`
Open `index.html` and update the `client` parameter in the script tag to match your Publisher ID:

```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
```

---

## 2. Why Test Ads Might Not Be Running

If you are using the default test IDs (`ca-pub-3940256099942544`) and don't see ads, here are the common reasons:

1. **Ad Blockers**: If you have an ad blocker browser extension active, the AdSense script is blocked entirely. Disable it for this site.
2. **Iframe Environment**: The AI Studio preview runs your app in an `iframe`. AdSense often refuses to load ads in cross-origin iframes for security and anti-fraud reasons.
3. **Localhost/Dev Domain**: AdSense requires the request to come from a verified or "live" domain. Test ads usually work on `localhost`, but can be flaky in cloud-based preview environments.
4. **Script Initialization**: Our implementation includes a "Loading" state. If you see "Initializing Ad..." forever, it means the script failed to find the `adsbygoogle` global object.

---

## 3. AdMob App ID (Native Apps)

You provided an AdMob App ID in a manifest format:
```xml
<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="..."/>
```
**Note:** This snippet is for **Native Android/iOS apps**. Since Proeng is a **Web Application**, there is no `AndroidManifest.xml`. You should use the **Publisher ID** (the `ca-pub-` part) in the `AD_CONFIG` and `index.html` instead.
