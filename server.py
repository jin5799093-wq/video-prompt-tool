import os, sys, io, asyncio, tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from gemini_webapi import GeminiClient

app = Flask(__name__)
CORS(app)

PROMPT = open('gemini_analyze.py', encoding='utf-8').read()
PROMPT = PROMPT.split('PROMPT = r"""')[1].rsplit('"""', 1)[0]

@app.route('/api/analyze-video', methods=['POST'])
def analyze():
    if 'video' not in request.files:
        return jsonify(success=False, error='请上传视频'), 400
    f = request.files['video']
    tmp = tempfile.NamedTemporaryFile(suffix='.mp4', delete=False)
    f.save(tmp.name); tmp.close()
    try:
        async def run():
            c = GeminiClient(
                secure_1psid=os.environ['GEMINI_1PSID'],
                secure_1psidts=os.environ['GEMINI_1PSIDTS']
            )
            await c.init()
            return (await c.generate_content(PROMPT, files=[tmp.name])).text
        return jsonify(success=True, prompt=asyncio.run(run()))
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
