import {MsgpackCodec} from '../../codecs/msgpack';

class MyType {
  constructor(public size: number, public value: string) {}
}

function mytipeEncode(obj: MyType) {
  const buf = new Buffer(obj.size);
  buf.fill(obj.value);
  return buf;
}

function mytipeDecode(data: Buffer) {
  const result = new MyType(data.length, data.toString('utf8', 0, 1));
  let i: number;

  for (i = 0; i < data.length; i++) {
    if (data.readUInt8(0) !== data.readUInt8(i)) {
      throw new Error('should all be the same');
    }
  }

  return result;
}

describe('codec/msgpack', function () {
  const coders = {
    0x42: {
      clazz: MyType,
      encode: mytipeEncode,
      decode: mytipeDecode,
    },
  };

  const sampleObject = {hello: 'world'};
  const sampleEncoded = '81a568656c6c6fa5776f726c64';

  it('encode', function () {
    const codec = new MsgpackCodec({coders});
    const encoded = codec.encode(sampleObject).toString('hex');
    expect(encoded).toEqual(sampleEncoded);
  });

  it('decode', function () {
    const codec = new MsgpackCodec({coders});
    const decoded = codec.decode(sampleEncoded);
    expect(decoded).toEqual(sampleObject);
  });
});
