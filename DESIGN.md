# YouTube Clone - System Design

## Introduction

This document describes the design of a simplified YouTube clone, implemented as a learning project for full-stack cloud development.

The goal of this project is not to build a 1:1 clone of YouTube, but rather to build a rough skeleton where the core functionality is implemented. We focus on keeping the design as simple as possible while still addressing some scalability tradeoffs.

> **Note:** This is a learning project, not a production-ready system.

---

## Background

YouTube is a video sharing platform that allows users to upload, view, rate, share, and comment on videos.

The scope of YouTube is massive - with over 1 billion daily active users, even "trivial" features like rating and commenting become complex distributed systems problems.

For this reason, this project focuses primarily on:
- **Video uploading** - The core upload flow
- **Video processing** - Transcoding to standard formats
- **Video viewing** - Basic playback functionality

Features intentionally excluded:
- Comments and ratings
- Subscriptions and notifications
- Recommendations algorithm
- Live streaming
- Analytics dashboard

---

## Requirements

### Functional Requirements

1. **Users can sign in/out** using their Google account
2. **Users can upload videos** while signed in
3. **Videos are transcoded** to multiple formats (e.g., 360p, 720p)
4. **Users can view a list** of uploaded videos (signed in or not)
5. **Users can watch individual videos** (signed in or not)

### Non-Functional Requirements

