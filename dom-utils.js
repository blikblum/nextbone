export class Region {
  constructor (targetEl) {
    this.targetEl = targetEl
    this.isSwappingEl = false
    this.currentEl = undefined
  }

  show (el) {
    this.isSwappingEl = this.currentEl !== undefined

    if (this.currentEl) {
      this.empty()
    }

    this.attachEl(el)

    this.currentEl = el
    this.isSwappingEl = false
  }

  empty () {
    if (this.currentEl) {
      this.detachEl(this.currentEl)
    }
    this.currentEl = undefined
  }

  attachEl (el) {
    this.targetEl.appendChild(el)
  }

  detachEl (el) {
    this.targetEl.removeChild(el)
  }
}
