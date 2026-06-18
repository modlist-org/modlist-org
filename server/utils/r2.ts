import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { H3Event } from 'h3'

let s3Client: S3Client | null = null

export function getR2Client(event: H3Event): S3Client {
  if (s3Client) return s3Client

  const config = useRuntimeConfig(event)
  const accountId = config.r2AccountId
  const accessKeyId = config.r2AccessKeyId
  const secretAccessKey = config.r2SecretAccessKey

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Cloudflare R2 storage credentials are not configured in runtimeConfig.'
    })
  }

  s3Client = new S3Client({
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey
    },
    region: 'auto'
  })

  return s3Client
}

export async function getUploadPresignedUrl(
  event: H3Event,
  fileKey: string,
  fileSize: number,
  contentType: string = 'application/octet-stream',
  expiresInSeconds: number = 900 // 15 minutes
): Promise<string> {
  const client = getR2Client(event)
  const config = useRuntimeConfig(event)
  const bucketName = config.r2BucketName

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
    ContentLength: fileSize,
    ContentType: contentType
  })

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
}

export async function getDownloadPresignedUrl(
  event: H3Event,
  fileKey: string,
  expiresInSeconds: number = 3600 // 1 hour
): Promise<string> {
  const client = getR2Client(event)
  const config = useRuntimeConfig(event)
  const bucketName = config.r2BucketName

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: fileKey
  })

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
}

export async function deleteR2Object(event: H3Event, fileKey: string): Promise<void> {
  const client = getR2Client(event)
  const config = useRuntimeConfig(event)
  const bucketName = config.r2BucketName

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: fileKey
  })

  await client.send(command)
}
