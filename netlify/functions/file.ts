import { getStore } from '@netlify/blobs'

const store = getStore('anyqr-files')
const maxFileSize = 100 * 1024 * 1024

export default async (request: Request) => {
  if (request.method === 'POST') {
    const form = await request.formData()
    const file = form.get('file')

    if (!(file instanceof File)) {
      return Response.json({ error: 'A file is required.' }, { status: 400 })
    }
    if (file.size > maxFileSize) {
      return Response.json({ error: 'Files must be smaller than 100 MB.' }, { status: 413 })
    }

    const id = crypto.randomUUID()
    await store.set(id, file, {
      metadata: {
        contentType: file.type || 'application/octet-stream',
        fileName: file.name,
      },
    })

    const url = new URL(request.url)
    url.search = `?id=${encodeURIComponent(id)}`
    return Response.json({ url: url.toString() })
  }

  if (request.method === 'GET') {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return new Response('Missing file id.', { status: 400 })

    const file = await store.get(id, { type: 'blob' })
    if (!file) return new Response('File not found or expired.', { status: 404 })

    const metadata = await store.getMetadata(id)
    return new Response(file, {
      headers: {
        'Content-Type': metadata?.metadata?.contentType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${metadata?.metadata?.fileName || 'download'}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  }

  return new Response('Method not allowed.', { status: 405 })
}
