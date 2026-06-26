# VibraLab-Mobile — ResoScope

Eine mobile **PWA**, die dein Smartphone (gebaut für das **Samsung S23 Ultra**) in ein
**Resonanz-Messgerät** verwandelt. Du regst ein physisches Objekt (z.B. eine
Miniatur-Brücke) mit einem Ton an, misst die Vibrations- bzw. Audio-Antwort und lässt per
**FFT** die **Resonanzfrequenz** und den **Q-Faktor** (Güte) automatisch bestimmen.

Das ist angewandte Strukturdynamik / Modalanalyse im Kleinformat — kein Voodoo.

> **Status:** Phase 1–4 + 8 + Visual-Upgrade (Phase 5). Generator, Sensor-Monitor,
> FFT-/Resonanz-Erkennung, automatischer Sweep mit CSV-Export und der Tap-/Ping-Test
> sind fertig — jetzt mit Premium-Dark-UI (Glas, animiertes Logo, Motion).

**Live:** https://vibra-lab-mobile.vercel.app/

## Features

- **Generator** — Tongenerator 10–2000 Hz, Amplitude, Wellenform (Sinus/Rechteck/Dreieck/Sägezahn), Play/Stop. (Web Audio API)
- **Sensor** — Live-Graph der Akzelerometer-Achsen X/Y/Z in Echtzeit + Peak-Tracking. (DeviceMotion)
- **Analyzer** — FFT-Spektrum mit automatischem Resonanz-Marker, Q-Faktor und Pegel. Zwei umschaltbare Quellen:
  - 🎤 **Mikrofon** — voller Audio-Bereich, FFT nativ über die Web Audio `AnalyserNode`.
  - 📳 **Akzelerometer** — Tieffrequenz-Vibration (eigene gefensterte FFT).
- **Sweep** — automatischer **swept-sine**: fährt einen Frequenzbereich mit einstellbarer
  Geschwindigkeit (Hz/s) ab, misst die Antwort und plottet die **Amplituden-Response-Kurve**.
  Der höchste Punkt = Resonanzfrequenz, inkl. **Q-Faktor** und **CSV-Export** der Messpunkte.
- **Tap** *(Phase 8)* — **„Handy einfach drauflegen"**: Tap-/Ping-Test (Modalanalyse). Handy
  flach aufs Objekt legen, antippen (oder Selbst-Anregung per Vibrationsmotor) → die App
  erfasst das **Ausschwingen (Ringdown)** und bestimmt **Resonanzfrequenz, Q-Faktor und
  Ausschwingzeit** — getrennt für 📳 Struktur (Akzelerometer, ≤~30 Hz) und 🎤 Klang (Mikrofon).

## Wichtig: physikalische Grenzen (ehrlich)

Das Handy-Akzelerometer (`DeviceMotionEvent`) liefert auf Android-Chrome nur **~60
Messungen/Sekunde**. Nach dem **Nyquist-Theorem** lassen sich damit nur Resonanzen **bis
~30 Hz** erkennen. Für höhere Frequenzen ist das **Mikrofon** die richtige Quelle (bis
~20 kHz). Die App zeigt die jeweils gültige Frequenzgrenze direkt in der UI an, statt
vorzugaukeln, das Akzelerometer könne 500 Hz messen.

## Setup

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # Production-Build nach dist/
```

`vite.config.js` setzt `server.host = true`, du kannst die App also auch direkt vom Handy
im selben WLAN unter `http://<LAN-IP>:5173` öffnen.

> **HTTPS ist Pflicht** für Mikrofon- und Sensor-Zugriff am Handy. Über `http://localhost`
> am Desktop geht es, aber für echte Messungen am S23 Ultra die App über die
> **HTTPS-Deployment-URL** (Vercel) öffnen.

## Bedienung

1. **Generator** öffnen, Frequenz wählen, **Play** — Handy-Lautsprecher ans Objekt halten.
2. **Analyzer** öffnen, Quelle wählen (Mikrofon für Audio, Akzelerometer für tiefe Vibration), Zugriff erlauben.
3. Das **FFT-Spektrum** zeigt den Peak; der orange Marker + die Anzeige unten nennen
   **Resonanzfrequenz**, **Q-Faktor** und **Pegel**.

### Schnelltest ohne externe Hardware
Generator auf z.B. **50 Hz** stellen und abspielen, im Analyzer die **Mikrofon**-Quelle
aktivieren → der Peak muss bei ~50 Hz erscheinen. Das validiert die ganze
Audio → FFT → Peak-Kette.

