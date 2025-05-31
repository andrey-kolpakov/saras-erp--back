const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ⬇⬇⬇ множественная загрузка
const sharp = require('sharp');

// множественная загрузка с флагом avatar
app.post('/upload', upload.array('files', 10), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'Файлы не найдены' });
    }

    console.log(req.files);

    const isAvatar = req.body.avatar === 'true'; // флаг
    const avatarsDir = path.join(__dirname, 'uploads', 'avatars');
    const uploadDir = path.join(__dirname, 'uploads');

    if (isAvatar && !fs.existsSync(avatarsDir)) {
        fs.mkdirSync(avatarsDir, { recursive: true });
    }

    const processedFiles = [];

    for (const file of req.files) {
        const ext = path.extname(file.originalname).toLowerCase();
        const isImage = ['.jpg', '.jpeg', '.png'].includes(ext);

        if (isAvatar && isImage) {
            const avatarFilename = `avatar-${Date.now()}-${file.filename}.jpg`;
            const avatarPath = path.join(avatarsDir, avatarFilename);

            try {
                await sharp(file.path)
                    .resize(256, 256, {
                        fit: 'cover',
                        position: 'center'
                    })
                    .jpeg({ quality: 80 })
                    .toFile(avatarPath);

                fs.unlinkSync(file.path); // удаляем оригинал

                processedFiles.push({
                    path: `/uploads/avatars/${avatarFilename}`,
                    filename: avatarFilename,
                    originalname: file.originalname
                });
            } catch (err) {
                console.error('Ошибка обработки аватарки:', err);
                processedFiles.push({
                    error: 'Ошибка обработки аватарки',
                    originalname: file.originalname
                });
            }
        } else {
            // обычный файл
            processedFiles.push({
                path: `/uploads/${file.filename}`,
                filename: file.filename,
                originalname: file.originalname
            });
        }
    }

    res.json(processedFiles);
});


// удаление файла
app.delete('/file/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return res.json({ success: true });
    } else {
        return res.status(404).json({ error: 'Файл не найден' });
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
