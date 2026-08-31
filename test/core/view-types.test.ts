import { LitElement, type CSSResultGroup } from 'lit';
import { view } from '../../nextbone.js';

@view
class ViewDecoratorWithStaticOverride extends LitElement {
  protected static override finalizeStyles(styles?: CSSResultGroup) {
    return super.finalizeStyles(styles);
  }
}

class ViewMixinWithStaticOverride extends view(LitElement) {
  protected static override finalizeStyles(styles?: CSSResultGroup) {
    return super.finalizeStyles(styles);
  }

  testEventsMixin() {
    this.on('event', () => {});
  }
}

void ViewDecoratorWithStaticOverride;
void ViewMixinWithStaticOverride;