- Videos should be processed asynchronously (don't block the user)
- System should handle concurrent uploads
- Processed videos should be publicly accessible
- System should be cost-effective (scale to zero when idle)

---

## High Level Design

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  USER                                            │
└─────────────────────────────────────┬───────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           WEB CLIENT (Next.js)                                   │
│                           Hosted on Cloud Run                                    │
└───────────┬─────────────────────┬─────────────────────┬─────────────────────────┘
            │                     │                     │
            │ Auth                │ Upload URL          │ Get Videos
            ▼                     ▼                     ▼
┌───────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   Firebase Auth   │   │    Firebase     │   │    Firebase     │
│  (Google Sign-In) │   │    Functions    │   │    Functions    │
└───────────────────┘   └────────┬────────┘   └────────┬────────┘
                                 │                     │
                                 │ Signed URL          │ Query
                                 ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│    ┌─────────────────────┐              ┌─────────────────────┐                 │
│    │   Cloud Storage     │              │     Firestore       │                 │
│    │   (Raw Videos)      │              │   (Video Metadata)  │                 │
│    │      PRIVATE        │              │                     │                 │
│    └──────────┬──────────┘              └──────────▲──────────┘                 │
│               │                                    │                            │
│               │ Notification                       │ Update Status              │
│               ▼                                    │                            │
│    ┌─────────────────────┐              ┌─────────┴──────────┐                 │
│    │   Cloud Pub/Sub     │─────────────▶│    Cloud Run       │                 │
│    │   (Message Queue)   │   Push       │ (Video Processing) │                 │
│    └─────────────────────┘              │     + FFmpeg       │                 │
│                                         └─────────┬──────────┘                 │
│                                                   │                            │
│                                                   │ Upload Processed           │
│                                                   ▼                            │
│                                         ┌─────────────────────┐                │
│                                         │   Cloud Storage     │                │
│                                         │ (Processed Videos)  │                │
│                                         │      PUBLIC         │                │
│                                         └─────────────────────┘                │
│                                                                                 │
│                              GOOGLE CLOUD PLATFORM                              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Component Overview

| Component | Service | Purpose |
|-----------|---------|---------|
| **Video Storage** | Cloud Storage | Host raw and processed video files |
| **Upload Events** | Cloud Pub/Sub | Durable message queue for async processing |
| **Video Processing** | Cloud Run | Containerized FFmpeg transcoding workers |
| **Video Metadata** | Firestore | Store video info (title, status, etc.) |
| **Video API** | Firebase Functions | Serverless API for uploads and queries |
| **Web Client** | Next.js on Cloud Run | User interface |
| **Authentication** | Firebase Auth | Google Sign-In integration |

---

## Detailed Design

### 1. User Sign Up

Users sign up using their Google account, handled entirely by Firebase Auth.

**Flow:**
```
User clicks "Sign In"
       │
       ▼
┌─────────────────┐
│ Google OAuth    │
│ Popup appears   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────────┐
│ Firebase Auth   │─────▶│ Cloud Function  │
│ creates user    │      │ (createUser)    │
└─────────────────┘      └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Firestore       │
                         │ users/{uid}     │
                         └─────────────────┘
```

**Why use a Cloud Function trigger?**

While it's possible to create the user document directly from the client after sign-up, this approach has edge cases:
- What if there's a network issue after sign-up but before document creation?
- What if the user's browser crashes?

Firebase Auth provides triggers so we don't rely on the client. The `createUser` function fires automatically whenever a new user is created, ensuring data consistency.

**User Document Schema:**
```typescript
interface User {
  uid: string;        // Firebase Auth UID
  email: string;      // User's email
  photoUrl: string;   // Profile picture
  createdAt: Date;    // Account creation time
}
```

---

### 2. Video Upload

Only authenticated users can upload videos. This allows us to:
- Associate videos with the uploader
- Enforce upload quotas in the future (e.g., 10 videos/day)

**Flow:**
```
User selects video file
         │
         ▼
┌─────────────────┐
│ Client calls    │
│ generateUpload  │
│ URL function    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────────┐
│ Cloud Function  │─────▶│ Returns signed  │
│ verifies auth   │      │ URL (15 min)    │
└─────────────────┘      └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Client uploads  │
                         │ directly to GCS │
                         └─────────────────┘
```

**Why use Signed URLs?**

Instead of routing video files through our servers (expensive and slow), we generate a signed URL that allows the user to upload directly to Cloud Storage. Benefits:
- No server bandwidth costs
- Faster uploads (direct to Google's infrastructure)
- Automatic authentication (URL is only valid for 15 minutes)
- File size handling is managed by GCS

**Signed URL Generation:**
```typescript
const [url] = await bucket.file(fileName).getSignedUrl({
  version: "v4",
  action: "write",
  expires: Date.now() + 15 * 60 * 1000, // 15 minutes
});
```

**Filename Format:** `{userId}-{timestamp}.{extension}`

This ensures uniqueness and allows us to trace videos back to users.

---

### 3. Video Processing

Videos need to be transcoded to standard formats for consistent playback across devices.

**The Problem:**

We could process videos immediately upon upload, but:
- Processing is CPU-intensive and slow
- Multiple uploads at once would overwhelm our servers
- Failed processing would lose the video

**The Solution: Message Queue**

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ Cloud Storage   │─────▶│ Cloud Pub/Sub   │─────▶│ Cloud Run       │
│ (file uploaded) │      │ (message queue) │      │ (processor)     │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

**Benefits of Pub/Sub:**

1. **Decoupling** - Upload and processing are independent
2. **Durability** - Messages persist even if processors are down
3. **Buffering** - If we can't keep up, messages queue automatically
4. **Fan-out** - We can add more subscribers (e.g., analytics) later
5. **Retry** - Failed messages are automatically retried

**Processing Steps:**

```
1. Receive Pub/Sub message
         │
         ▼
2. Check if video is new (not already processing)
         │
         ▼
3. Update Firestore: status = "processing"
         │
         ▼
4. Download raw video from GCS to local storage
         │
         ▼
5. Transcode with FFmpeg (→ 360p)
         │
         ▼
6. Upload processed video to public GCS bucket
         │
         ▼
7. Update Firestore: status = "processed"
         │
         ▼
8. Delete local temporary files
```

**FFmpeg Command:**
```typescript
ffmpeg(inputPath)
  .outputOptions("-vf", "scale=-1:360")  // Scale to 360p height
  .save(outputPath);
```

**Video Document Schema:**
```typescript
interface Video {
  id: string;                           // {uid}-{timestamp}
  uid: string;                          // Owner's user ID
  filename: string;                     // Processed filename
  status: "processing" | "processed";   // Current state
  title?: string;                       // Optional metadata
  description?: string;
}
```

---

### 4. Video Viewing

Processed videos are stored in a public Cloud Storage bucket and served directly to users.

**Video List Flow:**
```
Client loads homepage
         │
         ▼
┌─────────────────┐      ┌─────────────────┐
│ getVideos()     │─────▶│ Firestore query │
│ Cloud Function  │      │ status=processed│
└─────────────────┘      └────────┬────────┘
                                  │
                                  ▼
                         Return video metadata
```

**Video Playback:**
```html
<video src="https://storage.googleapis.com/bucket/processed-video.mp4" />
```

Videos are served directly from Cloud Storage's global CDN - no server involvement needed.

---

## Limitations & Future Work

### Current Limitations

| Limitation | Description | Impact |
|------------|-------------|--------|
| **Cloud Run Timeout** | Max request duration is 3600 seconds (1 hour) | Very long videos may fail to process |
| **Pub/Sub Redelivery** | Messages redeliver after 600 seconds, closing HTTP connection | Processing must complete within 10 minutes or handle interruption |
| **No Content Moderation** | We don't check for illegal/inappropriate content | Potential for abuse |
| **Single Format** | Currently only 360p output | No adaptive streaming |
| **No Thumbnails** | No automatic thumbnail generation | Poor UX in video list |

### Potential Future Improvements

1. **Multiple Resolutions**
   - Transcode to 360p, 720p, 1080p
   - Implement adaptive bitrate streaming (HLS/DASH)

2. **Content Moderation**
   - Integrate Cloud Video Intelligence API
   - Flag inappropriate content automatically

3. **Thumbnail Generation**
   - Extract frame at specific timestamp
   - Generate multiple thumbnail options

4. **Progress Tracking**
   - Real-time upload progress
   - Processing status updates via WebSocket

5. **Quotas & Rate Limiting**
   - Limit uploads per user per day
   - File size limits
   - Storage quotas

6. **Video Metadata**
   - Title and description editing
   - Tags and categories
   - View count tracking

7. **User Features**
   - Video deletion
   - Profile management
   - Upload history

---

## References

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Cloud Storage Signed URLs](https://cloud.google.com/storage/docs/access-control/signed-urls)
- [Pub/Sub Push Subscriptions](https://cloud.google.com/pubsub/docs/push)
- [Using Pub/Sub with Cloud Storage](https://cloud.google.com/storage/docs/pubsub-notifications)
- [Using Pub/Sub with Cloud Run](https://cloud.google.com/run/docs/tutorials/pubsub)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Next.js Documentation](https://nextjs.org/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
