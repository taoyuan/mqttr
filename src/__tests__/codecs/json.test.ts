import {JsonCodec} from '../../codecs/json';
import {expect} from '@tib/testlab';

const sampleObject = {
  foundation: 'MQTTR',
  model: 'box',
  week: 45,
  transport: 'car',
  month: 7,
};
const sampleEncoded = '{"week":45,"month":7}';
const sampleDecoded = {week: 45, month: 7};

describe('codec/json', function () {
  it('encode', function () {
    const codec = new JsonCodec({
      replacer: (key, value) => {
        // screen (e.g., based on name or typeof value)
        if (typeof value === 'string') {
          return undefined;
        }
        return value;
      },
    });

    const encoded = codec.encode(sampleObject);
    expect(encoded).deepEqual(sampleEncoded);
  });

  it('decode', function () {
    const codec = new JsonCodec({
      reviver: (name, value) => {
        // screen (e.g., based on name or typeof value)
        if (typeof value === 'string') {
          return undefined;
        }
        // otherwise return value
        return value;
      },
    });

    let decoded = codec.decode(sampleEncoded);
    expect(decoded).deepEqual(sampleDecoded);

    decoded = codec.decode(Buffer.from(sampleEncoded));
    expect(decoded).deepEqual(sampleDecoded);
  });
});
