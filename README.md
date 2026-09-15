# Notebook Sticks

A tiny multiplayer game. You are a stick figure on lined paper. Customize your doodle, walk around the notebook, and chat with whoever else opened the same page.

## Play

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in two browser tabs.

- **Move:** WASD or arrow keys
- **Chat:** Enter, type, Enter
- **Look:** pick ink color and a hat on the title page

## What it is

One shared notebook. No combat. No inventory. Just people standing on homework paper talking.

Hats: none, cap, bow, antenna, halo, horns.

## Deploy

Any host that can run Node 18+ and keep a WebSocket open. Set `PORT` if the host needs it.

```bash
PORT=8080 npm start
```
