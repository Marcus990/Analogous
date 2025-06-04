from quart import Quart, request, jsonify
from quart_cors import cors
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Quart app with CORS
app = Quart(__name__)
app = cors(app, allow_origin=["http://localhost:3000"])

@app.route("/")
async def home():
    return jsonify({"status": "ok", "message": "Analogous API is running"})

@app.route("/generate-analogy", methods=["POST"])
async def generate_analogy():
    try:
        data = await request.get_json()
        topic = data.get("topic")
        audience = data.get("audience")
        
        # Placeholder response for MVP
        analogy = f"Here's a simple analogy: {topic} is like explaining {audience} to a {audience}. Just as a {audience} needs clear, simple explanations, {topic} can be understood through familiar concepts that {audience} would relate to."
        
        return jsonify({
            "status": "success",
            "analogy": analogy
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400

@app.route("/health")
async def health_check():
    return jsonify({"status": "healthy"})

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
