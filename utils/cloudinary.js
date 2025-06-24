const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'FeedHope',
    allowed_formats: ['jpg', 'png', 'pdf'],
  },
});


const upload = multer({
    storage,
    limits: {
        fileSize: 100 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpg', 'image/jpeg'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Invalid file type. Only PDF, PNG, and JPG are allowed.'));
        }
        cb(null, true);
    },
});

module.exports = { cloudinary, storage, upload };