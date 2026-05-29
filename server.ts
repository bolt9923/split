import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());

// Initialize Gemini Client Lazily/Safely with custom developer build agent tag
let ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!ai && process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
}

// 1. Health checks or diagnostic endpoints
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 2. Validate Telegram Bot API Token - live check via Telegram Bot API
app.post("/api/telegram-validate", async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  try {
    const telegramRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await telegramRes.json();
    if (data.ok) {
      return res.json({
        ok: true,
        botUser: data.result.username,
        botName: data.result.first_name,
        canJoinGroups: data.result.can_join_groups
      });
    } else {
      return res.json({
        ok: false,
        error: data.description || "Invalid token structure"
      });
    }
  } catch (err: any) {
    return res.json({
      ok: false,
      error: `Could not connect to Telegram servers: ${err.message}`
    });
  }
});

// 3. Gemini Hook Generator for Viral Titles / Clip Cliffhangers
app.post("/api/gemini/suggest-viral-hooks", async (req, res) => {
  const { category, platform } = req.body;
  const client = getGeminiClient();

  if (!client) {
    // Elegant fallback if no key available
    return res.json([
      {
        title: `Ultimate ${category || "Tips"} - Part {part}`,
        cliffhanger: "Cut right before the final secret is shown or result is revealed.",
        viralFactor: "Curiosity gap. Viewers must click through to see the climax."
      },
      {
        title: `Why Nobody Talks About This... (Ep. {part})`,
        cliffhanger: "Stop as you start answering the main question with 'And here is why...'.",
        viralFactor: "High-level visual suspense. Compels immediate swipe-over."
      },
      {
        title: `Stop Making This Mistake! [Part {part}]`,
        cliffhanger: "Highlight the mistake but split immediately before demonstrating the correct method.",
        viralFactor: "Fear of missing out and self-improvement drive."
      }
    ]);
  }

  try {
    const defaultPlatform = platform || "Instagram Reels";
    const defaultCategory = category || "Life hacks / Tutorials";

    const prompt = `You are an expert social media strategist and automation director. Create 3 highly click-worthy, viral series title formats for videos in the category "${defaultCategory}" split onto "${defaultPlatform}".
    Format the response as a strict JSON array. Each element should match this typescript shape:
    {
      "title": string, // Title with a "{part}" tag, e.g. "Hidden Hacks - Part {part}"
      "cliffhanger": string, // Actionable advice on exactly where the content creator should slice the audio or scene for maximum suspense
      "viralFactor": string // Psychology explaining why this hooks viewers into looking for the next segment
    }
    Make sure titles are concise, sharp, and fit beautiful vertical visual overlays. Respond ONLY with raw JSON, no markdown formatting.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const textResult = response.text?.trim() || "[]";
    const parsedData = JSON.parse(textResult);
    return res.json(parsedData);
  } catch (err: any) {
    return res.json([
      {
        title: `Viral Hack - Part {part}`,
        cliffhanger: "Slice the output segment right before showing the final result.",
        viralFactor: `Direct mystery. Error generating dynamic AI titles: ${err.message}`
      }
    ]);
  }
});

// 4. Generate fully configured deploy-ready scripts for Python or Node Telegram bots
app.post("/api/generate-script", (req, res) => {
  const { overlay, split, token } = req.body;

  // Prepare fallback configurations
  const textTemplate = overlay?.textTemplate || "PART {n}";
  const fontSize = overlay?.fontSize || 36;
  const fontColor = overlay?.fontColor || "#FFFFFF";
  const bgColor = overlay?.bgColor || "rgba(0,0,0,0.65)";
  const position = overlay?.position || "top-center";
  const limitSeconds = split?.durationSeconds || 59;
  const targetQuality = split?.qualityPreset || "full-hd";
  const cleanToken = token || "YOUR_TELEGRAM_BOT_TOKEN_HERE";

  // Position offset translations for FFmpeg Drawtext filter
  let ffmpegX = "(w-text_w)/2";
  let ffmpegY = "50";
  if (position === "bottom-center") {
    ffmpegY = "h-text_h-100";
  } else if (position === "center") {
    ffmpegY = "(h-text_h)/2";
  } else if (position === "top-left") {
    ffmpegX = "50";
    ffmpegY = "50";
  } else if (position === "top-right") {
    ffmpegX = "w-text_w-50";
    ffmpegY = "50";
  } else if (position === "bottom-left") {
    ffmpegX = "50";
    ffmpegY = "h-text_h-100";
  } else if (position === "bottom-right") {
    ffmpegX = "w-text_w-50";
    ffmpegY = "h-text_h-100";
  }

  // Convert Hex to ffmpeg compatible color if needed
  const cleanColor = fontColor.replace("#", "0x") + "@1.0";
  const cleanBg = "0x000000@0.6";

  const pythonScript = `import os
import logging
import math
import subprocess
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes

# Setup logging
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

# Config options from your TeleSplit Workspace
BOT_TOKEN = "${cleanToken}"
SPLIT_DURATION = ${limitSeconds}  # Seconds per short clip
WATERMARK_TEMPLATE = "${textTemplate}" # Template for parts (replaces {n} with index)

# This command runs high-quality splitting and draws overlays directly inside video frames
def process_and_split(input_path, output_dir, file_id):
    # 1. Get length of video
    cmd = f'ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "{input_path}"'
    duration = float(subprocess.check_output(cmd, shell=True).decode('utf-8').strip())
    
    parts_count = math.ceil(duration / SPLIT_DURATION)
    logger.info(f"Video duration is {duration}s. Splitting into {parts_count} parts.")
    
    generated_files = []
    
    for i in range(parts_count):
        start_time = i * SPLIT_DURATION
        part_num = i + 1
        part_label = WATERMARK_TEMPLATE.replace("{n}", str(part_num)).replace("{part}", str(part_num)).replace("{total}", str(parts_count))
        
        output_filename = f"part_{part_num}_{file_id}.mp4"
        output_path = os.path.join(output_dir, output_filename)
        
        # FFmpeg Script optimization:
        # - Burns the Part Label cleanly onto the frame in high quality
        # - Trims output start time and sets the split duration seconds
        # - Encodes to high-quality H264 video streams (yuv420p is required for reels and shorts playback)
        
        drawtext_filter = (
            f"drawtext=text='{part_label}':"
            f"x={ffmpegX}:y={ffmpegY}:"
            f"fontsize={fontSize}:"
            f"fontcolor=white:"
            f"box=1:boxcolor=black@0.6:boxborderw=15"
        )
        
        ffmpeg_cmd = (
            f'ffmpeg -y -ss {start_time} -t {SPLIT_DURATION} -i "{input_path}" '
            f'-vf "{drawtext_filter}" '
            f'-c:v libx264 -preset fast -crf 18 -colorspace bt709 -pix_fmt yuv420p '
            f'-c:a aac -b:a 192k "{output_path}"'
        )
        
        logger.info(f"Splitting Part {part_num} with command: {ffmpeg_cmd}")
        subprocess.run(ffmpeg_cmd, shell=True, check=True)
        generated_files.append((output_path, part_num, parts_count))
        
    return generated_files

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "⚡ *Welcome to TeleSplit Bot!* ⚡\\n\\n"
        "Send me any long video, and I will split it part-by-part with custom overlays "
        "ideal for Instagram Reels, YouTube Shorts, or TikTok with high rendering accuracy!\\n\\n"
        "Currently configured split duration: *${limitSeconds} seconds* per part.",
        parse_mode="Markdown"
    )

async def handle_video(update: Update, context: ContextTypes.DEFAULT_TYPE):
    video = update.message.video or update.message.document
    if not video:
        await update.message.reply_text("Please trigger this by uploading a raw MP4 or Video file!")
        return

    m = await update.message.reply_text("📥 *Downloading your video file...* Please wait.", parse_mode="Markdown")
    
    file_id = video.file_id
    file = await context.bot.get_file(file_id)
    
    input_path = f"input_{file_id}.mp4"
    await file.download_to_drive(input_path)
    
    await m.edit_text("⚙️ *Splitting video with visual high-quality filters & Part titles...*", parse_mode="Markdown")
    
    output_dir = "./output_parts"
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        parts = process_and_split(input_path, output_dir, file_id)
        
        await m.edit_text(f"📤 *Uploading {len(parts)} processed parts directly to you...*", parse_mode="Markdown")
        
        for path, index, total in parts:
            caption = f"🎬 *Part {index}/{total}*\\n\\n🔥 Optimized for seamless distribution. Stay tuned for subsequent chapters!"
            with open(path, "rb") as video_file:
                await update.message.reply_video(
                    video=video_file,
                    caption=caption,
                    parse_mode="Markdown",
                    supports_streaming=True
                )
            os.remove(path) # Clean up output parts
            
        await m.edit_text("✅ *Generation Complete!* All parts uploaded in premium quality!")
        
    except Exception as e:
        logger.error(f"Error while processing video: {str(e)}")
        await m.edit_text(f"❌ *Failed to split video.* Please verify FFmpeg setup on host. Error: {str(e)}")
        
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)

if __name__ == "__main__":
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.VIDEO | filters.Document.VIDEO, handle_video))
    
    print("🚀 TeleSplit Bot is fully live. Waiting for video files...")
    app.run_polling()
