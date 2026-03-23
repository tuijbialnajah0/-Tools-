const fetch = require('node-fetch');

async function testCobalt() {
  try {
    const res = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: 'https://twitter.com/elonmusk/status/1769866847842603222' })
    });
    const data = await res.json();
    console.log(data);
  } catch (e) {
    console.error(e);
  }
}

testCobalt();
