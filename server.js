// İMAN POWER AI — güvenli Mistral proxy
// Node.js 18+
// Kullanım:
//   set MISTRAL_API_KEY=YENI_ANAHTARINIZ   (Windows CMD)
//   $env:MISTRAL_API_KEY="YENI_ANAHTARINIZ" (PowerShell)
//   node server.js
//
// HTML dosyanızı bu sunucunun public klasöründe/aynı origin'de yayınlayın.
// API anahtarını HTML içine koymayın.

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.MISTRAL_API_KEY || "";
const PUBLIC_DIR = __dirname;

const MIME = {
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".png":"image/png",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".svg":"image/svg+xml"
};

function send(res, code, body, type="text/plain; charset=utf-8") {
  res.writeHead(code, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin":"*",
      "Access-Control-Allow-Headers":"Content-Type, Authorization",
      "Access-Control-Allow-Methods":"POST, GET, OPTIONS"
    });
    return res.end();
  }

  if (req.method === "POST" && req.url === "/api/mistral") {
    if (!API_KEY) return send(res, 500, JSON.stringify({message:"MISTRAL_API_KEY sunucuda tanımlı değil."}), "application/json; charset=utf-8");

    let body = "";
    req.setEncoding("utf8");
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 35 * 1024 * 1024) req.destroy();
    });

    req.on("end", async () => {
      try {
        const upstream = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            "Authorization":`Bearer ${API_KEY}`
          },
          body
        });

        res.writeHead(upstream.status, {
          "Content-Type": upstream.headers.get("content-type") || "text/event-stream; charset=utf-8",
          "Cache-Control":"no-cache, no-store, must-revalidate",
          "Connection":"keep-alive",
          "Access-Control-Allow-Origin":"*"
        });

        if (!upstream.body) return res.end();

        const reader = upstream.body.getReader();
        while (true) {
          const {done, value} = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
        res.end();
      } catch (err) {
        if (!res.headersSent) {
          send(res, 502, JSON.stringify({message:"Mistral bağlantısı kurulamadı: " + err.message}), "application/json; charset=utf-8");
        } else {
          res.end();
        }
      }
    });
    return;
  }

  // Basit statik dosya sunucusu
  let reqPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (reqPath === "/") reqPath = "/iman-power-v11-duzeltilmis.html";

  const safePath = path.normalize(path.join(PUBLIC_DIR, reqPath));
  if (!safePath.startsWith(PUBLIC_DIR)) return send(res, 403, "Forbidden");

  fs.readFile(safePath, (err, data) => {
    if (err) return send(res, 404, "Not found");
    const ext = path.extname(safePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control":"no-store"
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`İman Power AI: http://localhost:${PORT}`);
});