`;

  const nodeScript = `const { Telegraf } = require('telegraf');
const fs = require('fs-extra');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const execa = require('execa');

const bot = new Telegraf("${cleanToken}");
const SPLIT_DURATION = ${limitSeconds};
const WATERMARK_TEMPLATE = "${textTemplate}";

bot.start((ctx) => ctx.replyWithMarkdown(
  "⚡ *TeleSplit Node Bot Ready!* ⚡\\\\n\\\\n" +
  "Send a video file, and I will divide it recursively with premium visual text labels!\\\\n" +
  "Engine preset: *Instagram/YouTube Overlay Suite* (Duration limit: *${limitSeconds}s*)"
));

async function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });
}

async function renderWatermarkedSegment(input, output, start, partNum, totalParts) {
  const partText = WATERMARK_TEMPLATE
    .replace('{n}', partNum)
    .replace('{part}', partNum)
    .replace('{total}', totalParts);

  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .seekInput(start)
      .duration(SPLIT_DURATION)
      .videoFilters([
        {
          filter: 'drawtext',
          options: {
            text: partText,
            x: '${ffmpegX}',
            y: '${ffmpegY}',
            fontsize: ${fontSize},
            fontcolor: 'white',
            box: 1,
            boxcolor: 'black@0.6',
            boxborderw: 15
          }
        }
      ])
      .outputOptions([
        '-c:v libx264',
        '-preset fast',
        '-crf 19',
        '-colorspace bt709',
        '-pix_fmt yuv420p',
        '-c:a aac',
        '-b:a 192k'
      ])
      .save(output)
      .on('end', resolve)
      .on('error', reject);
  });
}

