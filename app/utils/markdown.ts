import { marked } from 'marked'
import xss from 'xss'

// CJS package: named exports live on the default export at runtime
const { FilterXSS, getDefaultWhiteList } = xss as unknown as typeof import('xss')

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
  onTagAttr(tag: string, name: string, value: string) {
    // Only allow task-list checkboxes from GFM
    if (tag === 'input' && name === 'type' && value !== 'checkbox') return ''
    return undefined
  }
})

// `breaks` turns single newlines into <br>, like GitHub release notes and comments
export function renderSafeMarkdown(source: string, options: { breaks?: boolean } = {}): string {
  return filter.process(marked.parse(source, { async: false, gfm: true, breaks: options.breaks ?? false }) as string)
}
