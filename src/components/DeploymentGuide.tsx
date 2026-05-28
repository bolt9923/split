import React, { useState } from 'react';
import { BookOpen, Github, Server, Terminal, ShieldCheck, ArrowRight, Check, Play, Settings, AlertCircle, Copy, Download, Code, Layers } from 'lucide-react';

export default function DeploymentGuide() {
  const [activeTab, setActiveTab] = useState<'github' | 'botfather' | 'heroku' | 'ffmpeg'>('github');
  const [selectedFile, setSelectedFile] = useState<'bot.py' | 'requirements.txt' | 'Procfile' | 'README.md'>('bot.py');
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (fileName: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(fileName);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownloadFile = (fileName: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Deployment file templates
  const fileTemplates = {
    'bot.py': `import os
import sys
import subprocess
import math
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

# Setup high quality server logs
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Fetch Telegram Secret Config Token from System Environment
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    welcome_text = (
        "👋 Welcome to TeleSplit Video Master Bot!\\n\\n"
        "How to use:\\n"
        "1. Send or upload any video directly to this bot chat.\\n"
        "2. Add a Caption like:\\n"
        "   • '3' to automatically cut/split into 3 equal parts.\\n"
        "   • '30' to slice recursively every 30 seconds interval.\\n"
        "3. Or, reply to any sent video with the desired split number!\\n\\n"
        "The bot will automatically download, analyze media duration, apply FFmpeg, "
        "and return all formatted slices back to you! 🎬"
    )
    await update.message.reply_text(welcome_text)

async def handle_video(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # Check regular message video first or check video files sent as unstructured documents
    video = update.message.video or (
        update.message.document 
        if update.message.document and update.message.document.mime_type.startswith('video/') 
        else None
    )
    
    # Check if text was sent as a reply to a previous active video
    if not video:
        if update.message.text and update.message.reply_to_message:
            reply = update.message.reply_to_message
            video = reply.video or (
                reply.document 
                if reply.document and reply.document.mime_type.startswith('video/') 
                else None
            )
            if video:
                split_param = update.message.text.strip()
            else:
                await update.message.reply_text("❌ Please reply to a video message or upload a video directly!")
                return
        else:
            await update.message.reply_text("❌ Please upload a video or reply to a video with your split value!")
            return
    else:
        split_param = update.message.caption.strip() if update.message.caption else "3"

    # Evaluate splitting strategy integer
    try:
        val = int(split_param)
        if val <= 0:
            raise ValueError()
    except ValueError:
        val = 3 # default to 3 parts

    status_msg = await update.message.reply_text("⚡ Downloading video from Telegram servers... Please hold on.")
    
    try:
        # Download physical file using Python-Telegram-Bot API methods
        file = await context.bot.get_file(video.file_id)
        input_filename = f"input_{video.file_id}.mp4"
        await file.download_to_drive(input_filename)
        
        await status_msg.edit_text("🎬 Video cached! Running FFmpeg analyzer...")

        # Fetch actual media duration using ffprobe standard container hooks
        try:
            duration_cmd = f"ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 {input_filename}"
            duration = float(subprocess.check_output(duration_cmd, shell=True).decode('utf-8').strip())
        except Exception as probe_err:
            logger.error(f"Error reading ffprobe metadata: {probe_err}")
            duration = float(video.duration) if hasattr(video, 'duration') and video.duration else 30.0

        # Decide split seconds or numbers strategy
        if val >= 5:
            # Slices every S seconds
            clip_duration = val
            total_parts = math.ceil(duration / clip_duration)
        else:
            # Custom balanced parts
            total_parts = val
            clip_duration = math.ceil(duration / total_parts)

        await status_msg.edit_text(
            f"✂️ Cutting video into {total_parts} clips (~{clip_duration} seconds each)..."
        )

        generated_files = []
        for i in range(total_parts):
            start_time = i * clip_duration
            if start_time >= duration:
                break
                
            output_filename = f"part_{i+1}_{video.file_id}.mp4"
            
            # Executing fast binary seek segmentation command
            ffmpeg_cmd = (
                f"ffmpeg -y -ss {start_time} -t {clip_duration} -i {input_filename} "
                f"-c:v libx264 -preset superfast -crf 23 -c:a aac -b:v 1500k {output_filename}"
            )
            
            subprocess.run(ffmpeg_cmd, shell=True, check=True)
            generated_files.append((i+1, output_filename))

        await status_msg.edit_text(f"🚀 Processing completed! Syncing {len(generated_files)} clips...")

        # Reply with the completed movie slices
        for part_num, filename in generated_files:
            if os.path.exists(filename):
                with open(filename, 'rb') as video_file:
                    await update.message.reply_video(
                        video=video_file,
                        caption=f"🎥 Segment {part_num}/{total_parts} Output\\n⏱️ Slice duration: ~{clip_duration}s",
                        supports_streaming=True
                    )
                # instant clean
                os.remove(filename)

        # Finished feedback
        await update.message.reply_text("✅ All video clips splitted and delivered successfully!")

    except Exception as e:
        logger.error(f"General processing error: {e}")
        await update.message.reply_text(f"❌ Error while running split task: {str(e)}")

    finally:
        # Absolute storage cleanup
        if 'input_filename' in locals() and os.path.exists(input_filename):
            os.remove(input_filename)
        await status_msg.delete()

def main():
    if not TOKEN:
        print("CRITICAL: TELEGRAM_BOT_TOKEN environment variable not set!")
        sys.exit(1)
        
    app = Application.builder().token(TOKEN).build()
    
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.VIDEO | filters.Document.VIDEO, handle_video))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_video))
    
    print("Agent started successfully. Listening to Telegram requests...")
    app.run_polling()

if __name__ == '__main__':
    main()`,
    
    'requirements.txt': `python-telegram-bot==20.8
requests==2.31.0
urllib3==2.1.0`,

    'Procfile': `worker: python bot.py`,

    'README.md': `# TeleSplit Video Splicer & Poster Bot 🚀

This is a comprehensive, production-ready Python Telegram bot that automatically downloads video files, parses exact duration metadata, and recursively splits them into custom parts or seconds segments using high-performance FFmpeg native processing.

## 🛠️ Heroku Configurations

1. Push this complete codebase to a **GitHub Repository**.
2. Connect your repository to **Heroku App Manager**.
3. Go to the **Settings** tab on Heroku, and add the **FFmpeg Buildpack**:
   \`\`\`
   https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git
   \`\`\`
4. Add your Telegram credentials as Config Var:
   - Key: \`TELEGRAM_BOT_TOKEN\` 
   - Value: \`[your_telegram_api_token]\`
5. Go to the **Resources** tab and activate the scaling worker thread!
`
  };

  return (
    <div id="deployment-guide-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              GitHub to Heroku Deployment & Bot Setup Guide 🚀
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Follow these simple step-by-step instructions to push your code to GitHub, connect to Heroku, and launch your video-splitter bot globally!
            </p>
          </div>
        </div>
        <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-lg text-xs font-mono font-medium">
          Step-by-Step Deploy
        </span>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <button
          onClick={() => setActiveTab('github')}
          className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
            activeTab === 'github'
              ? 'bg-indigo-950/40 border-indigo-500 text-indigo-350'
              : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800'
          }`}
        >
          <Github className="w-4 h-4" />
          1. GitHub Setup
        </button>

        <button
          onClick={() => setActiveTab('botfather')}
          className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
            activeTab === 'botfather'
              ? 'bg-indigo-950/40 border-indigo-500 text-indigo-350'
              : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          2. Create Telegram Bot
        </button>

        <button
          onClick={() => setActiveTab('heroku')}
          className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
            activeTab === 'heroku'
              ? 'bg-indigo-950/40 border-indigo-500 text-indigo-350'
              : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800'
          }`}
        >
          <Server className="w-4 h-4" />
          3. Heroku Deploy
        </button>

        <button
          onClick={() => setActiveTab('ffmpeg')}
          className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
            activeTab === 'ffmpeg'
              ? 'bg-indigo-950/40 border-indigo-500 text-indigo-350'
              : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          4. FFmpeg Buildpack
        </button>
      </div>

      {/* Tab Panels Contents */}
      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
        
        {activeTab === 'github' && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Github className="text-purple-400 w-5 h-5" />
              Step 1: Save & Upload Bot Source Code to GitHub
            </h4>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              To host on Heroku, you must store your python or Node.js code inside a Git Repository.
            </p>

            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-purple-400 flex items-center justify-center shrink-0">1</div>
                <div>
                  <h5 className="text-xs font-bold text-slate-200">Prepare local files</h5>
                  <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                    Create a folder on your computer. Create two files: <code className="text-purple-400 font-mono">bot.py</code> (paste the generated Python code) and <code className="text-purple-400 font-mono">requirements.txt</code> with dependencies.
                  </p>
                  <pre className="p-2.5 bg-slate-900 rounded border border-slate-850 text-[10px] font-mono text-slate-300 mt-2">
                    {`# requirements.txt
python-telegram-bot==20.8
requests==2.31.0`}
                  </pre>
                  <p className="text-[11px] text-slate-400 leading-normal mt-2">
                    Add a file named <code className="text-purple-400 font-mono">Procfile</code> (without any file extension) so Heroku knows how to run the bot:
                  </p>
                  <pre className="p-2.5 bg-slate-900 rounded border border-slate-850 text-[10px] font-mono text-slate-300 mt-2">
                    {`worker: python bot.py`}
                  </pre>
                </div>
              </div>

              <div className="flex gap-3 border-t border-slate-900 pt-3">
                <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-purple-400 flex items-center justify-center shrink-0">2</div>
                <div>
                  <h5 className="text-xs font-bold text-slate-200">Push to GitHub Repository</h5>
                  <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                    Initialize git in your workspace terminal, create a new <strong>Private GitHub Repository</strong>, and run these commands to upload your code:
                  </p>
                  <pre className="p-3 bg-slate-900 rounded border border-slate-850 text-[10px] font-mono text-slate-300 mt-2 space-y-1 block">
                    <div>git init</div>
                    <div>git add .</div>
                    <div>git commit -m "Initial commit for TeleSplit Bot"</div>
                    <div>git branch -M main</div>
                    <div>git remote add origin https://github.com/your-username/your-repository-name.git</div>
                    <div>git push -u origin main</div>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'botfather' && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Terminal className="text-purple-400 w-5 h-5" />
              Step 2: Create a Telegram Bot and Get API Token
            </h4>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Follow these simple actions on Telegram to provision a live bot and retrieve an access token.
            </p>

            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-purple-400 flex items-center justify-center shrink-0">1</div>
                <div className="text-xs">
                  <h5 className="font-bold text-slate-200">Open BotFather on Telegram</h5>
                  <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                    Click on the search bar or go directly to <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-purple-400 underline font-semibold">t.me/BotFather</a> and start the conversation.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 border-t border-slate-900 pt-3">
                <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-purple-400 flex items-center justify-center shrink-0">2</div>
                <div className="text-xs">
                  <h5 className="font-bold text-slate-200">Create the bot</h5>
                  <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                    Type or click <code className="text-purple-400 font-mono">/newbot</code> command. Follow the conversational prompts:
                  </p>
                  <ul className="list-disc pl-4 mt-1.5 space-y-1 text-[11px] text-slate-400 leading-relaxed">
                    <li>Provide a display name for your bot (e.g. <code>Dynamic Video Splicer</code>)</li>
                    <li>Provide a unique username ending with <code className="font-semibold text-purple-300">_bot</code> (e.g. <code>TeleSplitCutter_bot</code>)</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 border-t border-slate-900 pt-3">
                <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-purple-400 flex items-center justify-center shrink-0">3</div>
                <div className="text-xs">
                  <h5 className="font-bold text-slate-200">Copy the API Token Credentials</h5>
                  <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                    BotFather will reply with an API token. Copy this token immediately and paste it into the <strong>Developer API Token Credentials</strong> input panel inside this app to test connection first.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'heroku' && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Server className="text-purple-400 w-5 h-5" />
              Step 3: Deploy to Heroku and Link GitHub
            </h4>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Configure automated deployment pipelines straight from your private Git repository.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-900 p-4 border border-slate-850 rounded-xl space-y-2">
                <span className="text-[10px] bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded font-mono font-bold">A. Create App</span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Log in to your <strong>Heroku Dashboard</strong>. Click <strong>New &gt; Create New App</strong>, type a unique name, and click Create.
                </p>
              </div>

              <div className="bg-slate-900 p-4 border border-slate-850 rounded-xl space-y-2">
                <span className="text-[10px] bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded font-mono font-bold">B. Connect GitHub</span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Under the <strong>Deploy</strong> tab, choose <strong>Deployment Method &gt; GitHub</strong>. Search and connect the private bot repository you created.
                </p>
              </div>

              <div className="bg-slate-900 p-4 border border-slate-850 rounded-xl space-y-2">
                <span className="text-[10px] bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded font-mono font-bold">C. Start Worker</span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Go to the <strong>Resources</strong> tab on Heroku, disable the web dyno, and <strong>Enable/Turn On the "worker"</strong> dyno to execute your Procfile bot stream!
                </p>
              </div>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-850 space-y-2 mt-2">
              <h5 className="text-xs font-bold text-slate-250 flex items-center gap-1.5 text-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Set Heroku Environment Variables (Config Vars)
              </h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                You must hide secrets and configuration items from code. Go to <strong>Settings &gt; Reveal Config Vars</strong> on your Heroku Dashboard and register your credentials:
              </p>
              <pre className="p-3 bg-slate-950 rounded text-[10px] font-mono text-slate-300 block space-y-1 leading-normal">
                <div>Key: <code className="text-purple-400">TELEGRAM_BOT_TOKEN</code>  |  Value: <code className="text-slate-400">your_api_token_here</code></div>
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'ffmpeg' && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Settings className="text-purple-400 w-5 h-5" />
              Step 4: CRITICAL - Add FFmpeg Buildpack to Heroku
            </h4>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Because Heroku containers do not come pre-equipped with FFmpeg binaries, your bot will fail to process splits and render overlays unless you attach an FFmpeg buildpack!
            </p>

            <div className="bg-amber-950/20 border border-amber-900/30 p-4 rounded-xl text-xs text-amber-300 space-y-2 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 text-amber-300">
                <AlertCircle className="w-4.5 h-4.5 text-amber-405" />
                Add these Buildpacks in the EXACT sequence below:
              </div>
              <p className="text-slate-400 text-[11px]">
                Navigate to <strong>Settings &gt; Buildpacks</strong> on your Heroku app dashboard, click <strong>Add buildpack</strong> and paste:
              </p>
              
              <div className="space-y-2 pt-1">
                <div className="bg-slate-950 p-2.5 rounded border border-slate-850 font-mono text-[10px] text-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <span>1. <code>https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git</code></span>
                  <span className="text-[9px] uppercase bg-purple-950/60 text-purple-400 border border-purple-900/40 px-1.5 py-0.5 rounded">FFmpeg Binary</span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded border border-slate-850 font-mono text-[10px] text-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <span>2. <code>heroku/python</code> (or <code>heroku/nodejs</code> as set)</span>
                  <span className="text-[9px] uppercase bg-emerald-950/60 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.5 rounded">Standard runtime</span>
                </div>
              </div>

              <p className="text-slate-400 text-[11px] pt-1">
                Once save is complete, trigger a manual rebuild in your Heroku <strong>Deploy</strong> tab & your TeleSplit Bot is fully live on Telegram to compress, format, cut, watermark, and publish reels!
              </p>
            </div>
          </div>
        )}

      </div>

      {/* NEW SECTION: Sab files download and workspace selector for manual copy */}
      <div id="project-source-workspace" className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-md font-bold text-slate-100 flex items-center gap-2">
              <Layers className="text-indigo-400 w-5 h-5 animate-pulse" />
              📁 Project Source Workspace (Ready to Copy & Save)
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Create these files inside your GitHub folder to build a complete Python Telegram Bot setup on Heroku!
            </p>
          </div>
          <button
            onClick={() => {
              // Quick download of all files together
              Object.entries(fileTemplates).forEach(([name, content]) => {
                handleDownloadFile(name, content);
              });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold select-none transition"
          >
            <Download className="w-4 h-4" />
            Download All Local Files (.ZIP helper)
          </button>
        </div>

        {/* File Explorer tab line */}
        <div className="flex flex-wrap gap-1.5 border-b border-slate-850 pb-2">
          {Object.keys(fileTemplates).map((fileName) => (
            <button
              key={fileName}
              onClick={() => setSelectedFile(fileName as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition flex items-center gap-1.5 ${
                selectedFile === fileName
                  ? 'bg-slate-900 border border-slate-800 text-indigo-450 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/45'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              {fileName}
            </button>
          ))}
        </div>

        {/* Selected file content view */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs bg-slate-900 px-4 py-2 border-b border-slate-800 rounded-t-xl">
            <span className="font-mono text-slate-300 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Workspace: {selectedFile}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(selectedFile, fileTemplates[selectedFile])}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-200 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 transition"
              >
                {copied === selectedFile ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Code
                  </>
                )}
              </button>
              <button
                onClick={() => handleDownloadFile(selectedFile, fileTemplates[selectedFile])}
                className="flex items-center gap-1 text-slate-450 hover:text-slate-200 bg-indigo-950/40 text-indigo-400 px-2.5 py-1 rounded border border-indigo-900/30 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            </div>
          </div>

          <pre className="p-4 bg-black/95 rounded-b-xl border border-slate-850 font-mono text-[11px] text-slate-250 leading-relaxed overflow-x-auto max-h-[420px]">
            {fileTemplates[selectedFile]}
          </pre>
        </div>
      </div>

    </div>
  );
}
