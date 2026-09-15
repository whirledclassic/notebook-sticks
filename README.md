# Notebook Sticks

A shared sheet of paper. Everyone is a stick figure. You walk around, sit, wave, change your doodle, and talk.

## Play

```bash
npm install
npm start
```

Open http://localhost:3000 in two tabs or two phones on the same Wi-Fi.

| Input | What |
| --- | --- |
| WASD / arrows | Walk |
| Touch left side | Virtual stick |
| Enter | Chat |
| E | Wave |
| C | Sit |
| L | Change ink / hat |

Vanilla canvas + one Node WebSocket server. Other players are interpolated. The notebook is cached on an offscreen canvas.

Hats: none, cap, bow, antenna, halo, horns, flower, crown. Cap 40 people.
