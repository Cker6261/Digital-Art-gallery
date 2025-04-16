import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cors from 'cors';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import promBundle from 'express-prom-bundle';
import client from 'prom-client';

dotenv.config();

// Prometheus metrics setup
const metricsMiddleware = promBundle({
    includeMethod: true,
    includePath: true,
    includeStatusCode: true,
    promClient: client
});

// Create custom metrics
const imageUploadCounter = new client.Counter({
    name: 'image_uploads_total',
    help: 'Total number of image uploads'
});

const imageViewCounter = new client.Counter({
    name: 'image_views_total',
    help: 'Total number of image views'
});

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
app.use(metricsMiddleware); // Add Prometheus middleware

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
        const files = await Promise.all(data.Contents.map(async (file, index) => {
            const getObjectCommand = new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: file.Key
            });
            const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 });
            // Return index-based identifier instead of filename
            return {
                id: index + 1,
                url: url,
                timestamp: file.LastModified
            };
        }));
        
        imageViewCounter.inc(); // Increment view counter
        res.json(files);
    } catch (error) {
        console.error('Error listing images:', error);
        res.status(500).json({ error: 'Failed to list images' });
    }
});

// Upload image
app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const timestamp = Date.now();
        const fileExtension = path.extname(req.file.originalname);
        const key = `image_${timestamp}${fileExtension}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        });

        await s3Client.send(command);
        imageUploadCounter.inc(); // Increment upload counter
        res.json({ message: 'File uploaded successfully' });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    const metrics = await client.register.metrics();
    res.send(metrics);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
