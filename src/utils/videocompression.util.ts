// utils/videoCompression.util.ts

import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";
import os from "os";

ffmpeg.setFfmpegPath(ffmpegPath as unknown as string);

export const compressVideo = (file: Express.Multer.File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const inputPath = path.join(os.tmpdir(), `${Date.now()}-input.mp4`);
        const outputPath = path.join(os.tmpdir(), `${Date.now()}-output.mp4`);

        fs.writeFileSync(inputPath, file.buffer);

        ffmpeg(inputPath)
            .outputOptions([
                "-t 60", // ⏱️ max 60 sec
                "-vf scale=1280:-2", // resize
                "-preset veryfast",
                "-crf 28",
            ])
            .videoCodec("libx264")
            .format("mp4")
            .on("end", () => resolve(outputPath))
            .on("error", reject)
            .save(outputPath);
    });
};