# MissionChief Station Status Timers (LSS-M v4.7)

A Tampermonkey user script for **MissionChief** (`missionchief.com`) and **Leitstellenspiel** (`leitstellenspiel.de`) that calculates, syncs, and displays real-time status badges, ETAs, elapsed mission times, and travel distances across all game frames and tabs.

---

## Features

* **Real-time ETA Countdown (Status 3):** Automatically captures travel times during dispatch and renders dynamic ETA countdowns alongside travel distances.
* **Elapsed Mission Timer (Status 4):** Tracks and displays total elapsed time once units arrive on scene.
* **Cross-Frame & Tab Sync:** Uses `localStorage` and Tampermonkey event listeners to sync unit statuses instantly across iFrames and open windows.
* **Visual Status Badges:** Displays distinct color-coded badges directly next to vehicle names:
* **Status 1 & 2:** In Service / In Station (*Green*)
* **Status 3:** En Route ETA & Distance (*Yellow*)
* **Status 4:** Mission Elapsed Time (*Red*)
* **Status 5:** Transport Needed (*Blinking Red*)
* **Status 6:** Out of Service (*Black*)
* **Status 7:** En Route to Hospital (*Orange*)



---

## Installation

1. Install a user script manager extension in your browser:
* [Tampermonkey](https://www.tampermonkey.net/) (Recommended)


2. Open your extension's dashboard and create a new script.
3. Paste the `MissionChief Station Status Timers` code into the editor.
4. Save the script and ensure it is enabled.

---

## How It Works

| Event | Logic |
| --- | --- |
| **Dispatch Click** | Intercepts click events on dispatch buttons, reads selected vehicle travel times and distances, and calculates arrival target timestamps. |
| **Status 3** | Displays the remaining countdown time (`mm:ss` or `hh:mm:ss`) and travel distance. |
| **Status 4** | Sets a scene-arrival timestamp and calculates elapsed mission duration. |
| **Status 1, 2, 5, 6, 7** | Displays designated status labels and automatically purges stored timer data for the vehicle. |
