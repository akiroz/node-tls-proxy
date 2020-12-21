const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');

const server = https.createServer({
    cert: fs.readFileSync("pki/server.pem"),
    key: fs.readFileSync("pki/server.key.pem"),
    ca: fs.readFileSync("pki/ca.pem"),
    requestCert: true,
});

const wss = new WebSocket.Server({ server });

wss.on("connection", ws => {
    ws.on("message", msg => {
        console.log("Message:", msg);
        ws.send(msg); // Echo message back to client
    });
});

server.listen(3200, () => {
    console.log("Websocket server started on port 3200");
});
