/**
 * Exercise Library Seed Script
 *
 * Fetches 1,324 exercises from the open-source hasaneyldrm/exercises-dataset,
 * uploads animation GIFs and thumbnails to S3/MinIO, and upserts every
 * record into the exercise_library table.
 *
 * Run: node scripts/seed-exercise-library.js
 *
 * Flags:
 *   --skip-upload    Skip S3 upload; use GitHub raw URLs instead
 *   --dry-run        Print stats without writing to DB or S3
 *   --batch=N        Override batch size (default 50)
 *   --concurrency=N  Override download concurrency (default 8)
 *
 * Dataset: https://github.com/hasaneyldrm/exercises-dataset
 * Media:   © Gym visual — https://gymvisual.com/
 */

require('dotenv').config();

const https = require('https');
const http = require('http');
const { supabaseAdmin } = require('../config/supabase');
const config = require('../config');

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const UPLOAD_TO_S3 = args.includes('--upload-s3');
const SKIP_UPLOAD = !UPLOAD_TO_S3 || args.includes('--skip-upload');
const DRY_RUN = args.includes('--dry-run');
const BATCH_SIZE = parseInt((args.find((a) => a.startsWith('--batch=')) || '').split('=')[1] || '50', 10);
const CONCURRENCY = parseInt((args.find((a) => a.startsWith('--concurrency=')) || '').split('=')[1] || '8', 10);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DATASET_URL = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json';
const GITHUB_RAW_BASE = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main';
const ATTRIBUTION = '© Gym visual — https://gymvisual.com/';
const S3_PREFIX = 'exercises';

// Category → workout_type mapping (maps the dataset's category to our DB's workout_type)
const CATEGORY_TO_WORKOUT_TYPE = {
  'chest': 'strength',
  'back': 'strength',
  'upper arms': 'strength',
  'lower arms': 'strength',
  'upper legs': 'strength',
  'lower legs': 'strength',
  'shoulders': 'strength',
  'waist': 'strength',
  'neck': 'strength',
  'cardio': 'cardio',
};

// Refined workout_type based on exercise name patterns (more granular than category alone)
const inferWorkoutType = (name, category) => {
  const n = (name || '').toLowerCase();
  if (n.includes('stretch') || n.includes('stretching')) return 'stretching';
  if (n.includes('yoga') || n.includes('asana')) return 'yoga';
  if (n.includes('pilates')) return 'pilates';
  if (n.includes('plank') || n.includes('hold') || n.includes('wall sit') || n.includes('dead hang')) return 'isometric';
  if (n.includes('jump') || n.includes('burpee') || n.includes('box jump') || n.includes('plyometric')) return 'plyometrics';
  if (n.includes('run') || n.includes('jog') || n.includes('cycling') || n.includes('rowing') || n.includes('elliptical') || n.includes('skierg') || n.includes('stepmill')) return 'cardio';
  if (n.includes('crunch') || n.includes('sit-up') || n.includes('leg raise') || n.includes('russian twist') || n.includes('v-up') || n.includes('bicycle') || n.includes('mountain climber')) return 'core';
  if (n.includes('push-up') || n.includes('pushup') || n.includes('pull-up') || n.includes('pullup') || n.includes('chin-up') || n.includes('dip') || n.includes('body weight')) return 'calisthenics';
  return CATEGORY_TO_WORKOUT_TYPE[category] || 'strength';
};

// Target muscle → sub_category for finer-grained UI filtering
const TARGET_TO_SUB_CATEGORY = {
  'abs': 'Core & Abs',
  'pectorals': 'Chest',
  'biceps': 'Biceps',
  'glutes': 'Glutes & Hips',
  'delts': 'Shoulders',
  'triceps': 'Triceps',
  'upper back': 'Upper Back',
  'lats': 'Lats & Back',
  'calves': 'Calves',
  'quads': 'Quads',
  'forearms': 'Forearms & Grip',
  'cardiovascular system': 'Cardio & Endurance',
  'hamstrings': 'Hamstrings',
  'spine': 'Spine & Posture',
  'traps': 'Traps & Neck',
  'adductors': 'Inner Thighs',
  'abductors': 'Outer Thighs',
  'serratus anterior': 'Serratus & Ribs',
  'levator scapulae': 'Neck & Scapula',
};

// Equipment normalization
const normalizeEquipment = (eq) => {
  if (!eq) return 'bodyweight';
  return eq.toLowerCase().replace(/\s+/g, '_');
};

