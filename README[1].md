# The Sorting Rite — AI Waste Classifier

Upload a photo of a waste item (bottle, food scrap, paper, etc.) and get back
the waste category + correct disposal method, powered by Claude's vision model.

## Project structure
```
waste-sorter/
├── backend/
│   ├── main.py            # FastAPI app, calls Claude vision API
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx         # Upload UI + result display
    │   └── main.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## 1. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

export ANTHROPIC_API_KEY=your_key_here   # Windows: set ANTHROPIC_API_KEY=your_key_here

uvicorn main:app --reload --port 8000
```
Backend now runs at `http://localhost:8000`. Test it: `http://localhost:8000/health`.

## 2. Frontend setup

```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173` (Vite default).

## 3. Use it
Open the frontend in your browser, upload a photo, click "Classify Item."
The app returns:
- Item name
- Waste category (plastic, paper, cardboard, glass, metal, organic, e-waste, hazardous, trash)
- Confidence score
- Disposal method + a practical tip

## Notes / next steps for a hackathon pitch
- **Offline mode**: swap the Claude API call for a locally trained TensorFlow Lite
  model (e.g., fine-tuned MobileNetV2 on TrashNet) if you need it to work without internet.
- **Localization**: disposal rules vary by city — the `DISPOSAL_GUIDE` dict in
  `main.py` is the place to plug in municipal-specific rules or a geolocation lookup.
- **Gamification**: track a user's correct-sort streak to add an engagement layer.
- **Batch mode**: extend `/classify` to accept multiple files for multi-item photos.
