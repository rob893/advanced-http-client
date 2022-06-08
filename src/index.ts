import { AdvancedHttpClient } from './AdvancedHttpClient';
import { wait } from './utilities';

async function main(): Promise<void> {
  const client = new AdvancedHttpClient({ baseURL: 'https://rwherber.com/wow-market-watcher/api/v1' });
  const p1 = client.get('test?status=200&delay=1000');
  const p2 = client.get('test?status=200&delay=1000');

  console.log(p1 === p2);

  const { data } = await p1;
  const { data: d2 } = await p2;

  console.log(data);
  console.log(d2);

  await wait(1000);

  const { data: d3 } = await client.get('test?status=200&delay=1000');
  console.log(d3);
}

main()
  .then(() => {
    console.log('Complete');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
