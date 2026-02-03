# Arbeitszeit Tracker (PWA + Google Sheets)

Eine installierbare Web-App für Android und PC, die Arbeitszeiten als Event-Log speichert, automatisch auswertet und eine Live-Ansicht in Excel ermöglicht.

## Features

- Event-Log mit Korrektur-Möglichkeit
- Arbeitsmodi inklusive Urlaub/Krank/Feiertag
- Tagesanteil (1.0 / 0.5) und Einsatzort (Büro/Kunde/Dienstreise)
- Offline-Queue mit Auto-Sync
- Google Sheets als Datenbank
- Excel Live-Ansicht über geschützte CSV-URL

## Arbeitsmodi

- pendeln
- buero_stempeln
- homeoffice
- urlaub
- ueberstundenabbau
- sonderurlaub
- krank
- feiertag

## Datenstruktur im Google Sheet

Blatt `events`
- event_id
- recorded_at
- event_date
- event_time
- event_type
- source
- note

Blatt `days`
- day_id
- date
- mode
- day_fraction
- work_place
- recorded_at
- source
- note

Blatt `summary`
- date
- mode
- day_fraction
- work_place
- depart_home
- arrive_work
- depart_work
- arrive_home
- work_start
- work_end
- commute_to
- work_duration
- commute_home

## Hosting (GitHub Pages)

1. Repository erstellen
2. Dateien hochladen
   - timetracker.html
   - manifest.json
   - service-worker.js
   - icon-192.png
   - icon-512.png
3. GitHub Pages aktivieren
   - Settings → Pages
   - Branch: main / root
4. App öffnen
   - https://DEIN-USERNAME.github.io/DEIN-REPO/timetracker.html

## Apps Script Setup

Siehe `QUICKSTART.md`.

## Excel Live-Ansicht

- Excel: Daten → Aus dem Web
- CSV-URL aus der App kopieren
- Aktualisieren, wenn neue Daten erscheinen

## Datenschutz

- Token schützt den Zugriff auf Apps Script
- Daten bleiben in deinem Google Account
- Keine externen Server
