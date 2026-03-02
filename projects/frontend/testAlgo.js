const algosdk = require('algosdk');

const client = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '');
client.accountInformation('DEMO7XKLMNPQRST2UVWXYZ3ABCDEFGHIJKLMNO').do().then(console.log).catch(console.error);