bot.on('video', async (ctx) => {
  const fileId = ctx.message.video.file_id;
  const statusEl = await ctx.reply("📥 *Downloading stream...*", { parse_mode: "Markdown" });
  
  try {
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const inputPath = path.join(__dirname, \`input_\${fileId}.mp4\`);
    
    // Download video file
    const response = await fetch(fileLink);
    const buffer = await response.arrayBuffer();
    await fs.writeFile(inputPath, Buffer.from(buffer));
    
    await ctx.telegram.editMessageText(ctx.chat.id, statusEl.message_id, null, "⚙️ *Encoding and burning Part Overlays...*");
    
    const duration = await getVideoDuration(inputPath);
    const partsCount = Math.ceil(duration / SPLIT_DURATION);
    const outputDir = path.join(__dirname, 'split_outputs');
    await fs.ensureDir(outputDir);
    
    for (let i = 0; i < partsCount; i++) {
      const start = i * SPLIT_DURATION;
      const partNum = i + 1;
      const outputPath = path.join(outputDir, \`part_\${partNum}_\${fileId}.mp4\`);
      
      await renderWatermarkedSegment(inputPath, outputPath, start, partNum, partsCount);
      
      await ctx.replyWithVideo(
        { source: outputPath },
        { 
          caption: \`🎬 *Part \${partNum}/\${partsCount}*\\\\n\\\\nProcessed with TeleSplit Studio! 🔥\`,
          parse_mode: "Markdown"
        }
      );
      
      await fs.remove(outputPath);
    }
    
    await fs.remove(inputPath);
    await ctx.telegram.editMessageText(ctx.chat.id, statusEl.message_id, null, "✅ *Finished!* All segments delivered successfully.");
  } catch (err) {
    console.error(err);
    ctx.reply(\`❌ *Format/Processing Error:* \${err.message}\`);
  }
});

bot.launch().then(() => console.log('🚀 Telegraf Video Splitter Bot running!'));
`;

  return res.json({ pythonScript, nodeScript });
});

// Configure Vite & production rendering assets path
if (process.env.NODE_ENV !== "production") {
  createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  }).then((vite) => {
    app.use(vite.middlewares);
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Development Server is running on http://localhost:${PORT}`);
    });
  });
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*all', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Production Server running on port ${PORT}`);
  });
}
