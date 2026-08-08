"""
Waste Sorter API — "The Priest's Sorting Rite"
------------------------------------------------
Accepts an uploaded image of a waste item, sends it to Claude's vision
model, and returns a structured classification + disposal instruction.

Run:
    pip install fastapi uvicorn python-multipart anthropic pillow
    export ANTHROPIC_API_KEY=your_key_here
    uvicorn main:app --reload --port 8000
"""

import base64
import json
import os
from io import BytesIO

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from anthropic import Anthropic

app = FastAPI(title="Waste Sorter API")

# Allow the React dev server to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this in production
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Anthropic()  # reads ANTHROPIC_API_KEY from env

# --- Disposal knowledge base -------------------------------------------------
# Maps category -> (bin/method, short explanation, color code for UI)
DISPOSAL_GUIDE = {
    "plastic": {
        "method": "Recycle (Blue Bin)",
        "tip": "Rinse off food residue. Check the resin code (♳-♷) — not all plastics are curbside recyclable.",
        "color": "#2563eb",
    },
    "paper": {
        "method": "Recycle (Blue Bin)",
        "tip": "Keep it dry and free of grease. Shredded paper often needs a paper bag, not loose in the bin.",
        "color": "#0891b2",
    },
    "cardboard": {
        "method": "Recycle (Blue Bin)",
        "tip": "Flatten boxes and remove tape/labels where possible.",
        "color": "#0891b2",
    },
    "glass": {
        "method": "Recycle (Glass Bin)",
        "tip": "Rinse and remove caps/lids. Broken glass should be wrapped before disposal for safety.",
        "color": "#059669",
    },
    "metal": {
        "method": "Recycle (Metal/Blue Bin)",
        "tip": "Rinse cans. Sharp metal edges should be wrapped for safety.",
        "color": "#78716c",
    },
    "organic": {
        "method": "Compost (Green Bin)",
        "tip": "Food scraps and yard waste break down into compost — keep out of the landfill bin.",
        "color": "#65a30d",
    },
    "e-waste": {
        "method": "E-Waste Drop-off",
        "tip": "Never bin electronics or batteries — take them to a certified e-waste collection point.",
        "color": "#dc2626",
    },
    "hazardous": {
        "method": "Hazardous Waste Facility",
        "tip": "Chemicals, batteries, paint, and medicine need special handling — do not bin or flush.",
        "color": "#b91c1c",
    },
    "trash": {
        "method": "Landfill (General Waste)",
        "tip": "This item isn't currently recyclable or compostable through standard streams.",
        "color": "#4b5563",
    },
}

CLASSIFY_PROMPT = """You are a waste-sorting expert. Look at the image of a single item and classify it.

Respond with ONLY valid JSON, no other text, no markdown fences, in exactly this shape:
{
  "item_name": "short name of the item, e.g. 'plastic water bottle'",
  "category": "one of: plastic, paper, cardboard, glass, metal, organic, e-waste, hazardous, trash",
  "confidence": 0.0 to 1.0,
  "reasoning": "one short sentence on why you chose this category"
}
"""


def image_to_base64(file_bytes: bytes, content_type: str) -> tuple[str, str]:
    """Normalize the uploaded image to JPEG base64 for the API."""
    img = Image.open(BytesIO(file_bytes)).convert("RGB")
    # Resize down if huge, to keep payload small
    img.thumbnail((1024, 1024))
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return b64, "image/jpeg"


@app.post("/classify")
async def classify_waste(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file.")

    raw = await file.read()
    try:
        b64_data, media_type = image_to_base64(raw, file.content_type)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read image file.")

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=300,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": b64_data,
                            },
                        },
                        {"type": "text", "text": CLASSIFY_PROMPT},
                    ],
                }
            ],
        )
        text = "".join(
            block.text for block in response.content if block.type == "text"
        ).strip()
        # Strip accidental markdown fences just in case
        text = text.replace("```json", "").replace("```", "").strip()
        result = json.loads(text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Model returned an unparseable response.")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Classification failed: {e}")

    category = result.get("category", "trash")
    guide = DISPOSAL_GUIDE.get(category, DISPOSAL_GUIDE["trash"])

    return {
        "item_name": result.get("item_name", "unknown item"),
        "category": category,
        "confidence": result.get("confidence", 0.5),
        "reasoning": result.get("reasoning", ""),
        "disposal_method": guide["method"],
        "tip": guide["tip"],
        "color": guide["color"],
    }


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    import os as _os

    # Replit sets PORT; bind to 0.0.0.0 so the app is reachable externally.
    port = int(_os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
