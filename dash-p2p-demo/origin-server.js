// origin-server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = 9000;

app.use('/dash', express.static(path.join(__dirname, 'public/dash')));
app.listen(PORT, () =>
  console.log(`▶ Origin serving DASH at http://localhost:${PORT}/dash/`)
);
