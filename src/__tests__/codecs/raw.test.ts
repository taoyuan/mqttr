import {RawCodec} from '../../codecs/raw';
import {expect} from '@tib/testlab';

describe('codec/raw', function () {
  it('encode', function () {
    const codec = new RawCodec();
    const decoded = codec.encode('foo');
    expect(decoded).equal('foo');
  });

  it('decode', function () {
    const codec = new RawCodec();
    const encoded = codec.decode('foo');
    expect(encoded).equal('foo');
  });
});