// Level assignment heuristic based on equipment and exercise name patterns
const assignLevel = (exercise) => {
  const name = (exercise.name || '').toLowerCase();
  const eq = (exercise.equipment || '').toLowerCase();

  // Advanced indicators
  if (name.includes('muscle-up') || name.includes('planche') || name.includes('pistol') ||
      name.includes('handstand') || name.includes('one-arm') || name.includes('dragon flag') ||
      name.includes('front lever') || name.includes('human flag')) {
    return 'advanced';
  }

  // Intermediate indicators
  if (name.includes('weighted') || name.includes('deficit') || name.includes('decline') ||
      name.includes('incline') || name.includes('behind the neck') ||
      eq === 'barbell' || eq === 'olympic barbell' || eq === 'trap bar' ||
      eq === 'smith machine') {
    return 'intermediate';
  }

  // Beginner by default
  if (eq === 'body weight' || eq === 'bodyweight' || eq === '' ||
      name.includes('basic') || name.includes('assisted')) {
    return 'beginner';
  }

  return 'beginner';
};

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------
const fetchJson = (url) => new Promise((resolve, reject) => {
  const client = url.startsWith('https') ? https : http;
  const req = client.get(url, { headers: { 'User-Agent': 'Swastik-Seeder/1.0' } }, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      return fetchJson(res.headers.location).then(resolve).catch(reject);
    }
    if (res.statusCode !== 200) {
      return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
    }
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch (e) { reject(new Error(`JSON parse error for ${url}: ${e.message}`)); }
    });
    res.on('error', reject);
  });
  req.on('error', reject);
  req.setTimeout(60000, () => { req.destroy(); reject(new Error(`Timeout fetching ${url}`)); });
});

const fetchBuffer = (url) => new Promise((resolve, reject) => {
  const client = url.startsWith('https') ? https : http;
  const req = client.get(url, { headers: { 'User-Agent': 'Swastik-Seeder/1.0' } }, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      return fetchBuffer(res.headers.location).then(resolve).catch(reject);
    }
    if (res.statusCode !== 200) {
      return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
    }
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => resolve(Buffer.concat(chunks)));
    res.on('error', reject);
  });
  req.on('error', reject);
  req.setTimeout(30000, () => { req.destroy(); reject(new Error(`Timeout fetching ${url}`)); });
});

// ---------------------------------------------------------------------------
// S3 upload helpers (using the existing storage config)
// ---------------------------------------------------------------------------
let storageModule = null;

const initStorage = async () => {
  if (SKIP_UPLOAD || DRY_RUN) return;
  try {
    storageModule = require('../config/minio');
    if (storageModule.initializeBucket) {
      await storageModule.initializeBucket();
    }
    console.log(`✅ Storage ready (${storageModule.storageProvider || 'minio'})`);
  } catch (err) {
    console.warn(`⚠️  Storage init failed: ${err.message} — falling back to GitHub raw URLs`);
    storageModule = null;
  }
};

const uploadToStorage = async (objectName, buffer, contentType) => {
  if (!storageModule) return null;
  try {
    // Use putObject directly without image optimization (GIFs shouldn't be converted to WebP)
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const s3Client = storageModule.s3Client;
    const minioClient = storageModule.minioClient;
    const bucketName = config.storage.bucketName;
    const cacheControl = 'public, max-age=2592000, immutable'; // 30 days

    if (s3Client) {
      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: objectName,
        Body: buffer,
        ContentType: contentType,
        CacheControl: cacheControl,
      }));
    } else if (minioClient) {
      await minioClient.putObject(bucketName, objectName, buffer, buffer.length, {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      });
    } else {
      return null;
    }

    return storageModule.getPublicObjectUrl
      ? storageModule.getPublicObjectUrl(objectName)
      : `${config.storage.publicUrl}/${objectName}`;
  } catch (err) {
    console.warn(`   ⚠️  Upload failed for ${objectName}: ${err.message}`);
    return null;
  }
};

