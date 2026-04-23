import { NextRequest } from 'next/server'
import { demoProxy } from '@/lib/demo-proxy'
import { ALLOWED_ORIGINS } from '@/lib/demo-config'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return demoProxy(request, {
    endpoint: '/validate/email',
    allowedMethods: ['POST'],
    allowedOrigins: ALLOWED_ORIGINS
  })
}
