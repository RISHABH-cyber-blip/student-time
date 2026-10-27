# Orbit — Student Schedule & Alarm App

A smart student companion app built with **Expo SDK 58, React Native 0.88, Expo Router, Supabase, and Google Gemini AI**.

---

## 🌟 Key Features

1. **Dashboard (`app/(tabs)/dashboard.tsx`)**:
   - Today's unified schedule: classes and tasks displayed chronologically with color tags.
   - Overdue tasks counter.
   - 7-day completion rate & rejection bar chart.
   - Streak detection and proactive workload suggestions.

2. **Timetable & AI OCR (`app/(tabs)/timetable.tsx`)**:
   - Photo upload of syllabus/college timetable — parsed instantly using Google Gemini vision OCR via Supabase Edge Function `parse-timetable`.
   - Automatic weekly recurring local alarms scheduled for every detected class.
   - Manual class entry with day selector, start/end time, and subject.
   - Individual alarm toggle switch per class.

3. **Smart Task Scheduler (`app/(tabs)/tasks.tsx`)**:
   - 3 tabs: **Today / Pending / Later**.
   - Automatic overdue task rollover on startup into free schedule slots.
   - Smart slot finder (`lib/scheduling.ts`) that squeezes tasks into free time or intelligently trims sleep time when packed.
   - Task action controls: **Shift** (new slot today), **Skip** (auto-scheduled for tomorrow), **Later** (parked), **Reject**, **Delete**, and **Restore**.
   - Individual notification alarm toggle switch.
   - Safe in-app scheduled alarm debugger.

4. **AI Assistant (`app/(tabs)/assistant.tsx`)**:
   - Embedded student AI coach connected to Supabase Edge Function `assistant`.
   - Full student context: profile goals, field of study, sleep/wake hours, today's classes, today's tasks, overdue tasks.

5. **True Native Background Alarms (`lib/notifications.ts`, `lib/resyncAlarms.ts`)**:
   - Powered by `expo-notifications` with maximum priority channel, sound, and vibration.
   - Safe dynamic import wrapper preventing crashes on Android in Expo Go.
   - Session startup alarm resync: clears obsolete alerts and reschedules all active classes and pending tasks.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Credentials (`app.json`)
Verify `app.json` contains your Supabase project URL and anon public key under `expo.extra`:
```json
"extra": {
  "supabaseUrl": "https://YOUR-PROJECT.supabase.co",
  "supabaseAnonKey": "your-anon-public-key"
}
```

### 3. Deploy Supabase Edge Functions (Optional if already live)
From inside this project directory:
```bash
supabase link --project-ref YOUR-PROJECT-REF
supabase secrets set GEMINI_API_KEY=your-gemini-key
supabase functions deploy parse-timetable
supabase functions deploy assistant
```

### 4. Run the Mobile App
```bash
npx expo start
```
- Press **`a`** to launch on Android emulator/device.
- Press **`i`** to launch on iOS simulator.
- Scan the QR code using the **Expo Go** app on your phone.
