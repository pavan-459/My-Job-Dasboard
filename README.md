# Job Tracker Dashboard (Personal Project)

## Overview
A personal job application tracker built with **React + Vite** and a handcrafted Gen Z x Red Bull UI. It keeps tabs on every submission while staying lightweight and offline-friendly.

---

## Features
- Google Sign-In (restricted to your own Google account)
- Add, edit, delete job applications
- Status filtering (Applied, Interviewing, Offer, Rejected)
- Full-text search across company / role / notes
- Sorting by date or company
- LocalStorage persistence scoped to your Google email
- Import/Export to JSON or CSV

---

## Tech Stack
- React (Vite)
- Google Identity Services (OAuth 2.0)
- Custom CSS design system
- LocalStorage for persistence

---

## Authentication Setup
1. **Create a Google OAuth Client**
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Create (or select) a project → APIs & Services → Credentials → Create Credentials → *OAuth client ID*
   - Choose **Web application** and add the following 
     - Authorized JavaScript origin: `http://localhost:5173`
     - Authorized redirect URI: leave blank (Google Identity Services uses postMessage)
   - Copy the generated *Client ID*
2. **Configure environment variables**
   - Create a `.env.local` file in the project root with:
     ```env
     VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
     VITE_ALLOWED_EMAIL=you@example.com
     ```
   - `VITE_ALLOWED_EMAIL` should match the only Google account that should be able to sign in.
3. **Run the app**
   ```bash
   npm install
   npm run dev
   ```
   The tracker will prompt you to sign in with Google before showing application data.

> Local data is stored in `localStorage` using a key that includes your Google email, so your entries stay isolated per account.

---

## Development Scripts
```bash
npm install    # install dependencies
npm run dev    # start Vite dev server
npm run build  # production build
```
