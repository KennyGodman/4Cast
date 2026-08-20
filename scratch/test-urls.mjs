// scratch/test-urls.mjs
const clientKey = "TEST_CLIENT_KEY:9d9f088a2cefb8324fbc86f396cbaaae:e29f41905cfce5c5f0b9876ee8f6681a";

const urls = [
  "https://modular-sdk.circle.com/v1/rpc/w3s/buidl",
  "https://modular-sdk.circle.com/v1/w3s/buidl",
  "https://modular-sdk.circle.com/v1/rpc",
  "https://modular-sdk.circle.com/v1/rpc/buidl",
  "https://modular-sdk.circle.com/v1/buidl",
  "https://modular-sdk.circle.com/v1",
  "https://modular-sdk-staging.circle.com/v1/rpc/w3s/buidl"
];

async function testAll() {
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${clientKey}`,
          "X-AppInfo": "platform=web;version=1.0.13;uri=4cast-ebon.vercel.app"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          method: "rp_getRegistrationOptions",
          params: [{ username: "testuser" }]
        })
      });
      console.log(`URL: ${url} => Status ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.log(`   Response: ${text.slice(0, 150)}`);
    } catch (e) {
      console.log(`URL: ${url} => Error ${e.message}`);
    }
  }
}

testAll();
