module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  root.find(j.ClassDeclaration).forEach(path => {
    const decorator =
      path.value.decorators &&
      path.value.decorators.find(decorator => {
        return decorator.expression.callee.name === 'validation';
      });
    if (decorator) {
      const options = decorator.expression.arguments[0];
      const classProperty = j.classProperty(j.identifier('validation'), options, null, true);
      path.value.body.body = [classProperty, ...path.value.body.body];
      path.value.decorators = [j.decorator(j.identifier('withValidation'))];
    }
  });
  return root.toSource();
};

module.exports.parser = 'babylon';
