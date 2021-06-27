import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chai, { expect } from 'chai';
import { defineAsyncMethods, asyncMethod } from '../../class-utils.js';

chai.use(sinonChai);

globalThis.chai = chai;
globalThis.sinon = sinon;
globalThis.expect = expect;
globalThis.defineAsyncMethods = defineAsyncMethods;
globalThis.asyncMethod = asyncMethod;
