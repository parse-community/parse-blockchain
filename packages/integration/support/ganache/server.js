// eslint-disable-next-line @typescript-eslint/no-var-requires
const ganache = require('ganache-cli');

const ganacheServer = ganache.server({
  network_id: '1000000000000',
  accounts: [
    {
      secretKey:
        '0x86ae9c6148520e120a7f01ad06346a3b455ca181e7300bcede8c290d9fbfddbb',
      balance: '0x100000000000000000000',
    },
  ],
  secure: true,
});
try {
  ganacheServer.listen(8545, (error) => {
    if (error) {
      console.error(error);
      process.exit(1);
    } else {
      process.send(true);
    }
  });
} catch (e) {
  console.error(e);
  process.exit(1);
}
