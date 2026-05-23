import { defineNuxtPlugin } from '#app'
import { useOverlayerState } from 'overlayer-ui'

interface TooltipCallbacks {
  mouseEnter: (event: MouseEvent) => void
  mouseMove: (event: MouseEvent) => void
  mouseLeave: () => void
}

const elementCallbacks = new WeakMap<HTMLElement, TooltipCallbacks>()

export default defineNuxtPlugin((nuxtApp) => {
  const { showTooltip, hideTooltip } = useOverlayerState()

  nuxtApp.vueApp.directive('tooltip', {
    mounted(el, binding) {
      const handleMouseEnter = (event: MouseEvent) => {
        const text = binding.value
        if (!text) return
        showTooltip(text, event.clientX + 10, event.clientY + 15)
      }

      const handleMouseMove = (event: MouseEvent) => {
        const text = binding.value
        if (!text) return
        showTooltip(text, event.clientX + 10, event.clientY + 15)
      }

      const handleMouseLeave = () => {
        hideTooltip()
      }

      el.addEventListener('mouseenter', handleMouseEnter)
      el.addEventListener('mousemove', handleMouseMove)
      el.addEventListener('mouseleave', handleMouseLeave)
      el.addEventListener('click', handleMouseLeave)

      elementCallbacks.set(el, {
        mouseEnter: handleMouseEnter,
        mouseMove: handleMouseMove,
        mouseLeave: handleMouseLeave
      })
    },
    unmounted(el) {
      const callbacks = elementCallbacks.get(el)
      if (callbacks) {
        el.removeEventListener('mouseenter', callbacks.mouseEnter)
        el.removeEventListener('mousemove', callbacks.mouseMove)
        el.removeEventListener('mouseleave', callbacks.mouseLeave)
        elementCallbacks.delete(el)
      }
    }
  })
})
