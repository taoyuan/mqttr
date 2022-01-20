import net from 'net';
import {Aedes} from 'aedes';
import * as s from './support';
import {connect} from '../connect';

describe('connect', function () {
  let aedes: Aedes;
  let server: net.Server;
  let port: number;

  let url: string;

  beforeAll(async function () {
    [aedes, server, port] = await s.createMQTTServer();
    url = `mqtt://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await s.close(aedes, server);
  });

  it('should connect with string url', async function () {
    const client = connect(url);
    await client.ready();
    await client.end(true);
  });

  it('should connect with options only', async function () {
    const client = connect({port});
    await client.ready();
    await client.end(true);
  });
});
