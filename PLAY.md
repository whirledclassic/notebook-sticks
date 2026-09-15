# How to run Notebook Sticks

You need Node.js 18 or newer. That is the only install.

```bash
git clone https://github.com/whirledclassic/notebook-sticks.git
cd notebook-sticks
chmod +x run.sh
./run.sh
```

Or:

```bash
npm install
npm start
```

Then open **http://localhost:3000** in a browser.

Open a second tab or another computer on the same network. Pick a name. Walk. Talk.

If the page loads but nobody else appears, they are on a different page. Use the page buttons.

Health check: http://localhost:3000/health

Change the port: `PORT=8080 ./run.sh`
