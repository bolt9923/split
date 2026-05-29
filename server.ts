import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { spawn } from "child_process";
import fs from "fs";

dotenv.config();

// Resolve portable or environment-configured FFmpeg and FFprobe binaries
let ffmpegPath = "ffmpeg";
let ffprobePath = "ffprobe";

function initBinaries() {
  try {
    // Standard CommonJS requires are native inside the compiled dist/server.cjs
    const req = typeof require !== "undefined" ? require : null;
    if (req) {
      const ffmpegInstaller = req("@ffmpeg-installer/ffmpeg");
      if (ffmpegInstaller && ffmpegInstaller.path) {
        ffmpegPath = ffmpegInstaller.path;
      }
      const ffprobeInstaller = req("@ffprobe-installer/ffprobe");
      if (ffprobeInstaller && ffprobeInstaller.path) {
        ffprobePath = ffprobeInstaller.path;
      }
      console.log("🔔 Logged (CommonJS require): Loaded portable binaries:", { ffmpegPath, ffprobePath });
      return;
    }
  } catch (e: any) {
    console.log("ℹ️ Could not load binaries via require. Attempting ES fallback import:", e.message);
  }

  // Backup dynamic imports for ESM or alternate compilation environments
  if (ffmpegPath === "ffmpeg") {
    import("@ffmpeg-installer/ffmpeg")
      .then((m) => {
        if (m && m.default && m.default.path) {
          ffmpegPath = m.default.path;
        } else if (m && (m as any).path) {
          ffmpegPath = (m as any).path;
        }
        console.log("🔔 Logged (Dynamic import): Loaded portable @ffmpeg-installer/ffmpeg path:", ffmpegPath);
      })
      .catch((e) => {
        console.log("ℹ️ Could not dynamically import @ffmpeg-installer/ffmpeg:", e.message);
      });
  }

  if (ffprobePath === "ffprobe") {
    import("@ffprobe-installer/ffprobe")
      .then((m) => {
        if (m && m.default && m.default.path) {
          ffprobePath = m.default.path;
        } else if (m && (m as any).path) {
          ffprobePath = (m as any).path;
        }
        console.log("🔔 Logged (Dynamic import): Loaded portable @ffprobe-installer/ffprobe path:", ffprobePath);
      })
      .catch((e) => {
        console.log("ℹ️ Could not dynamically import @ffprobe-installer/ffprobe:", e.message);
      });
  }
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());

