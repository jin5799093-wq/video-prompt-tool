import os, sys, io, asyncio, tempfile, subprocess, json
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from gemini_webapi import GeminiClient

app = Flask(__name__)
CORS(app)
C1 = os.environ['GEMINI_1PSID']
C2 = os.environ['GEMINI_1PSIDTS']

PROMPT = open('gemini_analyze.py', encoding='utf-8').read()
PROMPT = PROMPT.split('PROMPT = r"""')[1].rsplit('"""', 1)[0]

def compress(input_path):
    probe = subprocess.run(['ffprobe','-v','quiet','-print_format','json','-show_format','-show_streams',input_path], capture_output=True, text=True)
    dur = float(json.loads(probe.stdout)['format']['duration'])
    if dur <= 15: return input_path
    out = input_path.rsplit('.',1)[0] + '_c.mp4'
    subprocess.run(['ffmpeg','-y','-i',input_path,'-t','15','-c:v','libx264','-crf','28','-preset','fast','-c:a','aac','-b:a','64k',out], capture_output=True)
    return out

@app.route('/api/analyze-video', methods=['POST'])
def analyze():
    if 'video' not in request.files:
        return jsonify(success=False, error='请上传视频'), 400
    f = request.files['video']
    tmp = tempfile.NamedTemporaryFile(suffix='.mp4', delete=False)
    f.save(tmp.name); tmp.close()
    try:
        fp = compress(tmp.name)
        async def run():
            c = GeminiClient(secure_1psid=C1, secure_1psidts=C2)
            await c.init()
            return (await c.generate_content(PROMPT, files=[fp])).text
        return jsonify(success=True, prompt=asyncio.run(run()))
    except Exception as e:
        return jsonify(success=False, error=str(e)), 500
    finally:
        try: os.unlink(tmp.name)
        except: pass

@app.route('/')
def home():
    return jsonify(status='ok', name='必爆大量视频提示词反推 API')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 3001)))
