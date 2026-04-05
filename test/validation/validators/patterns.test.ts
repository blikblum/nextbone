import { beforeEach, describe, it } from 'vitest';

import { Validation, assert, refute } from '../vitest-globals.js';

describe('Backbone.Validation patterns', () => {
  let invalid: (value: string) => void;
  let valid: (value: string) => void;
  let pattern: RegExp;

  beforeEach(() => {
    valid = (value: string) => {
      assert(value.match(pattern), `${value} should be valid`);
    };

    invalid = (value: string) => {
      refute(value.match(pattern), `${value} should be invalid`);
    };
  });

  it('email pattern matches all valid email addresses', () => {
    pattern = Validation.patterns.email;

    valid('name@example.com');
    valid('name@example.com');
    valid('name+@example.co');
    valid('n@e.co');
    valid('first.last@backbone.example.com');
    valid('(unsual)[very]@strange.example.com');
    valid('x@example.com');

    invalid('name');
    invalid('name@');
    invalid('name@example');
    invalid('name.@example.c');
    invalid('name,@example.c');
    invalid('name;@example.c');
    invalid('name@example.com.');
    invalid('Abc.example.com');
    invalid('a"b(c)d,e:f;g<h>i[jk]l@example.com');
    invalid('just"not"right@example.com');
  });

  it('email pattern is case insensitive', () => {
    pattern = Validation.patterns.email;

    valid('NaMe@example.COM');
    valid('NAME@EXAMPLE.COM');
  });

  it('url pattern matches all valid urls', () => {
    pattern = Validation.patterns.url;

    valid('http://thedersen.com');
    valid('http://www.thedersen.com/');
    valid('http://øya.no/');
    valid('http://öya.no/');
    valid('https://thedersen.com/');
    valid('http://thedersen.com/backbone.validation/?query=string');
    valid('ftp://thedersen.com');
    valid('http://127.0.0.1');

    invalid('thedersen.com');
    invalid('http://thedersen');
    invalid('http://thedersen.');
    invalid('http://thedersen,com');
    invalid('http://thedersen;com');
    invalid('http://.thedersen.com');
    invalid('http://127.0.0.1.');
  });

  it('url pattern is case insensitive', () => {
    pattern = Validation.patterns.url;

    valid('http://Thedersen.com');
    valid('HTTP://THEDERSEN.COM');
  });

  it('number pattern matches all numbers, including decimal numbers', () => {
    pattern = Validation.patterns.number;

    valid('123');
    valid('-123');
    valid('123,000');
    valid('-123,000');
    valid('123.45');
    valid('-123.45');
    valid('123,000.45');
    valid('-123,000.45');
    valid('123,000.00');
    valid('-123,000.00');
    valid('.10');
    valid('123.');

    invalid('abc');
    invalid('abc123');
    invalid('123abc');
    invalid('123.000,00');
    invalid('123.0.0,00');
  });

  it('digits pattern matches single or multiple digits', () => {
    pattern = Validation.patterns.digits;

    valid('1');
    valid('123');

    invalid('a');
    invalid('a123');
    invalid('123a');
  });
});
