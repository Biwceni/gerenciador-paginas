import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

let client: S3Client | null = null

/**
 * Bucket próprio das fontes, separado do de fotos: cada um com a sua regra de tipos e tamanho.
 * A chave S3, o endpoint e a região são os mesmos (valem para o projeto Supabase inteiro).
 */
export function fontStorageConfigured(): boolean {
  return Boolean(
    process.env.S3_FONTS_BUCKET &&
    process.env.S3_FONTS_PUBLIC_URL &&
    process.env.S3_ENDPOINT &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY,
  )
}

/** Guarda um arquivo de fonte no bucket de fontes e devolve o endereço público dele. */
export async function uploadFontFile(key: string, body: Uint8Array): Promise<string> {
  client ??= new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
  })
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_FONTS_BUCKET,
      Key: key,
      Body: body,
      ContentType: 'font/woff2',
      // O nome do arquivo muda quando o conteúdo muda, então pode ficar um ano em cache.
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )
  return `${process.env.S3_FONTS_PUBLIC_URL}/${key}`
}
