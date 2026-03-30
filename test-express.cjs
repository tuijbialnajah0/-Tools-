const express = require("express");
const app = express();
app.get('*all', (req, res) => res.send("ok"));
const request = require("http").request;
const server = app.listen(3001, () => {
  const req = request("http://localhost:3001/", res => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => {
      console.log("Response:", res.statusCode, data);
      server.close();
    });
  });
  req.end();
});
