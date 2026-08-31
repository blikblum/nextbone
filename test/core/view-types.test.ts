import { LitElement, type CSSResultGroup } from 'lit';
import { view } from '../../nextbone.js';

@view
class ViewWithStaticOverride extends LitElement {
  protected static override finalizeStyles(styles?: CSSResultGroup) {
    return super.finalizeStyles(styles);
  }
}

void ViewWithStaticOverride;
