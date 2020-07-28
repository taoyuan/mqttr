import {Router} from '../router';
import {expect} from '@tib/testlab';

describe('router', function () {
  describe('add', function () {
    it('should add a route', function () {
      const router = new Router();
      router.add('a/b/c', {foo: 'bar'});
      expect(router).lengthOf(1);
      expect(router.routes).lengthOf(1);
      expect(router.routes[0].path).equal('a/b/c');
      expect(router.routes[0].data).deepEqual({foo: 'bar'});
    });

    it('should throw error when adding a router with blank path', function () {
      const router = new Router();
      expect(() => router.add('')).throw(/can not be blank/);
    });
  });

  describe('remove', function () {
    it('should remove a route by plain path', function () {
      const router = new Router();
      router.add('a/b/c');
      expect(router.routes).lengthOf(1);
      router.remove('a/b/c');
      expect(router.routes).lengthOf(0);
    });

    it('should remove a route by regex path', function () {
      const router = new Router();
      router.add('a/b/c');
      expect(router.routes).lengthOf(1);
      router.remove(/a\/.*\/c/g);
      expect(router.routes).lengthOf(0);
    });

    it('should remove a route by regex path with char $', function () {
      const router = new Router();
      router.add('$a/b/c');
      expect(router.routes).lengthOf(1);
      router.remove(/\$a\/.*\/c/g);
      expect(router.routes).lengthOf(0);
    });

    it('should do nothing if not matched', function () {
      const router = new Router();
      router.add('a/b/c');
      expect(router.routes).lengthOf(1);
      router.remove('d/e/f');
      expect(router.routes).lengthOf(1);
    });

    it('should throw error when removing with blank path', function () {
      const router = new Router();
      expect(() => router.remove('')).throw(/can not be blank/);
    });
  });

  describe('match', function () {
    it('should match with char $', function () {
      const router = new Router();
      router.add('$a/:name/c');
      const matched = router.match('$a/b/c');
      expect(matched).ok();
      expect(matched?.params.name).equal('b');
    });
  });

  describe('path', function () {
    it('should ', function () {
      const router = new Router();
      router.add(':id?', {mode: 1});
    });
  });
});
