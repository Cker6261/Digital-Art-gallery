import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cors from 'cors';
import promBundle from 'express-prom-bundle';
import client from 'prom-client';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'eu-north-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const BUCKET_NAME = 'art-gallery-cp500-website';

// Create custom metrics
const imageViewCounter = new client.Counter({
    name: 'art_gallery_image_views_total',
    help: 'Total number of image views'
});

const imageUploadCounter = new client.Counter({
    name: 'art_gallery_uploads_total',
    help: 'Total number of image uploads'
});

const imageCount = new client.Gauge({
    name: 'art_gallery_images_total',
    help: 'Total number of images in the gallery'
});

// Prometheus metrics middleware
const metricsMiddleware = promBundle({
    includeMethod: true,
    includePath: true,
    includeStatusCode: true,
    promClient: {
        collectDefaultMetrics: {}
    }
});

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use(metricsMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Get all images from S3
app.get('/images', async (req, res) => {
    try {
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: 'uploads/'
        });

        const { Contents = [] } = await s3Client.send(command);
        const files = Contents
            .filter(item => /\.(jpg|jpeg|png|gif)$/i.test(item.Key))
            .map((item, index) => ({
                id: index + 1,
                url: `/uploads/${item.Key.split('/').pop()}`,
                timestamp: item.LastModified
            }));

        // Update metrics
        imageCount.set(files.length);
        imageViewCounter.inc();
        
        res.json(files);
    } catch (error) {
        console.error('Error listing images:', error);
        res.status(500).json({ error: 'Failed to list images', details: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`View metrics at http://localhost:${PORT}/metrics`);
});

// Export the app instance for testing
export default app;
