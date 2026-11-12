import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucketName = () => process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET_NAME;

export const putObject = async (file, folder = "uploads") => {
  const safeName = file.originalname.replace(/\s+/g, "_");
  const key = `${folder}/${Date.now()}-${safeName}`;
  const bucket = bucketName();

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  const url = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  return { url, key };
};

export const deleteObject = async (key) => {
  if (!key) return;

  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucketName(),
      Key: key,
    })
  );
};
