import { marked } from 'marked'
import xss from 'xss'

const { FilterXSS, getDefaultWhiteList } = xss

// Pure-JS sanitizer: runs during SSR on Cloudflare Workers (no jsdom) and in the browser
const whiteList = getDefaultWhiteList()
for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'pre', 'code', 'blockquote', 'ul', 'ol', 'li', 'hr', 'br', 'del', 'input']) {
  whiteList[tag] = [...new Set([...(whiteList[tag] ?? []), 'id', 'class'])]
}
whiteList.input = ['type', 'checked', 'disabled']
whiteList.a = ['href', 'title', 'target', 'rel']
whiteList.img = ['src', 'alt', 'title', 'width', 'height']
whiteList.th = [...(whiteList.th ?? []), 'align']
whiteList.td = [...(whiteList.td ?? []), 'align']

const filter = new FilterXSS({
  whiteList,
  stripIgnoreTagBody: ['script', 'style'],
  onTagAttr(tag, name, value) {
    // Only allow task-list checkboxes from GFM
    if (tag === 'input' && name === 'type' && value !== 'checkbox') return ''
    return undefined
  }
})

export function renderSafeMarkdown(source: string): string {
  return filter.process(marked.parse(source, { async: false }) as string)
}
