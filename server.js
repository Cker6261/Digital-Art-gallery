import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cors from 'cors';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'art-gallery-images-bucket';

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Configure multer for temporary file storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Get all images
app.get('/images', async (req, res) => {
    try {
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME
        });

        const data = await s3Client.send(command);
        const files = await Promise.all(data.Contents.map(async file => {
            const getObjectCommand = new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: file.Key
            });
            const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 });
            return {
                name: file.Key,
                url: url
            };
        }));

        res.json({ images: files });
    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).json({ error: 'Failed to retrieve images' });
    }
});

// Upload image
app.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const filename = Date.now() + '-' + req.file.originalname;
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: filename,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        });

        await s3Client.send(command);

        // Generate signed URL for immediate access
        const getObjectCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: filename
        });
        const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 });

        res.json({
            success: true,
            file: {
                name: filename,
                url: url
            }
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Download image
app.get('/download/:filename', async (req, res) => {
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: req.params.filename
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        res.redirect(url);
    } catch (error) {
        console.error('Error generating download URL:', error);
        res.status(404).json({ error: 'File not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
