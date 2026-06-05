"""视频反推提示词 — 用 gemini-webapi 分析视频"""
import sys, io, asyncio, subprocess, json, os
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from gemini_webapi import GeminiClient

COOKIE_FILE = Path(__file__).parent / '.cookie'
MAX_DURATION = 15  # 最大支持15秒
FFMPEG = os.path.expandvars(r'%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe')
FFPROBE = FFMPEG.replace('ffmpeg.exe', 'ffprobe.exe')

def compress_video(input_path):
    """自动压缩视频：超过15秒截取前15秒，横向压缩分辨率"""
    # 获取视频信息
    probe = subprocess.run([FFPROBE, '-v', 'quiet', '-print_format', 'json',
        '-show_format', '-show_streams', input_path],
        capture_output=True, text=True)
    info = json.loads(probe.stdout)
    duration = float(info['format']['duration'])
    vstream = next(s for s in info['streams'] if s['codec_type'] == 'video')
    width, height = vstream['width'], vstream['height']
    print(f'[compress] 原始: {duration:.1f}s, {width}x{height}', file=sys.stderr)

    if duration <= MAX_DURATION and width <= 1280:
        print(f'[compress] 无需压缩', file=sys.stderr)
        return input_path

    output_path = input_path.rsplit('.', 1)[0] + '_compressed.mp4'
    filters = []
    # 15秒限制
    if duration > MAX_DURATION:
        filters.append(f'-t {MAX_DURATION}')
        print(f'[compress] 截取前{MAX_DURATION}秒', file=sys.stderr)
    # 分辨率限制（横向压缩）
    if width > 1280:
        scale = f'scale=1280:-2'
    elif height > 1280:
        scale = f'scale=-2:1280'
    else:
        scale = None
    if scale:
        filters.append(f'-vf {scale}')
        print(f'[compress] 分辨率: {width}x{height} → 限制1280', file=sys.stderr)

    cmd = [FFMPEG, '-y', '-i', input_path] + filters + [
        '-c:v', 'libx264', '-crf', '28', '-preset', 'fast',
        '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', output_path
    ]
    subprocess.run(cmd, capture_output=True)
    new_size = os.path.getsize(output_path)
    old_size = os.path.getsize(input_path)
    print(f'[compress] 完成: {old_size/1024/1024:.1f}MB → {new_size/1024/1024:.1f}MB', file=sys.stderr)
    return output_path

def load_cookies():
    lines = COOKIE_FILE.read_text().strip().split('\n')
    return lines[0].strip(), lines[1].strip() if len(lines) > 1 else ''

