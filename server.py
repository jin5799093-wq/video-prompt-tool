import os, json, uuid, tempfile, asyncio
from flask import Flask, request, jsonify
from flask_cors import CORS
import httpx

app = Flask(__name__)
CORS(app)

PROMPT = open('gemini_analyze.py', encoding='utf-8').read()
PROMPT = PROMPT.split('PROMPT = r"""')[1].rsplit('"""', 1)[0]
API = 'https://www.doubao.com/samantha/media/get_play_info'

async def call_gemini(video_path):
    """用 gemini-webapi 分析视频"""
    from gemini_webapi import GeminiClient
    c = GeminiClient(
        secure_1psid=os.environ['GEMINI_1PSID'],
        secure_1psidts=os.environ['GEMINI_1PSIDTS']
    )
    await c.init()
    resp = await c.generate_content(PROMPT, files=[video_path])
    return resp.text

@app.route('/api/analyze-video', methods=['POST'])
def analyze():
    if 'video' not in request.files:
        return jsonify(success=False, error='请上传视频'), 400
    f = request.files['video']
    tmp = tempfile.NamedTemporaryFile(suffix='.mp4', delete=False)
    f.save(tmp.name); tmp.close()
    try:
        result = asyncio.run(call_gemini(tmp.name))
        return jsonify(success=True, prompt=result)
    except Exception as e:
        return jsonify(success=False, error=str(e)), 500
    finally:
        try: os.unlink(tmp.name)
        except: pass

@app.route('/')
def home():
    return jsonify(status='ok', name='视频提示词反推 API')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 3001)))
