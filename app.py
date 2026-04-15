from flask import Flask

app = Flask(__name__)

def add(a, b):
    return a + b

@app.route('/')
def home():
    res = add(10, 5)
    return f"Python Test App is Running! Result of 10+5 is: {res}"

if __name__ == '__main__':
    # Listen on all interfaces (0.0.0.0) on port 5000
    app.run(host='0.0.0.0', port=5000)