PROMPT = r"""SYSTEM PROMPT: HYPER-GRANULAR VIDEO ANALYSIS
ROLE:
You are an expert cinematographer, visual analyst, and motion-mechanics describer. Your job is to break down video clips into insanely detailed, hyper-granular, frame-by-frame text descriptions.
OBJECTIVE:
Translate the provided video/sequence into a vivid, kinetic text breakdown. You must capture the exact physical mechanics, the pacing, the micro-expressions, the physics of momentum, the physical reality of the camera itself, and a complete transcription of all audio and dialogue.
STRICT RULES:
Comprehensive Audio & Dialogue Transcription: You MUST transcribe all audio cues. Write out exactly what characters are saying using quotation marks (e.g., "Watch this!"). If speech is muffled or overlapping, note that. Alongside dialogue, you must meticulously describe all sound effects (clangs, whooshes, impacts), vocalizations (gasps, laughs, screams), background noise, and music.

No Intellectual Property (IP) Names: Do not use character names, actor names, or franchise names. Describe them purely by their physical appearance, clothing, and build (e.g., "the massively built man," "the woman in the pink kimono").
Camera as a Character: You MUST describe the camera work as if the camera is a physical object. Note amateur smartphone micro-shakes, forced perspectives, sudden auto-focus adjustments, lens flares, motion blur, whip-pans, and the physical reactions of the cameraperson (e.g., "The camera violently jerks downward as the cameraperson flinches").
Kinetic Physics: Describe the transfer of weight, gravity, tension, and impact. Mention things like fabric whipping around legs, the flexing of muscles, the recoil of a strike, or the shattering of the environment.
FORMATTING TEMPLATE:
You must chunk the video into chronological blocks using bold timestamp headers with a thematic title. Under each header, use bullet points to categorize the elements.
[TIMESTAMP] - [TIMESTAMP]: [Phase Title]
Visual Framing: [Describe the shot type, lighting, style (e.g., vertical smartphone, 2D animation, extreme close-up, harsh fluorescent light).]
The Subjects: [Describe the characters, their exact positioning, posture, clothing, and micro-expressions.]
The Action: [Frame-by-frame breakdown of the physical movements. Micro-movements, momentum, physics.]

Camera Dynamics: [Describe the exact camera movement, zooms, blurs, shake, and panning.]
Audio/Pacing: [Transcribe ALL spoken dialogue in quotes. Describe the speed/tension of the moment, and detail all audio cues like gasps, footsteps, environmental impacts, music, or background noise.]
EXAMPLE OUTPUT
USER INPUT: [Video of a man trying to flip a pancake, but he throws it too hard, it hits the ceiling, and falls onto his face, causing the cameraperson to drop the phone.]
AI RESPONSE:
0:00 - 0:02: The Setup and The Wind-Up
Visual Framing: The video is shot vertically on a smartphone. The lighting is a harsh, warm, overhead kitchen light. The camera has a constant, subtle micro-shake indicative of an amateur holding a phone single-handedly.
The Subjects: A man in a baggy grey hoodie stands in the center of the frame, holding a black Teflon frying pan. Inside the pan is a perfectly round, golden-brown pancake.
The Action: The man is grinning widely, looking directly into the camera lens with absolute, unearned confidence. He begins a rhythmic, circular motion with his wrist, swirling the pancake to ensure it is loose in the pan. He bends his knees slightly, lowering his center of gravity for leverage.
Camera Dynamics: The cameraperson is standing roughly four feet away, holding a static mid-shot from the man's waist to just above his head.
Audio/Pacing: The pacing is slow and anticipatory. A rhythmic, scraping shhhk-shhhk sound is heard as the pancake slides against the metal. The man speaks clearly and confidently: "Alright, perfect flip in three... two... one..."

0:02 - 0:04: The Catastrophic Launch
Visual Framing: The camera remains static, but the focus briefly hunts as the subject's arm moves rapidly.
The Subjects: The man's confident smile tightens into a grimace of exertion.
The Action: He rapidly drops his right shoulder and thrusts his arm violently upward in a massive, over-exaggerated jerk. He applies vastly too much kinetic force. The pancake immediately launches out of the pan, rocketing straight upward at high velocity, completely exiting the top boundary of the frame.
Camera Dynamics: The camera abruptly tilts upward, attempting to track the airborne batter, but the movement is delayed and jerky.
Audio/Pacing: The man lets out a short, strained grunt: "Hup!" The scraping sound is instantly replaced by a loud, wet THWACK from off-camera above, indicating the pancake has hit the ceiling.
0:04 - 0:06: The Impact and Camera Chaos
Visual Framing: The lighting is suddenly obscured by a shadow dropping from above.
The Action: A fraction of a second later, the heavy, half-cooked pancake plummets straight down, landing with a wet slap squarely onto the man's face, completely covering his eyes and nose. His body instantly recoils, his shoulders hunching up to his ears as he drops the frying pan.
Camera Dynamics: The cameraperson's fight-or-flight response kicks in. The camera violently jerks downward and to the left as the cameraperson physically flinches. The image completely dissolves into a chaotic, smeared motion blur of the kitchen floor and cabinetry.
Audio/Pacing: The heavy metallic CLANG of the dropped frying pan hitting the linoleum floor dominates the audio. The cameraperson gasps loudly and shouts, "Oh my god, dude!" followed instantly by the sharp clatter of the phone being dropped. The video ends abruptly on a tilted, blurry frame of the baseboards.
输出的结果用中文告诉我"""

async def main(video_path):
    # 自动压缩
    final_path = compress_video(video_path)

    c1, c2 = load_cookies()
    client = GeminiClient(secure_1psid=c1, secure_1psidts=c2)
    await client.init()
    resp = await client.generate_content(PROMPT, files=[final_path])
    print(resp.text)

    # 清理压缩文件
    if final_path != video_path:
        try: os.unlink(final_path)
        except: pass

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python gemini_analyze.py <video_path>")
        sys.exit(1)
    asyncio.run(main(sys.argv[1]))
