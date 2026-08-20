// scratch/test-headers.mjs
const clientKey = "TEST_CLIENT_KEY:9d9f088a2cefb8324fbc86f396cbaaae:e29f41905cfce5c5f0b9876ee8f6681a";
const clientUrl = "https://modular-sdk.circle.com/v1/rpc/w3s/buidl";

const headerOptions = [
  { "Authorization": `Bearer ${clientKey}` },
  { "Authorization": clientKey },
  { "X-API-Key": clientKey },
  { "X-Client-Key": clientKey },
  { "Authorization": `Bearer ${clientKey}`, "X-AppInfo": "platform=web;version=1.0.13;uri=4cast-ebon.vercel.app" },
  { "Authorization": `Bearer ${clientKey}`, "X-AppInfo": "platform=web;version=1.0.13;uri=localhost" }
];

async function testHeaders() {
  for (let i = 0; i < headerOptions.length; i++) {
    const headers = { "Content-Type": "application/json", ...headerOptions[i] };
    try {
      const res = await fetch(clientUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          method: "rp_getRegistrationOptions",
          params: [{ username: "testuser" }]
        })
      });
      const text = await res.text();
      console.log(`Option ${i+1}: Status ${res.status} => ${text}`);
    } catch (e) {
      console.log(`Option ${i+1}: Error ${e.message}`);
    }
  }
}

testHeaders();
