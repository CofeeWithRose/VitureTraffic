const express = require("express");
const app = express();
app.use(express.static('./'));
app.listen(8080);
console.log('app start at http://localhost:8080/')