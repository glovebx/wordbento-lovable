import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
// The schema object itself is usually defined in a separate file and imported for drizzle initialization
import * as schema from '../db/schema'; // Keep schema import for drizzle initialization
import { sql } from 'drizzle-orm'; // Import sql tag for raw SQL fragments like RANDOM() and LIKE
import { nanoid } from "nanoid";
import path from 'path';

const upload = new Hono();

// Configure storage paths
// const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
// const AUDIO_DIR = path.join(UPLOAD_DIR, 'audio');
// const VIDEO_DIR = path.join(UPLOAD_DIR, 'video');


// Generate unique filename with extension
function generateFilename(originalName, prefix) {
  const ext = path.extname(originalName);
  return `${prefix}_${nanoid(10)}${ext}`;
}

// Common file upload handler
async function handleFileUpload(c, fileType, fieldName) {
  const user = c.get('user');
  if (!user) {
    return c.json(401, { message: 'Unauthorized' });
  }

  const formData = await c.req.formData();
  const file = formData.get(fieldName);
  const resourceId = parseInt(formData.get('resourceId')?.toString() || '0', 10);

  if (!file) {
    return c.json(400, { message: `No ${fileType} file provided` });
  }

  // Validate file type
  if (
    (fileType === 'audio' && !file.type.startsWith('audio/')) ||
    (fileType === 'video' && !file.type.startsWith('video/'))
  ) {
    return c.json(400, { message: `Invalid ${fileType} file type` });
  }

  // // Generate storage path
  // const dir = fileType === 'audio' ? AUDIO_DIR : VIDEO_DIR;
  const filename = generateFilename(file.name, fileType);
  // const filePath = path.join(dir, filename);

  // Save file to disk
  const arrayBuffer = await file.arrayBuffer();

  // 保存到r2
  // Start a database transaction for inserting into multiple tables
  try {
  //   const objectKey = originalFilename
    const objectPath = filename
    // const imageMimeType = 'image/png';
    let contentType;
    if (fileType === 'audio') {
      contentType = 'audio/mp3';
    } else {
      contentType = 'audio/mpeg';
    }
    // Upload the binary data to R2
    // The put method takes the object key, the data, and optional options like contentType
    const r2Object = await c.env.WORDBENTO_R2.put(objectPath, arrayBuffer, {
      contentType: contentType //|| 'application/octet-stream', // Set the MIME type
      // Add other options here if needed, e.g., customMetadata, httpMetadata
      // httpMetadata: {
      //     cacheControl: 'max-age=31536000', // Example: Cache for 1 year
      // },
    });

    let r2ObjectKey;
    if (r2Object) {
        console.log(`Audio stored successfully in R2 with key: ${r2Object.key}`);
        // Return the key of the stored object
        r2ObjectKey = r2Object.key;
    } else {
          console.error("Failed to upload resource to R2.");
        //  return c.json({ message: `Failed to upload image for "${wordToGenerate}".` }, 500);
        throw new Error("Failed to upload resource to R2.");
    }      

    // Initialize Drizzle with schema
    // The schema object needs to be imported and passed here
    const db = drizzle(c.env.DB, { schema });

    let values = {
          resource_id: resourceId,
      }
    if (fileType === 'audio') {
      values.audio_key = r2ObjectKey;
    } else {
      values.video_key = r2ObjectKey;
    }
    const insertedResult = await db.insert(schema.temp_attachments).values(values)
    // Use .returning() in Drizzle for D1 to get the inserted row
    .returning()
    .get(); // .get() for a single row

    // Check if insertion was successful and returned a row
    if (!insertedResult) {
        throw new Error("Failed to insert resource into table or get inserted row.");
    }

    console.log(`Task "${resourceId}" resource inserted successfully.`);

    return c.json({
      key: r2ObjectKey,
      // size: file.size,
      // type: file.type,
      // resourceId,
      // uploadedBy: user.username
    });
  } catch (dbError) { // Removed type annotation
      console.error(`Database transaction failed for task "${resourceId}":`, dbError);
      return c.json({ message: `Failed to save resource for "${resourceId}".` }, 200);
  }  
}

// // Initialize upload directories on startup
// upload.use('*', async (c, next) => {
//   // await ensureUploadDirs();
//   await next();
// });

// Audio upload endpoint
upload.post('/audio', async (c) => {
  return handleFileUpload(c, 'audio', 'audio');
});

// Video upload endpoint
upload.post('/video', async (c) => {
  return handleFileUpload(c, 'video', 'video');
});

// // Get upload info (protected)
// upload.get('/:type(audio|video)/:filename', async (c) => {
//   const user = c.get('user');
//   if (!user) {
//     return c.json(401, { message: 'Unauthorized' });
//   }

//   const type = c.req.param('type');
//   const filename = c.req.param('filename');
//   const dir = type === 'audio' ? AUDIO_DIR : VIDEO_DIR;
//   const filePath = path.join(dir, filename);

//   try {
//     const stats = await fs.stat(filePath);
//     const fileStream = fs.createReadStream(filePath);

//     return stream(c, async (stream) => {
//       stream.on('error', (err) => {
//         console.error('Stream error:', err);
//       });

//       // Set appropriate content type
//       const contentType = type === 'audio' ? 'audio/mpeg' : 'video/mp4';
//       c.header('Content-Type', contentType);
//       c.header('Content-Length', stats.size.toString());

//       await stream.pipe(fileStream);
//     });
//   } catch (err) {
//     return c.json(404, { message: 'File not found' });
//   }
// });

// // Delete upload (admin only)
// upload.delete('/:type(audio|video)/:filename', async (c) => {
//   const user = c.get('user');
//   if (!user || !user.roles.includes('admin')) {
//     return c.json(403, { message: 'Forbidden' });
//   }

//   const type = c.req.param('type');
//   const filename = c.req.param('filename');
//   const dir = type === 'audio' ? AUDIO_DIR : VIDEO_DIR;
//   const filePath = path.join(dir, filename);

//   try {
//     await fs.unlink(filePath);
//     return c.json({ message: 'File deleted successfully' });
//   } catch (err) {
//     return c.json(404, { message: 'File not found' });
//   }
// });

export default upload;