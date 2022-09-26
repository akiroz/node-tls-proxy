const net = require("net");
const tls = require("tls");
const http = require("http");
const websocket = require("websocket-stream");
const server = require("server");

let proxyConfig = null;

server({ port: 3000, security: false, session: false }, [
    ctx => server.reply.header("Access-Control-Allow-Origin", "*"),
    ctx => server.reply.header("Access-Control-Allow-Headers", "*"),
    ctx => ctx.method.toLowerCase() === 'options' ? 200 : false,
    server.router.post("/proxy-config", ({ data: { ca, cert, key, rejectUnauthorized, host, port } }) => {
        console.log(`POST /proxy-config ${host}:${port}`);
        if (typeof host !== "string") return 400;
        if (!Number.isInteger(port)) return 400;
        try {
            proxyConfig = {
                host, port,
                rejectUnauthorized: rejectUnauthorized !== false,
                secureContext: tls.createSecureContext({ ca, cert, key })
            };
        } catch (err) {
            return server.reply.status(400).json(err);
        }
        return 200;
    }),
    server.router.get("/proxy-test", async () => {
        console.log(`POST /proxy-test`);
        if (!proxyConfig) return 500;
        try {
            const conn = tls.connect(proxyConfig);
            await new Promise((resolve, reject) => {
                conn.once("error", reject);
                conn.once("secureConnect", resolve);
            });
        } catch (err) {
            return server.reply.status(500).json(err);
        }
        return 200;
    }),
]).then(() => {
    console.log("API server started on port 3000");
});

function connHandler(stream) {
    if (!proxyConfig) return stream.end();
    stream.pause();
    const proxySocket = tls.connect(proxyConfig);
    stream.once("error", () => proxySocket.end());
    proxySocket.once("error", () => stream.end());
    proxySocket.once("secureConnect", () => {
        stream.pipe(proxySocket);
        proxySocket.pipe(stream);
        stream.resume();
    });
}

const tcpServer = net.createServer();
const httpServer = http.createServer();
const wsServer = websocket.createServer({ perMessageDeflate: false, server: httpServer });

tcpServer.on("connection", connHandler);
wsServer.on("stream", connHandler);

tcpServer.listen(3100);
httpServer.listen(3200);
