const multer = require('multer');

// Allowed original file extensions (client encrypts before upload so the
// actual blob has no extension, but direct-API callers must match this list)
const ALLOWED_EXT = /\.(pdf|docx?|xlsx?|pptx?|jpe?g|png|gif|webp|txt|csv|zip|7z|tar|gz|enc)$/i;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    fileFilter: (_req, file, cb) => {
        const name = file.originalname || '';
        const hasExt = /\.[^.]+$/.test(name);
        // Allow encrypted blobs (no extension) and known-safe extensions
        if (!hasExt || ALLOWED_EXT.test(name)) {
            return cb(null, true);
        }
        const ext = name.match(/\.[^.]+$/)?.[0] ?? '';
        cb(new Error(`File type '${ext}' is not permitted.`));
    },
});

module.exports = upload;
