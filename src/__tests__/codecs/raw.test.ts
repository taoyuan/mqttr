import {RawCodec} from '../../codecs/raw';

describe('codec/raw', function () {
  it('encode', function () {
    const codec = new RawCodec();
    const decoded = codec.encode('foo');
    expect(decoded).toEqual('foo');
  });

  it('decode', function () {
    const codec = new RawCodec();
    const encoded = codec.decode('foo');
    expect(encoded).toEqual('foo');
  });
});