// Background Long-Polling Telegram Bot Integration
async function startTelegramBotPolling() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log("ℹ️ TELEGRAM_BOT_TOKEN is not configured. Direct web control dashboard is live. Telegram background polling offline.");
    return;
  }

  console.log("🚀 TELEGRAM_BOT_TOKEN detected! Booting integrated video-splitting background client...");
  let offset = 0;

  const poll = async () => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=15`);
      const data = await response.json() as any;

      if (data && data.ok && data.result) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          handleTelegramUpdate(update, token).catch(e => console.error("Error handling Telegram update:", e));
        }
      }
    } catch (err: any) {
      console.error("Polling stream delay or connectivity issue:", err.message);
      await new Promise(r => setTimeout(r, 6000));
    }
    setTimeout(poll, 150);
  };

  poll();
}

async function handleTelegramUpdate(update: any, token: string) {
  const message = update.message;
  if (!message) return;

  const chatId = message.chat.id;
  const text = message.text;
  
  const video = message.video || (message.document && message.document.mime_type?.startsWith("video/") ? message.document : null);

  const sendText = async (txt: string, replyId?: number) => {
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: txt,
          parse_mode: "Markdown",
          reply_to_message_id: replyId
        })
      });
    } catch (e) {
      console.error("Err sending text:", e);
    }
  };

  const sendAction = async (action: string) => {
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, action })
      });
    } catch (e) {}
  };

  // /start command
  if (text && text.startsWith("/start")) {
    await sendText(
      `👋 *Hari Om! Welcome to TeleSplit Video Master Bot!* 🎬\n\n` +
      `Your bot is running perfectly now direct from Heroku! No secondary Python processes needed.\n\n` +
      `*How to split videos in instant high quality:*\n` +
      `1️⃣ *Upload continuous video* directly within this chat.\n` +
      `2️⃣ Enter the split strategy in the caption:\n` +
      `   • Enter a number like \`3\` to clip video inside *3 equal segments*.\n` +
      `   • Enter a number like \`30\` or \`59\` to split recursively every *30/59 seconds intervals*.\n` +
      `3️⃣ Or simply *reply to any sent video* of yours with a number (e.g. \`60\`) and I will process it instantly!\n\n` +
      `Give it a try by uploading an MP4/MOV file! ✨`
    );
    return;
  }

  let splitValue = 30; // default split
  let targetVideo = video;

  if (video && message.caption) {
    const val = parseInt(message.caption.trim());
    if (!isNaN(val) && val > 0) {
      splitValue = val;
    }
  }

  // Reply configuration
  if (!targetVideo && text && message.reply_to_message) {
    const replyMsg = message.reply_to_message;
    const isReplyVideo = replyMsg.video || (replyMsg.document && replyMsg.document.mime_type?.startsWith("video/") ? replyMsg.document : null);
    if (isReplyVideo) {
      const val = parseInt(text.trim());
      if (!isNaN(val) && val > 0) {
        splitValue = val;
        targetVideo = isReplyVideo;
      }
    }
  }

  if (!targetVideo) {
    if (text) {
      await sendText("⚠️ Please upload your video file directly to the bot, or reply to a video with your split parameter! \n*(e.g. Send '30' to cut into 30s clips)*");
    }
    return;
  }

  const statusMsg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "⚡ *Downloading original clip from Telegram cloud logs...* Please hold.",
      parse_mode: "Markdown",
      reply_to_message_id: message.message_id
    })
  });
  const statusJson = await statusMsg.json() as any;
  const statusId = statusJson?.result?.message_id;

  const updateStatus = async (newText: string) => {
    if (!statusId) return;
    try {
      await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: statusId,
          text: newText,
          parse_mode: "Markdown"
        })
      });
    } catch {}
  };

  try {
    const fileId = targetVideo.file_id;
    const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
    const fileJson = await fileRes.json() as any;
    if (!fileJson.ok || !fileJson.result?.file_path) {
      throw new Error("Cannot query file stream download path from Telegram servers.");
    }

    const remotePath = fileJson.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${token}/${remotePath}`;

    const tempInput = path.join(process.cwd(), `input_${fileId}.mp4`);
    const outputDir = path.join(process.cwd(), `splits_${fileId}`);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Direct download
    await sendAction("upload_document");
    const downloadRes = await fetch(downloadUrl);
    const downloadBuf = Buffer.from(await downloadRes.arrayBuffer());
    fs.writeFileSync(tempInput, downloadBuf);

    await updateStatus("🎬 *Video cached! Running FFmpeg codec analyst...*");

    // Grab actual duration via ffprobe
    let duration = 30;
    try {
      duration = await new Promise<number>((resolve, reject) => {
        const p = spawn(ffprobePath, [
          "-v", "error",
          "-show_entries", "format=duration",
          "-of", "default=noprint_wrappers=1:nokey=1",
          tempInput
        ]);
        let out = "";
        p.stdout.on("data", (d) => out += d.toString());
        p.on("close", (code) => {
          if (code === 0) {
            const val = parseFloat(out.trim());
            if (!isNaN(val) && val > 0) {
              resolve(val);
            } else {
              reject(new Error("Invalid duration parse format"));
            }
          } else {
            reject(new Error("ffprobe meta diagnostic failed"));
          }
        });
        p.on("error", reject);
      });
    } catch (err: any) {
      console.warn("⚠️ Local ffprobe is missing or failed. Falling back to Telegram duration info:", err.message);
      duration = targetVideo.duration || 30;
    }

    let totalParts = 1;
    let clipDuration = splitValue;

    if (splitValue < 10) {
      totalParts = splitValue;
      clipDuration = Math.ceil(duration / totalParts);
    } else {
      clipDuration = splitValue;
      totalParts = Math.ceil(duration / clipDuration);
    }

    await updateStatus(`✂️ *Segmenting original scene:* duration *${duration.toFixed(1)}s*.\nCreating *${totalParts} parts* (~${clipDuration}s clip intervals)...`);

    const generatedFiles: string[] = [];

    for (let i = 0; i < totalParts; i++) {
      const startSec = i * clipDuration;
      if (startSec >= duration) break;

      const currentPartNum = i + 1;
      const partLabel = `PART ${currentPartNum}/${totalParts}`;
      const outputFilename = path.join(outputDir, `part_${currentPartNum}.mp4`);

      await sendAction("record_video");

      // FFmpeg dynamic drawing filter parameters for high visual engagement
      const overlayTextFilter = `drawtext=text='${partLabel}':x=(w-text_w)/2:y=80:fontsize=36:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=15`;

      const args = [
        "-y",
        "-ss", startSec.toString(),
        "-t", clipDuration.toString(),
        "-i", tempInput,
        "-vf", overlayTextFilter,
        "-c:v", "libx264",
        "-preset", "superfast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k",
        outputFilename
      ];

      await new Promise<void>((resolve, reject) => {
        const ffmpegJob = spawn(ffmpegPath, args);
        let jobError: any = null;

        ffmpegJob.on("error", (err) => {
          jobError = err;
        });

        ffmpegJob.on("close", (code) => {
          if (code === 0 && !jobError) {
            generatedFiles.push(outputFilename);
            resolve();
          } else {
            console.warn(`⚠️ FFmpeg high-render overlay failed. Attempting direct fast stream copy backup. Details:`, jobError || code);
            // Attempt standard stream copy fallback if drawtext filter rejects custom fonts/shapes on backend
            const fallbackArgs = [
              "-y",
              "-ss", startSec.toString(),
              "-t", clipDuration.toString(),
              "-i", tempInput,
              "-c", "copy",
              outputFilename
            ];
            const fallbackJob = spawn(ffmpegPath, fallbackArgs);
            let fallbackError: any = null;

            fallbackJob.on("error", (err) => {
              fallbackError = err;
            });

            fallbackJob.on("close", (sc) => {
              if (sc === 0 && !fallbackError) {
                generatedFiles.push(outputFilename);
                resolve();
              } else {
                const finalErr = fallbackError || new Error(`Exit code ${sc}`);
                reject(new Error(`Both FFmpeg high-render filter and fast stream copy fallback failed: ${finalErr.message}`));
              }
            });
          }
        });
      });
    }

    await updateStatus(`🚀 *Splitting finished! Syncing ${generatedFiles.length} clips to Telegram chat...*`);

    for (let i = 0; i < generatedFiles.length; i++) {
      const pathFile = generatedFiles[i];
      const partNum = i + 1;
      await sendAction("upload_video");

      const form = new FormData();
      form.append("chat_id", chatId.toString());
      form.append("caption", `🎬 *Segment ${partNum}/${generatedFiles.length} Output*\n⏱️ Duration: ~${clipDuration}s | TeleSplit Studio`);

      const fileStream = fs.readFileSync(pathFile);
      const videoBlob = new Blob([fileStream], { type: "video/mp4" });
      form.append("video", videoBlob, `part_${partNum}.mp4`);

      await fetch(`https://api.telegram.org/bot${token}/sendVideo`, {
        method: "POST",
        body: form
      });
    }

    if (statusId) {
      await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: statusId })
      });
    }

    await sendText(`✅ *TeleSplit Engine delivered successfully!* enjoy your viral clips.`);

    // Cleanup files securely to minimize container storage footprint
    if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }

  } catch (err: any) {
    console.error("Split failure:", err);
    await updateStatus(`❌ *Process Interrupted:* ${err.message || err}`);
  }
}

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
    
    app.listen(PORT, "0.0.0.0", async () => {
      console.log(`Development Server is running on http://localhost:${PORT}`);
      initBinaries();
      startTelegramBotPolling().catch(err => console.error("Error starting Telegram bot background loop:", err));
    });
  });
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*all', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Production Server running on port ${PORT}`);
    initBinaries();
    startTelegramBotPolling().catch(err => console.error("Error starting Telegram bot background loop:", err));
  });
}