// Concurrency-limited batch downloader + uploader
const uploadWithConcurrency = async (items, concurrency) => {
  const results = new Array(items.length);
  let index = 0;

  const worker = async () => {
    while (index < items.length) {
      const i = index++;
      const { sourceUrl, objectName, contentType } = items[i];
      try {
        const buffer = await fetchBuffer(sourceUrl);
        const url = await uploadToStorage(objectName, buffer, contentType);
        results[i] = url;
      } catch {
        results[i] = null;
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
};

// ---------------------------------------------------------------------------
// Transform dataset record → exercise_library row
// ---------------------------------------------------------------------------
const transformExercise = (ex, urls = {}) => {
  const slug = `exdb-${ex.id}`;
  const equipmentNormalized = normalizeEquipment(ex.equipment);
  const category = (ex.category || '').toLowerCase();
  const target = (ex.target || '').toLowerCase();
  const workoutType = inferWorkoutType(ex.name, category);
  const subCategory = TARGET_TO_SUB_CATEGORY[target] || category.replace(/^\w/, c => c.toUpperCase()) || null;
  const level = assignLevel(ex);

  // Extract multi-language instructions
  const instructions = ex.instruction_steps?.en || [];
  const instructionsMultilang = {};
  const langKeys = ['en', 'es', 'it', 'tr', 'ru', 'zh', 'hi', 'pl', 'ko', 'fr'];
  for (const lang of langKeys) {
    if (ex.instruction_steps?.[lang]?.length) {
      instructionsMultilang[lang] = ex.instruction_steps[lang];
    } else if (ex.instructions?.[lang]) {
      instructionsMultilang[lang] = [ex.instructions[lang]];
    }
  }

  // Build animation/thumbnail URLs
  const animationUrl = urls.animation || (ex.gif_url ? `${GITHUB_RAW_BASE}/${ex.gif_url}` : null);
  const thumbnailUrl = urls.thumbnail || (ex.image ? `${GITHUB_RAW_BASE}/${ex.image}` : null);

  return {
    slug,
    name: ex.name,
    workout_type: workoutType,
    primary_muscle_group: ex.muscle_group || ex.target || null,
    secondary_muscle_groups: Array.isArray(ex.secondary_muscles) ? ex.secondary_muscles : [],
    equipment: [equipmentNormalized],
    level,
    instructions: instructions.length > 0 ? instructions : (ex.instructions?.en ? [ex.instructions.en] : []),
    safety_notes: [],
    body_part: ex.body_part || category || null,
    target_muscle: ex.target || null,
    category: category || null,
    animation_url: animationUrl,
    video_url: null, // dataset has GIFs, not videos
    thumbnail_url: thumbnailUrl,
    asset_source_url: 'https://gymvisual.com/',
    asset_license: '© Gym visual',
    asset_credit: ATTRIBUTION,
    metadata: {
      dataset_id: ex.id,
      media_id: ex.media_id || null,
      instructions_multilang: instructionsMultilang,
      equipment_original: ex.equipment || null,
      sub_category: subCategory,
    },
    is_active: true,
  };
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const main = async () => {
  const startTime = Date.now();
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   SWASTIK Exercise Library Seeder                       ║');
  console.log('║   Source: hasaneyldrm/exercises-dataset (1,324 exercises)║');
  console.log('║   Media:  © Gym visual — https://gymvisual.com/         ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log();
  if (DRY_RUN) console.log('🏃 DRY RUN — no DB writes, no uploads\n');
  if (SKIP_UPLOAD) console.log('⏭️  SKIP UPLOAD — using GitHub raw URLs\n');

  // 1. Fetch dataset
  console.log('📥 Fetching exercises.json from GitHub...');
  let exercises;
  try {
    exercises = await fetchJson(DATASET_URL);
  } catch (err) {
    console.error(`❌ Failed to fetch dataset: ${err.message}`);
    process.exit(1);
  }
  console.log(`   ✅ Loaded ${exercises.length} exercises\n`);

  // Print stats
  const categories = {};
  const bodyParts = {};
  const equipmentSet = {};
  const targets = {};
  for (const ex of exercises) {
    const cat = (ex.category || 'unknown').toLowerCase();
    const bp = (ex.body_part || 'unknown').toLowerCase();
    const eq = (ex.equipment || 'unknown').toLowerCase();
    const tgt = (ex.target || 'unknown').toLowerCase();
    categories[cat] = (categories[cat] || 0) + 1;
    bodyParts[bp] = (bodyParts[bp] || 0) + 1;
    equipmentSet[eq] = (equipmentSet[eq] || 0) + 1;
    targets[tgt] = (targets[tgt] || 0) + 1;
  }

  console.log('📊 Dataset Statistics:');
  console.log(`   Categories (${Object.keys(categories).length}):`, Object.entries(categories).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}(${v})`).join(', '));
  console.log(`   Body Parts (${Object.keys(bodyParts).length}):`, Object.entries(bodyParts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}(${v})`).join(', '));
  console.log(`   Equipment  (${Object.keys(equipmentSet).length}):`, Object.entries(equipmentSet).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}(${v})`).join(', '));
  console.log(`   Targets    (${Object.keys(targets).length}):`, Object.entries(targets).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => `${k}(${v})`).join(', '));
  console.log();

  if (DRY_RUN) {
    console.log('🏁 Dry run complete. No data written.');
    process.exit(0);
  }

  // 2. Initialize storage
  await initStorage();
  const useS3 = !!storageModule && !SKIP_UPLOAD;

  // 3. Upload assets to S3 (if available)
  const assetUrls = {}; // { exerciseId: { animation, thumbnail } }

  if (useS3) {
    console.log(`\n☁️  Uploading ${exercises.length * 2} assets to S3 (concurrency: ${CONCURRENCY})...`);

    // Process in mega-batches to avoid memory issues
    const UPLOAD_BATCH = 100;
    let uploadedCount = 0;
    let failedCount = 0;

    for (let batchStart = 0; batchStart < exercises.length; batchStart += UPLOAD_BATCH) {
      const batch = exercises.slice(batchStart, batchStart + UPLOAD_BATCH);
      const uploadItems = [];

      for (const ex of batch) {
        if (ex.gif_url) {
          uploadItems.push({
            exerciseId: ex.id,
            type: 'animation',
            sourceUrl: `${GITHUB_RAW_BASE}/${ex.gif_url}`,
            objectName: `${S3_PREFIX}/animations/${ex.id}-${ex.media_id || 'anim'}.gif`,
            contentType: 'image/gif',
          });
        }
        if (ex.image) {
          uploadItems.push({
            exerciseId: ex.id,
            type: 'thumbnail',
            sourceUrl: `${GITHUB_RAW_BASE}/${ex.image}`,
            objectName: `${S3_PREFIX}/thumbnails/${ex.id}-${ex.media_id || 'thumb'}.jpg`,
            contentType: 'image/jpeg',
          });
        }
      }

      const results = await uploadWithConcurrency(uploadItems, CONCURRENCY);

      for (let i = 0; i < uploadItems.length; i++) {
        const item = uploadItems[i];
        if (!assetUrls[item.exerciseId]) assetUrls[item.exerciseId] = {};
        if (results[i]) {
          assetUrls[item.exerciseId][item.type] = results[i];
          uploadedCount++;
        } else {
          failedCount++;
        }
      }

      const progress = Math.min(batchStart + UPLOAD_BATCH, exercises.length);
      process.stdout.write(`\r   📤 Progress: ${progress}/${exercises.length} exercises (${uploadedCount} uploaded, ${failedCount} failed)`);
    }

    console.log(`\n   ✅ Asset upload complete: ${uploadedCount} uploaded, ${failedCount} failed\n`);
  } else {
    console.log('\n📎 Using GitHub raw URLs for assets (no S3 upload)\n');
  }

  // 4. Upsert into exercise_library
  console.log(`📝 Upserting ${exercises.length} exercises into exercise_library (batch size: ${BATCH_SIZE})...`);

  let upsertedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
    const batch = exercises.slice(i, i + BATCH_SIZE);
    const rows = batch.map((ex) => {
      const urls = assetUrls[ex.id] || {};
      return transformExercise(ex, urls);
    });

    try {
      const { error } = await supabaseAdmin
        .from('exercise_library')
        .upsert(rows, { onConflict: 'slug', ignoreDuplicates: false });

      if (error) {
        console.error(`\n   ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} error: ${error.message}`);
        errorCount += batch.length;
      } else {
        upsertedCount += batch.length;
      }
    } catch (err) {
      console.error(`\n   ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} exception: ${err.message}`);
      errorCount += batch.length;
    }

    const progress = Math.min(i + BATCH_SIZE, exercises.length);
    process.stdout.write(`\r   📥 DB Progress: ${progress}/${exercises.length} (${upsertedCount} ok, ${errorCount} failed)`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║   ✅ SEED COMPLETE                                       ║`);
  console.log(`║   Exercises: ${String(upsertedCount).padEnd(6)} upserted                        ║`);
  console.log(`║   Errors:    ${String(errorCount).padEnd(6)}                                  ║`);
  console.log(`║   Assets:    ${useS3 ? 'S3/MinIO' : 'GitHub raw URLs'}${' '.repeat(useS3 ? 30 : 22)}║`);
  console.log(`║   Time:      ${elapsed}s${' '.repeat(Math.max(0, 38 - elapsed.length))}║`);
  console.log(`╚══════════════════════════════════════════════════════════╝`);

  process.exit(errorCount > 0 ? 1 : 0);
};

main().catch((err) => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
