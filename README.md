# AppDev
Hosted pages for app beta testing and App Store submission requirements — privacy policies, TestFlight join pages — for every app in development. Deployed via GitHub Pages, so anything in here is a real, public URL the moment it's pushed to main.

Nothing here is source code. This repo holds static pages other people land on — beta testers, Apple's App Review, Instagram followers — not the apps themselves.

Structure
One folder per app. Every file inside is a self-contained static page: no build step, no dependencies, nothing to compile.

appdev/
├── chinahand/
│   ├── join.html      → invites testers into the TestFlight beta
│   ├── privacy.html   → the privacy policy Apple requires at submission
│   └── icon.png        → app icon, referenced by join.html
└── [next-app]/
    └── ...same pattern

Adding the next app
Copy the pattern, don't reinvent it:

New folder named after the app, lowercase, no spaces (sboogie/, not Sboogie App/)
join.html — copy chinahand/join.html, swap the icon, app name, tagline, and JOIN_CODE
privacy.html — copy chinahand/privacy.html, rewrite the data-practices sections to match what that app actually does. Don't just find-and- replace the app name — if the new app has a server, an account system, different IAP products, or any analytics China Hand doesn't have, the policy has to reflect that accurately. Apple checks the policy against the app's real behaviour, and so should you.
icon.png — a small web-sized export (a few hundred px) is enough; these pages don't need the full 1024px App Store master.
What does not belong in this repo

This repo is public. Never commit:
Signing certificates, provisioning profiles, or .p8/.p12 keys
App Store Connect API keys or App-Specific Passwords
Real user data of any kind, even for testing
Anything from an app's actual source tree — that belongs in that app's own (presumably private) repository. This one only holds the public-facing pages that sit outside the apps.
