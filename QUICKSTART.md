# Quick Start – Google Apps Script + Google Sheets

## Schritt 1: Neues Google Sheet anlegen

1. Google Drive öffnen
2. Neu → Google Tabellen
3. Name vergeben, z. B. "Arbeitszeiten"

## Schritt 2: Apps Script einfügen

1. Im Sheet: Erweiterungen → Apps Script
2. Standard-Code löschen
3. Inhalt aus `Code.gs` einfügen
4. In `Code.gs` ein Token setzen
   - `const API_TOKEN = 'DEIN_GEHEIMES_TOKEN';`
5. Speichern

Hinweis: Beim ersten Start werden die Blätter `events`, `days` und `summary` erstellt. Bestehende Daten in diesen Blättern werden überschrieben, falls die Header nicht passen.

## Schritt 3: Apps Script bereitstellen

1. Bereitstellen → Neue Bereitstellung
2. Typ: Web-App
3. Ausführen als: Ich
4. Zugriff: Jeder
5. Bereitstellen
6. Web-App-URL kopieren (muss mit `/exec` enden)

## Schritt 4: App konfigurieren

1. `timetracker.html` öffnen (GitHub Pages URL)
2. Apps Script URL eintragen
3. Token eintragen
4. Verbindung testen & speichern

## Schritt 5: Excel Live-Ansicht

1. App öffnen
2. "CSV-Link für Excel kopieren"
3. Excel → Daten → Aus dem Web
4. Link einfügen
5. Aktualisieren, wenn neue Einträge vorhanden sind
