import os, json, uuid, tempfile, asyncio, hashlib, time, re
from flask import Flask, request, jsonify
from flask_cors import CORS
import httpx

app = Flask(__name__)
CORS(app)
PROMPT = open('gemini_analyze.py', encoding='utf-8').read().split('PROMPT = r"""')[1].rsplit('"""', 1)[0]

GEMINI_URL = 'https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate'
COOKIE_STR = f"__Secure-1PSID={os.environ['GEMINI_1PSID']}; __Secure-1PSIDTS={os.environ['GEMINI_1PSIDTS']}"

def build_payload(prompt_text, file_urls):
    """调用 Gemini StreamGenerate 接口"""
    bl = 'boq_assistant-bard-web-server_20260525.09_p0'
    reqid = int(time.time()) % 1000000
    url = f'{GEMINI_URL}?bl={bl}&hl=zh-CN&_reqid={reqid}&rt=c'

    # 构建 Gemini 内部协议 payload (带图片/视频附件)
    inner = [None] * 80
    # 消息体: 文本 + 文件附件
    msg_parts = [prompt_text]
    for fu in file_urls:
        msg_parts.append([fu, 1])  # 1 = 文件附件
    
    inner[0] = [msg_parts, 0, None, None, None, None, 0]
    inner[1] = ['zh']
    inner[2] = ['', '', '', None, None, None, None, None, None, '']
    inner[3] = []
    inner[6] = [0]
    inner[7] = 1
    inner[17] = [[0]]
    inner[59] = str(uuid.uuid4())
    inner[61] = []
    inner[79] = 1  # Flash model

    outer = [None, json.dumps(inner)]
    data = {'f.req': json.dumps(outer)}
    
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://gemini.google.com',
        'Referer': 'https://gemini.google.com/app',
        'Cookie': COOKIE_STR,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    return url, data, headers

def parse_response(raw):
    """解析 Gemini StreamGenerate 响应"""
    try:
        # 响应格式: )]}' 开头 + JSON数组
        raw = raw.strip()
        if raw.startswith(")]}'"):
            raw = raw[4:]
        arr = json.loads(raw)
        text = arr[0][2] if arr and len(arr) > 0 and arr[0] and len(arr[0]) > 2 else ''
        if not text and arr and len(arr) > 0:
            # 尝试其他位置
            for item in arr:
                if isinstance(item, list) and len(item) > 0:
                    for sub in item:
                        if isinstance(sub, str) and len(sub) > 50:
                            return sub
        return text
    except:
        return raw[:2000]

def extract_text_from_stream(lines):
    """从流式响应中提取文本"""
    result = []
    for line in lines:
        line = line.strip()
        if not line or line.startswith('['):
            continue
        try:
            chunk = json.loads(line)
            text = chunk[0][2] if chunk and len(chunk) > 0 and chunk[0] and len(chunk[0]) > 2 else ''
            if text: result.append(text)
        except:
            continue
    return ''.join(result)

@app.route('/api/analyze-video', methods=['POST'])
def analyze():
    if 'video' not in request.files:
        return jsonify(success=False, error='请上传视频'), 400
    
    f = request.files['video']
    tmp = tempfile.NamedTemporaryFile(suffix='.mp4', delete=False)
    f.save(tmp.name)
    tmp.close()
    
    try:
        # 读取视频为 base64 data URL
        import base64
        with open(tmp.name, 'rb') as vf:
            video_b64 = base64.b64encode(vf.read()).decode()
        mime = f.content_type or 'video/mp4'
        data_url = f'data:{mime};base64,{video_b64}'
        
        # 调用 Gemini
        url, data, headers = build_payload(PROMPT, [data_url])
        
        with httpx.Client(timeout=180) as client:
            resp = client.post(url, data=data, headers=headers)
            text = parse_response(resp.text)
        
        return jsonify(success=True, prompt=text)
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
