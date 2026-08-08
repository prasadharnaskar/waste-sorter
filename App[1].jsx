import { useState, useRef } from "react";

const API_URL = "http://localhost:8000/classify";

export default function App() {
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setResult(null);
    setError(null);
    setPreview(URL.createObjectURL(selected));
  };

  const handleClassify = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(API_URL, { method: "POST", body: formData });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || "Classification failed.");
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>🗑️ The Sorting Rite</h1>
        <p style={styles.subtitle}>
          Upload a photo of any item — the AI will tell you where it belongs.
        </p>

        {!preview && (
          <label style={styles.dropzone}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <span style={{ fontSize: 40 }}>📷</span>
            <span>Click to upload a photo</span>
          </label>
        )}

        {preview && (
          <div style={styles.previewWrap}>
            <img src={preview} alt="preview" style={styles.previewImg} />
          </div>
        )}

        {preview && !result && (
          <div style={styles.buttonRow}>
            <button
              style={styles.primaryBtn}
              onClick={handleClassify}
              disabled={loading}
            >
              {loading ? "Reading the offering..." : "Classify Item"}
            </button>
            <button style={styles.secondaryBtn} onClick={handleReset}>
              Choose different photo
            </button>
          </div>
        )}

        {error && <div style={styles.errorBox}>{error}</div>}

        {result && (
          <div style={{ ...styles.resultBox, borderColor: result.color }}>
            <div style={styles.resultHeader}>
              <span
                style={{ ...styles.categoryPill, background: result.color }}
              >
                {result.category.toUpperCase()}
              </span>
              <span style={styles.confidence}>
                {Math.round(result.confidence * 100)}% confident
              </span>
            </div>
            <h2 style={styles.itemName}>{result.item_name}</h2>
            <p style={styles.reasoning}>{result.reasoning}</p>
            <div style={styles.methodBox}>
              <strong>➡ {result.disposal_method}</strong>
              <p style={styles.tip}>{result.tip}</p>
            </div>
            <button style={styles.secondaryBtn} onClick={handleReset}>
              Sort another item
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
    fontFamily: "system-ui, -apple-system, sans-serif",
    padding: 20,
  },
  card: {
    background: "#ffffff",
    borderRadius: 16,
    padding: 32,
    maxWidth: 420,
    width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  title: { margin: 0, fontSize: 26 },
  subtitle: { color: "#64748b", marginTop: 6, marginBottom: 24, fontSize: 14 },
  dropzone: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    border: "2px dashed #cbd5e1",
    borderRadius: 12,
    padding: "40px 20px",
    cursor: "pointer",
    color: "#475569",
    transition: "border-color 0.2s",
  },
  previewWrap: { marginBottom: 16 },
  previewImg: {
    width: "100%",
    maxHeight: 280,
    objectFit: "cover",
    borderRadius: 12,
  },
  buttonRow: { display: "flex", flexDirection: "column", gap: 10 },
  primaryBtn: {
    background: "#0f172a",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 15,
    cursor: "pointer",
  },
  secondaryBtn: {
    background: "transparent",
    color: "#475569",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    padding: "10px 16px",
    fontSize: 14,
    cursor: "pointer",
  },
  errorBox: {
    marginTop: 16,
    padding: 12,
    background: "#fef2f2",
    color: "#b91c1c",
    borderRadius: 8,
    fontSize: 14,
  },
  resultBox: {
    marginTop: 16,
    border: "2px solid",
    borderRadius: 12,
    padding: 20,
  },
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryPill: {
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 999,
    letterSpacing: 0.5,
  },
  confidence: { fontSize: 12, color: "#64748b" },
  itemName: { margin: "4px 0", fontSize: 20, textTransform: "capitalize" },
  reasoning: { color: "#475569", fontSize: 14, marginBottom: 14 },
  methodBox: {
    background: "#f8fafc",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  tip: { fontSize: 13, color: "#64748b", marginTop: 6, marginBottom: 0 },
};