## Tech-Stack

Vite · React · Tailwind CSS · Web Audio API · DeviceMotion API · `fft.js` · Canvas-2D
(Echtzeit-Graphen). Deployment: Vercel.

## Projektstruktur

```
src/
├── App.jsx                 # Tab-Layout: Generator | Sensor | Analyzer
├── components/
│   ├── FrequencyGenerator.jsx
│   ├── SensorMonitor.jsx
│   ├── FFTAnalyzer.jsx
│   ├── ResonanceResult.jsx
│   ├── SourceToggle.jsx
│   ├── PermissionGate.jsx
│   └── charts/{LineChart,SpectrumChart}.jsx
├── hooks/
│   ├── useWebAudio.js      # Tongenerator
│   ├── useSensorData.js    # Akzelerometer + Ring-Buffer
│   ├── useMicrophone.js    # Mikrofon + AnalyserNode-FFT
│   └── useFFT.js           # FFT über Akzelerometer-Puffer
└── utils/{peakDetector,windowing,format}.js
```

## Bedienung — Sweep (Phase 4)

1. **Sweep**-Tab öffnen, Quelle wählen (Mikrofon oder Akzelerometer) und Zugriff erlauben.
2. Start-/End-Frequenz und Geschwindigkeit einstellen (langsamer = genauer).
3. Handy mit dem Lautsprecher ans Objekt halten, **Sweep starten**.
4. Die App fährt die Frequenzen ab und zeichnet die **Response-Kurve**; der orange Marker
   nennt die **Resonanzfrequenz**, darunter **Q-Faktor** und **Pegel**.
5. **CSV exportieren** speichert alle Messpunkte (Frequenz, Amplitude) inkl. Metadaten.

> Bei der Akzelerometer-Quelle wird die End-Frequenz automatisch auf die Nyquist-Grenze
> (~30 Hz) begrenzt — für höhere Bereiche das Mikrofon nutzen.

## Bedienung — Tap-Test (Phase 8)

1. **Tap**-Tab öffnen, Akzelerometer-Zugriff erlauben (optional Mikrofon mitnutzen).
2. Handy **flach auf das Objekt** legen.
3. **„Auf Objekt legen & messen"** drücken, dann das Objekt kurz **antippen**
   (oder *Selbst-Anregung* aktivieren). Bei Selbst-Anregung wählbar:
   - 🔊 **Lautsprecher** *(Standard, empfohlen)* — kurzer Klick regt das Objekt an,
     **unabhängig vom Vibrationsmotor**.
   - 📳 **Vibration** — nutzt `navigator.vibrate`; auf Android (v.a. Samsung) im
     Lautlos-/Energiesparmodus oft vom System blockiert.
4. Die App erkennt den Anstoß automatisch, misst das Ausschwingen und zeigt
   **Resonanzfrequenz, Q-Faktor und Ausschwingzeit** — strukturell und akustisch.

> Steife/kleine Objekte klingen oft im hörbaren Bereich → das **Mikrofon**-Ergebnis ist dann
> aussagekräftiger als das Akzelerometer (das durch Nyquist auf ~30 Hz begrenzt ist).

## Design

Premium-Dark im Instrument-Stil (angelehnt an Apple/Tesla/Samsung): tiefes Near-Black,
**Cyan→Emerald-Signatur-Gradient**, **Glasmorphismus**-Cards, **animiertes Wellenform-Logo**,
weiche **Motion**-Übergänge (Framer Motion) und Microinteractions. Live-Daten-Canvases bleiben
bewusst frei von Deko-Animationen (Messqualität/60 FPS gehen vor). `prefers-reduced-motion`
wird respektiert.

## Mess-History

Sweep- und Tap-Ergebnisse lassen sich mit **★ Speichern** benennen und im **Verlauf**
(Uhr-Icon oben rechts) festhalten — persistent via `localStorage`, mit Frequenz, Q-Faktor,
Quelle und Zeitstempel; einzeln oder komplett löschbar.

## Roadmap (nächste Iterationen)

- **Phase 6** — JSON/PNG-Export + GitHub-Actions-Deploy
- **Settings** — FFT-Größe, Samplerate, Schwellwerte einstellbar
- **Phase 7** — Multi-Objekt-Vergleich (Dämpfungs-/Decay-Analyse ist mit Phase 8 grundgelegt)
