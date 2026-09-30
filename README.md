# Traveler

Notizen (mit Checklisten), Bilder und Dokumente – synchron zwischen iPhone und Windows-PC.
Optik: Reisetagebuch im Stil des Travelers aus Destiny (eigene Grafik, keine Originalassets).

## Was drin ist
- Notizen mit Überschriften, Listen, **Checklisten**, Tags und Suche
- Verschachtelte Ordner
- Upload von Fotos (Galerie/Kamera), PDFs, Word/Excel und beliebigen Dateien
- Offline schreiben – Abgleich, sobald wieder Internet da ist (Datei-Uploads brauchen Internet)
- **Aufräumen**: große, selten geöffnete Dateien finden und löschen
- Speicher & Login: Supabase (Projekt „richia“, Tabellen `traveler_*`, privater Bucket `traveler-files`)

## Entwickeln
```bash
npm install
npm run web          # im Browser testen
npm run desktop      # Windows/Desktop-Fenster (Electron)
npm run typecheck
```

## Windows-Installer (.exe)
GitHub → Reiter **Actions** → „Windows-Installer bauen“ → **Run workflow**.
Nach ein paar Minuten die Datei unter „Artifacts“ herunterladen und installieren.

## iPhone (TestFlight)
Ohne Mac, der Build läuft in der Expo-Cloud:
```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --latest
```
Beim ersten Build fragt EAS nach deiner Apple-ID und legt Zertifikate selbst an.
Danach erscheint die App in App Store Connect → TestFlight.
Die Bundle-ID steht in `app.json` (`com.traveler.app`) – muss weltweit einmalig sein, ggf. ändern.
