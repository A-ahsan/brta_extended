# Face-API.js Models Setup Guide

## Download Required Models

The face verification feature requires face-api.js models to be placed in the `public/models` directory.

### Option 1: Download via Script (Recommended)

Run this PowerShell command in your project root:

```powershell
# Create models directory
New-Item -ItemType Directory -Force -Path "public\models"

# Download models
$baseUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
$models = @(
    "tiny_face_detector_model-weights_manifest.json",
    "tiny_face_detector_model-shard1",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model-shard1",
    "face_recognition_model-weights_manifest.json",
    "face_recognition_model-shard1",
    "face_recognition_model-shard2",
    "face_expression_model-weights_manifest.json",
    "face_expression_model-shard1"
)

foreach ($model in $models) {
    $url = "$baseUrl/$model"
    $output = "public\models\$model"
    Write-Host "Downloading $model..."
    Invoke-WebRequest -Uri $url -OutFile $output
}

Write-Host "All models downloaded successfully!"
```

### Option 2: Manual Download

1. Go to: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
2. Download these files to `public/models/`:
   - tiny_face_detector_model-weights_manifest.json
   - tiny_face_detector_model-shard1
   - face_landmark_68_model-weights_manifest.json
   - face_landmark_68_model-shard1
   - face_recognition_model-weights_manifest.json
   - face_recognition_model-shard1
   - face_recognition_model-shard2
   - face_expression_model-weights_manifest.json
   - face_expression_model-shard1

### Verify Installation

After downloading, your `public/models/` folder should contain 9 files.

## Database Setup

Run the SQL migration file:
```sql
-- File: database/face_verification_schema.sql
```

This will:
- Add face verification fields to the applications table
- Create the storage bucket for live face captures
- Set up proper storage policies

## How It Works

1. User clicks "Verify Face" button on pending face verification step
2. Camera activates with live face detection overlay
3. User follows instructions:
   - Look straight
   - Turn head left
   - Turn head right
   - Blink twice
4. System captures frames and compares with NID face image
5. Face matching using face descriptors (128-dimensional vectors)
6. If match score >= 60%, verification succeeds
7. Database updated and notifications sent to user and admin

## Technology Stack

- **TensorFlow.js**: Machine learning in browser
- **face-api.js**: Face detection and recognition
- **MediaPipe Face Mesh**: Accurate facial landmarks
- **Real-time Processing**: All done client-side for privacy and speed
