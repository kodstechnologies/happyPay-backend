
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

export const uploadToS3 = async (file) => {
    const safeFileName = file.originalname.replace(/\s/g, "_");
    const key = `${Date.now()}-${safeFileName}`;

    await s3.send(
        new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET_NAME,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        })
    );
    const bucket = process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET_NAME;
    const url = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    return { key, url };
};
export const getS3SignedUrl = async (key, expiresIn = 3600) => {
    const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET_NAME,
        Key: key,
    });
    return await getSignedUrl(s3, command, { expiresIn }); // default 1 hour
};