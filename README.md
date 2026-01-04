# 🎬 YouTube Clone

A full-stack YouTube clone built with modern cloud-native technologies. Upload, process, and stream videos using Google Cloud Platform and Firebase.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-10-orange?style=flat-square&logo=firebase)
![Google Cloud](https://img.shields.io/badge/Google%20Cloud-Platform-4285F4?style=flat-square&logo=google-cloud)

> 📖 For architecture details and design decisions, see [DESIGN.md](./DESIGN.md)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Setup Guide](#-setup-guide)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Google Cloud Project Setup](#2-google-cloud-project-setup)
  - [3. Firebase Setup](#3-firebase-setup)
  - [4. Cloud Storage Setup](#4-cloud-storage-setup)
  - [5. Service Account Setup](#5-service-account-setup)
  - [6. Install Dependencies](#6-install-dependencies)
  - [7. Environment Configuration](#7-environment-configuration)
- [Running Locally](#-running-locally)
- [Deployment](#-deployment)
  - [Deploy Cloud Functions](#1-deploy-cloud-functions)
  - [Deploy Video Processing Service](#2-deploy-video-processing-service)
  - [Configure Pub/Sub](#3-configure-pubsub)
  - [Deploy Web Client](#4-deploy-web-client)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## ✨ Features

- **Google Authentication** - Sign in/out with Google account
- **Video Upload** - Upload videos directly from browser
- **Video Processing** - Automatic transcoding to 360p using FFmpeg
- **Video Streaming** - Watch processed videos
- **Responsive UI** - Clean, simple interface

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, TypeScript, CSS Modules |
| **Backend** | Firebase Cloud Functions, Express.js |
| **Video Processing** | Cloud Run, FFmpeg |
| **Database** | Cloud Firestore |
| **Storage** | Google Cloud Storage |
| **Auth** | Firebase Authentication |
| **Messaging** | Cloud Pub/Sub |

---

## 📁 Project Structure

```
youtube-clone/
├── web-client/                 # Next.js frontend
│   ├── app/
│   │   ├── firebase/           # Firebase client config
│   │   ├── navbar/             # Navigation components
│   │   ├── watch/              # Video player page
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Homepage
│   └── package.json
│
├── functions/                  # Firebase Cloud Functions
│   ├── src/
│   │   └── index.ts            # All cloud functions
│   └── package.json
│
├── video-processing-service/   # Cloud Run service
│   ├── src/
│   │   ├── index.ts            # Express server
│   │   ├── storage.ts          # GCS & FFmpeg operations
│   │   └── firestore.ts        # Database operations
│   ├── Dockerfile
│   └── package.json
│
├── README.md
└── DESIGN.md
```

---

## 📋 Prerequisites

Before starting, make sure you have:

- [ ] **Node.js 18+** - [Download](https://nodejs.org/)
- [ ] **npm** or **yarn**
- [ ] **Google Cloud Account** - [Create Account](https://cloud.google.com/)
- [ ] **Google Cloud CLI (gcloud)** - [Install Guide](https://cloud.google.com/sdk/docs/install)
- [ ] **Firebase CLI** - Install with: `npm install -g firebase-tools`
- [ ] **Docker** - [Download](https://www.docker.com/products/docker-desktop/) (for video processing service)
- [ ] **FFmpeg** - [Download](https://ffmpeg.org/download.html) (for local testing)

---

## 🔧 Setup Guide

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/youtube-clone.git
cd youtube-clone
```

---

### 2. Google Cloud Project Setup

#### 2.1 Create a New Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown (top-left) → **New Project**
3. Enter project name (e.g., `youtube-clone-12345`)
4. Click **Create**
5. Wait for creation, then select your new project

#### 2.2 Enable Required APIs

Run these commands in your terminal:

```bash
# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  pubsub.googleapis.com \
  storage.googleapis.com \
  firestore.googleapis.com \
  cloudfunctions.googleapis.com
```

Or enable manually in [APIs & Services](https://console.cloud.google.com/apis/library):
- Cloud Build API
- Cloud Run API
- Cloud Pub/Sub API
- Cloud Storage API
- Cloud Firestore API
- Cloud Functions API

---

### 3. Firebase Setup

#### 3.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project**
3. Select your existing Google Cloud project (from step 2)
4. Disable Google Analytics (optional)
5. Click **Create project**

#### 3.2 Enable Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click **Get started**
3. Go to **Sign-in method** tab
4. Click **Google** → **Enable**
5. Select your support email
6. Click **Save**

#### 3.3 Create Firestore Database

1. Go to **Build** → **Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode**
4. Select a location (e.g., `us-central1`)
5. Click **Enable**

#### 3.4 Get Firebase Config

1. Go to **Project settings** (gear icon)
2. Scroll to **Your apps** → Click **Web** icon (`</>`)
3. Register app name (e.g., `youtube-clone-web`)
4. Copy the `firebaseConfig` object:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  appId: "1:123456789:web:abc123",
};
```

5. Update this config in `web-client/app/firebase/firebase.ts`

#### 3.5 Initialize Firebase CLI

```bash
# Login to Firebase
firebase login

# Initialize Firebase in your project root
firebase init

# Select these options:
# - Firestore
# - Functions
# - Storage
# - Emulators (optional, for local testing)

# Choose your Firebase project when prompted
```

---

### 4. Cloud Storage Setup

#### 4.1 Create Storage Buckets

```bash
# Create bucket for raw (uploaded) videos - PRIVATE
gsutil mb -l us-central1 gs://YOUR_PROJECT_ID-raw-videos

# Create bucket for processed videos - PUBLIC
gsutil mb -l us-central1 gs://YOUR_PROJECT_ID-processed-videos

# Make processed videos bucket public
gsutil iam ch allUsers:objectViewer gs://YOUR_PROJECT_ID-processed-videos
```

#### 4.2 Configure CORS (Required for Browser Upload)

Create a file named `cors.json`:

```json
[
  {
    "origin": ["http://localhost:3000", "https://your-domain.com"],
    "method": ["GET", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Authorization"]
  }
]
```

Apply CORS configuration:

```bash
gsutil cors set cors.json gs://YOUR_PROJECT_ID-raw-videos
```

#### 4.3 Update Bucket Names in Code

Update the bucket names in these files:

**`video-processing-service/src/storage.ts`:**
```typescript
const rawVideoBucketName = "YOUR_PROJECT_ID-raw-videos";
const processedVideoBucketName = "YOUR_PROJECT_ID-processed-videos";
```

**`functions/src/index.ts`:**
```typescript
const rawVideoBucketName = "YOUR_PROJECT_ID-raw-videos";
```

**`web-client/app/watch/page.tsx`:**
```typescript
const videoPrefix = "https://storage.googleapis.com/YOUR_PROJECT_ID-processed-videos/";
```

---

### 5. Service Account Setup

The video processing service needs credentials to access Google Cloud services.

#### 5.1 Create Service Account

```bash
# Create service account
gcloud iam service-accounts create video-processor \
  --display-name="Video Processing Service"

# Grant permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:video-processor@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:video-processor@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```

#### 5.2 Download Credentials (for local development)

```bash
# Create key file
gcloud iam service-accounts keys create ./service-account-key.json \
  --iam-account=video-processor@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

> ⚠️ **Important:** Add `service-account-key.json` to your `.gitignore`!

---

### 6. Install Dependencies

```bash
# Web Client
cd web-client
npm install

# Cloud Functions
cd ../functions
npm install

# Video Processing Service
cd ../video-processing-service
npm install
```

---

### 7. Environment Configuration

#### 7.1 Video Processing Service

Set the environment variable to use your service account:

**Linux/macOS:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="./service-account-key.json"
```

**Windows (PowerShell):**
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS=".\service-account-key.json"
```

---

## 🚀 Running Locally

### Terminal 1: Web Client

```bash
cd web-client
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### Terminal 2: Firebase Emulators (Functions)

```bash
cd functions
npm run serve

# Or use Firebase emulators for full local testing:
firebase emulators:start
```

### Terminal 3: Video Processing Service

```bash
cd video-processing-service

# Set credentials
export GOOGLE_APPLICATION_CREDENTIALS="./service-account-key.json"

# Run the server
npm run dev
```

> **Note:** For full local testing, you can use Firebase Emulators. Run `firebase emulators:start` to start Firestore, Functions, and Storage emulators locally.

---

## 🌐 Deployment

### 1. Deploy Cloud Functions

```bash
cd functions

# Build TypeScript
npm run build

# Deploy to Firebase
firebase deploy --only functions
```

Verify deployment in [Firebase Console](https://console.firebase.google.com/) → **Functions**

---

### 2. Deploy Video Processing Service

#### 2.1 Build and Push Docker Image

```bash
cd video-processing-service

# Build and submit to Google Container Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/video-processing-service
```

#### 2.2 Deploy to Cloud Run

```bash
gcloud run deploy video-processing-service \
  --image gcr.io/YOUR_PROJECT_ID/video-processing-service \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --timeout 3600 \
  --allow-unauthenticated
```

Save the **Service URL** from the output (e.g., `https://video-processing-service-xxxxx-uc.a.run.app`)

---

### 3. Configure Pub/Sub

#### 3.1 Create Topic and Subscription

```bash
# Create Pub/Sub topic
gcloud pubsub topics create raw-video-uploads

# Create push subscription pointing to your Cloud Run service
gcloud pubsub subscriptions create raw-video-uploads-sub \
  --topic=raw-video-uploads \
  --push-endpoint=YOUR_CLOUD_RUN_URL/process-video \
  --ack-deadline=600
```

#### 3.2 Set Up Storage Notification

```bash
# Notify Pub/Sub when new files are uploaded to raw videos bucket
gsutil notification create \
  -t raw-video-uploads \
  -f json \
  -e OBJECT_FINALIZE \
  gs://YOUR_PROJECT_ID-raw-videos
```

---

### 4. Deploy Web Client

#### Option A: Firebase Hosting

```bash
cd web-client

# Build the Next.js app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

#### Option B: Vercel (Recommended for Next.js)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd web-client
vercel --prod
```

#### Option C: Cloud Run

```bash
cd web-client

# Build Docker image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/web-client

# Deploy
gcloud run deploy web-client \
  --image gcr.io/YOUR_PROJECT_ID/web-client \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## 🔍 Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| **CORS errors on upload** | Make sure you configured CORS on the raw videos bucket (step 4.2) |
| **"Permission denied" errors** | Check that service account has correct IAM roles |
| **Videos not processing** | Verify Pub/Sub subscription is connected to Cloud Run URL |
| **Auth not working** | Ensure Google Sign-in is enabled in Firebase Console |
| **Firestore permission denied** | Check Firestore security rules allow read/write |

### Useful Commands

```bash
# View Cloud Run logs
gcloud logs read --service=video-processing-service --limit=50

# View Pub/Sub subscription status
gcloud pubsub subscriptions describe raw-video-uploads-sub

# Test Cloud Function locally
firebase functions:shell

# Check bucket contents
gsutil ls gs://YOUR_PROJECT_ID-raw-videos
gsutil ls gs://YOUR_PROJECT_ID-processed-videos
```

### Firestore Security Rules

If you have permission issues, update your Firestore rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Anyone can read videos, only authenticated users can write
    match /videos/{videoId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 📝 License

This project is licensed under the MIT License.

---

<p align="center">
  Made with ❤️ by Omer
</p>
