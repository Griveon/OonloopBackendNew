import multer from "multer";

/**
 * Buy-For-Me shopping-list image upload.
 * Separate from the shared vendor/personal-shopper uploader:
 *  - images only (no videos)
 *  - 5 MB cap (a list photo doesn't need the shared 50 MB)
 */
const storage = multer.memoryStorage();

export const buyForMeImageUpload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
    },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed"));
        }
    },
});
