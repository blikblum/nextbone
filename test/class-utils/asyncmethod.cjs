describe('asyncMethod', function() {
  let fooStub;
  let barSpy;
  let startSpy;
  let errorSpy;
  let myService;

  beforeEach(function() {
    fooStub = sinon.stub();
    barSpy = sinon.spy();
    startSpy = sinon.spy();
    errorSpy = sinon.spy();
    class MyService {
      start() {
        startSpy.call(this);
      }

      @asyncMethod
      foo(...args) {
        fooStub.apply(this, args);
      }

      @asyncMethod
      bar(...args) {
        barSpy.apply(this, args);
        return 'x';
      }

      onError(e) {
        errorSpy.call(this, e);
      }
    }

    myService = new MyService();
  });

  it('should return a promise', function() {
    expect(myService.foo()).to.be.instanceOf(Promise);
  });

  it('should resolve the promise with the value returned by the method', function() {
    return myService.bar().then(result => {
      expect(result).to.equal('x');
    });
  });

  it('should call original method', function() {
    return myService.foo(1, 'a').then(() => {
      expect(fooStub).to.have.been.calledOnce;
      expect(fooStub).to.have.been.calledWith(1, 'a');
      expect(fooStub).to.have.been.calledOn(myService);
    });
  });

  it('should call start() before calling the function', function() {
    return myService.foo().then(() => {
      expect(startSpy).to.have.been.calledBefore(fooStub);
    });
  });

  it('should only call start() once', function() {
    return Promise.all([myService.foo(), myService.bar()]).then(() => {
      expect(startSpy).to.have.been.calledOnce;
    });
  });

  it('should call onError when an async method errors', function() {
    const err = new Error('Err!');
    fooStub.throws(err);

    return myService.foo().then(
      () => {
        expect(fooStub).to.have.thrown(err);
      },
      err => {
        expect(err).to.equal(err);
        expect(errorSpy).to.have.been.calledWith(err);
        expect(errorSpy).to.have.been.calledOn(myService);
      }
    );
  });
});

describe('defineAsyncMethods', function() {
  let fooStub;
  let barSpy;
  let startSpy;
  let errorSpy;
  let myService;

  beforeEach(function() {
    fooStub = sinon.stub();
    barSpy = sinon.spy();
    startSpy = sinon.spy();
    errorSpy = sinon.spy();
    class MyService {
      start() {
        startSpy.call(this);
      }

      foo(...args) {
        fooStub.apply(this, args);
      }
      bar(...args) {
        barSpy.apply(this, args);
        return 'x';
      }

      onError(e) {
        errorSpy.call(this, e);
      }
    }

    defineAsyncMethods(MyService, ['foo', 'bar']);

    myService = new MyService();
  });

  it('should return a promise', function() {
    expect(myService.foo()).to.be.instanceOf(Promise);
  });

  it('should resolve the promise with the value returned by the method', function() {
    return myService.bar().then(result => {
      expect(result).to.equal('x');
    });
  });

  it('should call original method', function() {
    return myService.foo(1, 'a').then(() => {
      expect(fooStub).to.have.been.calledOnce;
      expect(fooStub).to.have.been.calledWith(1, 'a');
      expect(fooStub).to.have.been.calledOn(myService);
    });
  });

  it('should call start() before calling the function', function() {
    return myService.foo().then(() => {
      expect(startSpy).to.have.been.calledBefore(fooStub);
    });
  });

  it('should only call start() once', function() {
    return Promise.all([myService.foo(), myService.bar()]).then(() => {
      expect(startSpy).to.have.been.calledOnce;
    });
  });

  it('should call onError when an async method errors', function() {
    const err = new Error('Err!');
    fooStub.throws(err);

    return myService.foo().then(
      () => {
        expect(fooStub).to.have.thrown(err);
      },
      err => {
        expect(err).to.equal(err);
        expect(errorSpy).to.have.been.calledWith(err);
        expect(errorSpy).to.have.been.calledOn(myService);
      }
    );
  });
});
