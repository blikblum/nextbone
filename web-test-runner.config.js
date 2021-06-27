import { babel as rollupBabel } from '@rollup/plugin-babel';
import { fromRollup } from '@web/dev-server-rollup';

const babel = fromRollup(rollupBabel);

export default {
  plugins: [babel({ include: ['test/**/*.js'], babelHelpers: 'inline' })]
};
