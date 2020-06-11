const regex = /matrix\((.*)\)/

const eventType = {
  touchstart: 'touchstart',
  touchmove: 'touchmove',
  touchend: 'touchend',
  transitionend: 'transitionend',
}

function trigger(type, e) {
  switch (type) {
    case eventType.touchstart:
      this.start(e)
      break
    case eventType.touchmove:
      this.move(e)
      break
    case eventType.touchend:
      this.end(e)
      break
    default:
      throw new TypeError('illegal type value')
  }
}

class Translate {
  constructor({ el }) {
    this.el = el
    this.wrapperHeight = el.parentNode.offsetHeight
    this.contentHeight = el.offsetHeight
    this.startClientY = 0
    this.preScrollHeight = 0
    this.curScrollHeight = 0
  }
  
  ensure(scrollHeight) {
    if (scrollHeight > 0) return 0
    if (scrollHeight < this.wrapperHeight - this.contentHeight) return this.wrapperHeight - this.contentHeight
    return scrollHeight
  }
  
  start(e) {
    this.startClientY = e.touches[0].clientY
  }
  
  move(e) {
    this.curScrollHeight = this.ensure(this.preScrollHeight + e.touches[0].clientY - this.startClientY)
    this.el.style.transform = `translateY(${this.curScrollHeight}px)`
  }
  
  end() {
    this.preScrollHeight = this.curScrollHeight
  }

  isTop() {
    return this.preScrollHeight === 0
  }

  isBottom() {
    return this.preScrollHeight === this.wrapperHeight - this.contentHeight
  }

  offset(value) {
    this.preScrollHeight = this.curScrollHeight = this.ensure(this.preScrollHeight + value)
    this.el.style.transform = `translateY(${this.preScrollHeight}px)`
  }

  to(scrollHeight) {
    this.preScrollHeight = this.curScrollHeight = scrollHeight
    this.el.style.transform = `translateY(${this.preScrollHeight}px)`
  }
}

class Transition {
  constructor({ el, translate }) {
    this.el = el
    this.translate = translate
    // 是否正在过渡中
    this.pending = false
    this.startClientY = 0
    // 根据路程和时间求速度
    this.instance = 0
    this.timeStamp = 0
    // 当速度小于这个值时就不需要继续滚动
    this.lowsetSpeed = 3
    // 速度乘以时间得出继续滚动的距离
    this.seconds = 600
    this.duration = 1000
  }
  
  transitionEnd() {
    this.pending = false
    this.el.style.transitionDuration = '0ms'
  }
  
  init() {
    this.bindTransitionEnd = this.transitionEnd.bind(this)
    this.el.addEventListener(eventType.transitionend, this.bindTransitionEnd, false)
  }
  
  destroy() {
    this.el.removeEventListener(eventType.transitionend, this.bindTransitionEnd, false)
  }
  
  stop() {
    // 这里使用getComputedStyle方法获取容器的transform值
    regex.test(window.getComputedStyle(this.el, null).transform)
    this.translate.to(+RegExp.$1.split(', ')[5])
    const event = new Event(eventType.transitionend)
    this.el.dispatchEvent(event)
  }
  
  start(e) {
    if (this.pending) this.stop()
    this.timeStamp = Date.now()
    this.startClientY = e.touches[0].clientY
  }
  
  move(e) {
    // 要记录最后一次方向上滚动的距离和时间
    const instance = Math.abs(e.touches[0].clientY - this.startClientY)
    if (instance > this.instance) this.instance = instance
    else {
        this.instance = 0
        this.timeStamp = Date.now()
        this.startClientY = e.touches[0].clientY
    }
  }
  
  end(e) {
    if (this.translate.isTop() || this.translate.isBottom()) return
    let speed = +(Math.floor(this.instance) * (Date.now() - this.timeStamp)).toFixed(2)
    // 这里注意将距离重置
    this.instance = 0
    if (speed < this.lowsetSpeed) return
    speed = e.changedTouches[0].clientY < this.startClientY ? -speed : speed
    this.pending = true
    this.el.style.transitionDuration = `${this.duration}ms`
    this.translate.offset(parseInt(speed * this.seconds, 10))
  }
}

class Scroll {
  constructor({ el }) {
    this.el = typeof el === 'string' ? document.querySelector(el) : el
    if (!this.el) {
        console.error('the el is not exist')
        return
    }
    this.translate = new Translate({ el: this.el })
    this.transition = new Transition({
        el: this.el,
        translate: this.translate,
    })
    // 负责调用每个touch类型事件触发阶段需要处理的代码
    // 比如touchstart事件触发时，调用this.translate.start方法
    // 这里先只添加this.translate，实现转换效果
    this.origins = [this.translate, this.transition]
    this.init()
  }
  
  start(e) {
    this.origins.forEach((origin) => {
        trigger.call(origin, eventType.touchstart, e)
    })
  }
  
  move(e) {
    this.origins.forEach((origin) => {
        trigger.call(origin, eventType.touchmove, e)
    })
  }
  
  end(e) {
    this.origins.forEach((origin) => {
        trigger.call(origin, eventType.touchend, e)
    })
  }
  
  init() {
    this.el.style.transitionProperty = 'transform'
    this.el.style.transitionTimingFunction = 'cubic-bezier(0.165, 0.84, 0.44, 1)'
    this.el.style.transitionDuration = '0ms'
    this.bindStart = this.start.bind(this)
    this.bindMove = this.move.bind(this)
    this.bindEnd = this.end.bind(this)
    window.addEventListener(eventType.touchstart, this.bindStart, false)
    window.addEventListener(eventType.touchmove, this.bindMove, false)
    window.addEventListener(eventType.touchend, this.bindEnd, false)
    this.transition.init()
  }
  
  destory() {
    window.removeEventListener(eventType.touchstart, this.bindStart, false)
    window.removeEventListener(eventType.touchmove, this.bindMove, false)
    window.removeEventListener(eventType.touchend, this.bindEnd, false)
    this.transition.destory()
  }
}