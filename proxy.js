const net = require('net');
const tls = require('tls');
const server = require('server');

let proxyConfig = null;

const cors = [
  ctx => server.reply.header("Access-Control-Allow-Origin", "*"),
  ctx => server.reply.header("Access-Control-Allow-Headers", "*"),
  ctx => ctx.method.toLowerCase() === 'options' ? 200 : false
];

server({ port: 3000, security: false, session: false }, cors, [
    server.router.post("/proxy-config", ({ data: {
        ca, cert, key, rejectUnauthorized, 
        host, port,
    }}) => {
        console.log(`POST /proxy-config ${host}:${port}`);
        if(typeof host !== "string") return 400;
        if(!Number.isInteger(port)) return 400;
        try {
            proxyConfig = {
                host, port,
                rejectUnauthorized: rejectUnauthorized !== false
                secureContext: tls.createSecureContext({ ca, cert, key })
            };
        } catch(err) {
            return server.reply.status(400).json(err);
        }
        return 200;
    }),
    server.router.get("/proxy-test", async () => {
        console.log(`POST /proxy-test`);
        if(!proxyConfig) return 500;
        try {
            const conn = tls.connect(proxyConfig);
            await new Promise((resolve, reject) => {
                conn.once("error", reject);
                conn.once("secureConnect", resolve);
            });
        } catch(err) {
            return server.reply.status(500).json(err);
        }
        return 200;
    }),
]).then(() => {
    console.log("API server started on port 3000");
});

const proxyServer = net.createServer(tcpConn => {
    if(!proxyConfig) {
        tcpConn.end();
        return;
    }
    tcpConn.pause();
    const tlsConn = tls.connect(proxyConfig);
    tlsConn.once("error", () => tcpConn.end());
    tlsConn.once("secureConnect", () => {
        tcpConn.pipe(tlsConn);
        tlsConn.pipe(tcpConn);
        tcpConn.resume();
    });
}).listen(3100, () => {
    console.log("Proxy server started on port 3100");
});

