// quick and dirty script

import { readFileSync, writeFileSync } from 'node:fs';

const files = ['model.js'];

const testRegex = /QUnit.test\(/;
const moduleRegex = /QUnit.module\('(.*)'/;

const header = `
import * as Backbone from 'nextbone'
import * as _ from 'lodash-es'
import {assert} from '@esm-bundle/chai'


`;

function transformFile(file) {
  const lines = readFileSync(`test/core/${file}`)
    .toString()
    .split('\r\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const moduleMatch = line.match(moduleRegex);
    if (moduleMatch) {
      lines[0] = `describe('${moduleMatch[1]}', function() {`;

      break;
    }
  }

  lines[lines.length - 2] = '})';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const testMatch = line.match(testRegex);
    if (testMatch) {
      let asyncIndex = i + 1;
      let isAsync = lines[asyncIndex].includes('assert.async');
      if (!isAsync) {
        asyncIndex++;
        isAsync = lines[asyncIndex].includes('assert.async');
      }

      let newLine = line.replace('QUnit.test', 'it');
      newLine = newLine.replace('function(assert)', `function(${isAsync ? 'done' : ''})`);

      lines[i] = newLine;
      if (isAsync) {
        lines[asyncIndex] = '';
      }

      continue;
    }

    if (line.includes('assert.expect')) {
      lines[i] = '';

      continue;
    }

    if (line.includes('QUnit.skip')) {
      lines[i] = line.replace('QUnit.skip', 'it.skip');

      continue;
    }

    if (line.includes('assert.ok')) {
      lines[i] = line.replace('assert.ok', 'assert.isOk');

      continue;
    }

    if (line.includes('assert.raises')) {
      lines[i] = line.replace('assert.raises', 'assert.throws');

      continue;
    }
  }

  writeFileSync('test/new-core/' + file, header + lines.join('\r\n'));
}

files.forEach(transformFile);
