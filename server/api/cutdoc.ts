import { load, cut, loadDict } from '@node-rs/jieba'

load()

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const terms = cut(body.doc, true)
    return { terms }
  })