// scratch/test-circle-key.mjs
const clientKey = "TEST_CLIENT_KEY:8eafb8ce0550ac230cb87b4c97861211:bf92c4cf9cfd104a51c66b5c1295232e";
const clientUrl = "https://modular-sdk.circle.com/v1/rpc/w3s/buidl";

async function testCircle() {
  console.log("Testing Circle Modular Wallets API endpoint...");
  console.log("Key:", clientKey);
  console.log("URL:", clientUrl);

  const payload = {
    jsonrpc: "2.0",
    id: "1",
    method: "rp_getRegistrationOptions",
    params: [{ username: "testuser_123" }]
  };

  try {
    const res = await fetch(clientUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${clientKey}`,
        "X-AppInfo": "platform=web;version=1.0.13;uri=4cast-ebon.vercel.app"
      },
      body: JSON.stringify(payload)
    });

    console.log("HTTP Status:", res.status, res.statusText);
    const text = await res.text();
    console.log("Response Body:", text);
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

testCircle();
