from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
from PIL import Image, ImageChops, ImageEnhance, ImageFilter
import piexif
import io
import base64
import os
import json
from google import genai
from google.genai import types
from scipy import ndimage
from datetime import datetime

app = FastAPI(title="DocVerifyAI - ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Gemini Setup
# ─────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)


# ═══════════════════════════════════════════════════════
# 1. ELA ANALYSIS — Error Level Analysis
# ═══════════════════════════════════════════════════════
def ela_analysis(image: Image.Image) -> dict:
    try:
        buffer_orig = io.BytesIO()
        image.save(buffer_orig, format="JPEG", quality=95)
        buffer_orig.seek(0)
        orig = Image.open(buffer_orig)

        buffer_comp = io.BytesIO()
        image.save(buffer_comp, format="JPEG", quality=75)
        buffer_comp.seek(0)
        comp = Image.open(buffer_comp)

        ela_img = ImageChops.difference(orig, comp)

        enhancer = ImageEnhance.Brightness(ela_img)
        ela_bright = enhancer.enhance(15)

        ela_array = np.array(ela_bright)

        mean_error = float(np.mean(ela_array))
        max_error  = float(np.max(ela_array))
        std_error  = float(np.std(ela_array))

        suspicious_pixels = int(np.sum(ela_array > 100))
        total_pixels = ela_array.size
        tamper_ratio = suspicious_pixels / total_pixels

        ela_buffer = io.BytesIO()
        ela_bright.save(ela_buffer, format="PNG")
        ela_base64 = base64.b64encode(ela_buffer.getvalue()).decode()

        is_tampered = tamper_ratio > 0.15 or mean_error > 25

        return {
            "status": "tampered" if is_tampered else "clean",
            "mean_error_level": round(mean_error, 2),
            "max_error_level": round(max_error, 2),
            "std_deviation": round(std_error, 2),
            "tamper_ratio_percent": round(tamper_ratio * 100, 2),
            "suspicious_regions_found": is_tampered,
            "ela_image_base64": ela_base64,
            "details": (
                f"High error levels detected in {round(tamper_ratio*100,1)}% of image — possible editing"
                if is_tampered else
                "Error levels uniform — no obvious tampering detected"
            )
        }

    except Exception as e:
        return {"status": "error", "suspicious_regions_found": False, "details": str(e)}


# ═══════════════════════════════════════════════════════
# 2. EXIF METADATA ANALYSIS
# ═══════════════════════════════════════════════════════
def exif_analysis(image_bytes: bytes) -> dict:
    try:
        image = Image.open(io.BytesIO(image_bytes))
        suspicious_software = [
            "photoshop", "gimp", "paint", "inkscape",
            "illustrator", "canva", "pixlr", "fotor",
            "lightroom", "affinity"
        ]

        result = {
            "has_exif": False,
            "software_used": None,
            "is_edited_by_software": False,
            "creation_date": None,
            "modification_date": None,
            "device_make": None,
            "device_model": None,
            "gps_data": False,
            "suspicious_flags": [],
            "details": ""
        }

        try:
            exif_bytes = image.info.get("exif", b"")
            if not exif_bytes:
                result["details"] = "No EXIF data found — may have been stripped (suspicious)"
                result["suspicious_flags"].append("No EXIF metadata present")
                return result

            exif_data = piexif.load(exif_bytes)
            result["has_exif"] = True

            software = exif_data.get("0th", {}).get(piexif.ImageIFD.Software, None)
            if software:
                sw_name = software.decode(errors="ignore").strip()
                result["software_used"] = sw_name
                sw_lower = sw_name.lower()
                if any(s in sw_lower for s in suspicious_software):
                    result["is_edited_by_software"] = True
                    result["suspicious_flags"].append(f"Edited with: {sw_name}")

            dt_orig = exif_data.get("Exif", {}).get(piexif.ExifIFD.DateTimeOriginal, None)
            dt_mod  = exif_data.get("0th", {}).get(piexif.ImageIFD.DateTime, None)

            if dt_orig:
                result["creation_date"] = dt_orig.decode(errors="ignore")
            if dt_mod:
                result["modification_date"] = dt_mod.decode(errors="ignore")

            if dt_orig and dt_mod and dt_orig != dt_mod:
                result["suspicious_flags"].append("Modification date differs from creation date")

            make  = exif_data.get("0th", {}).get(piexif.ImageIFD.Make, None)
            model = exif_data.get("0th", {}).get(piexif.ImageIFD.Model, None)
            if make:
                result["device_make"] = make.decode(errors="ignore")
            if model:
                result["device_model"] = model.decode(errors="ignore")

            gps = exif_data.get("GPS", {})
            if gps:
                result["gps_data"] = True

        except Exception:
            result["details"] = "EXIF data malformed or unreadable"
            result["suspicious_flags"].append("Corrupted or missing EXIF")

        if result["suspicious_flags"]:
            result["details"] = "⚠️ Suspicious: " + " | ".join(result["suspicious_flags"])
        else:
            result["details"] = "✅ EXIF metadata looks normal"

        return result

    except Exception as e:
        return {"status": "error", "is_edited_by_software": False, "suspicious_flags": [], "details": str(e)}


# ═══════════════════════════════════════════════════════
# 3. CLONE DETECTION
# ═══════════════════════════════════════════════════════
def clone_detection(image: Image.Image) -> dict:
    try:
        img_array = np.array(image.convert("L"))
        h, w = img_array.shape

        scale = min(1.0, 500 / max(h, w))
        new_h, new_w = int(h * scale), int(w * scale)
        resized = cv2.resize(img_array, (new_w, new_h))

        block_size = 32
        stride     = 16
        blocks = []
        positions = []

        for y in range(0, new_h - block_size, stride):
            for x in range(0, new_w - block_size, stride):
                block = resized[y:y+block_size, x:x+block_size].flatten().astype(float)
                std = np.std(block)
                if std > 10:
                    block_norm = (block - np.mean(block)) / (std + 1e-8)
                    blocks.append(block_norm)
                    positions.append((x, y))

        clone_pairs = []
        threshold   = 0.97

        for i in range(len(blocks)):
            for j in range(i + 1, min(i + 50, len(blocks))):
                correlation = np.dot(blocks[i], blocks[j]) / (block_size * block_size)
                if correlation > threshold:
                    dist = np.sqrt((positions[i][0]-positions[j][0])**2 +
                                   (positions[i][1]-positions[j][1])**2)
                    if dist > block_size * 2:
                        clone_pairs.append({
                            "region_1": {"x": int(positions[i][0]/scale), "y": int(positions[i][1]/scale)},
                            "region_2": {"x": int(positions[j][0]/scale), "y": int(positions[j][1]/scale)},
                            "similarity": round(float(correlation), 3)
                        })

        has_clones = len(clone_pairs) > 8

        return {
            "clones_detected": has_clones,
            "clone_pairs_count": len(clone_pairs),
            "clone_regions": clone_pairs[:5],
            "details": (
                f"⚠️ {len(clone_pairs)} duplicate regions found — possible copy-paste manipulation"
                if has_clones else
                "✅ No significant cloning detected"
            )
        }

    except Exception as e:
        return {"clones_detected": False, "clone_pairs_count": 0, "clone_regions": [], "details": str(e)}


# ═══════════════════════════════════════════════════════
# 4. NOISE ANALYSIS
# ═══════════════════════════════════════════════════════
def noise_analysis(image: Image.Image) -> dict:
    try:
        img_array = np.array(image.convert("L")).astype(float)
        h, w = img_array.shape

        quadrants = {
            "top_left":     img_array[:h//2, :w//2],
            "top_right":    img_array[:h//2, w//2:],
            "bottom_left":  img_array[h//2:, :w//2],
            "bottom_right": img_array[h//2:, w//2:],
        }

        noise_levels = {}
        for name, quad in quadrants.items():
            laplacian = cv2.Laplacian(quad.astype(np.uint8), cv2.CV_64F)
            noise_levels[name] = round(float(np.std(laplacian)), 2)

        noise_values = list(noise_levels.values())
        mean_noise   = float(np.mean(noise_values))
        std_noise    = float(np.std(noise_values))
        cv_noise     = std_noise / (mean_noise + 1e-8)

        is_inconsistent = cv_noise > 0.5

        return {
            "noise_consistent": not is_inconsistent,
            "quadrant_noise_levels": noise_levels,
            "mean_noise": round(mean_noise, 2),
            "noise_variation": round(cv_noise * 100, 2),
            "suspicious": is_inconsistent,
            "details": (
                f"⚠️ Noise inconsistency detected ({round(cv_noise*100,1)}% variation)"
                if is_inconsistent else
                f"✅ Noise pattern consistent ({round(cv_noise*100,1)}% variation)"
            )
        }

    except Exception as e:
        return {"noise_consistent": True, "suspicious": False, "noise_variation": 0, "details": str(e)}


# ═══════════════════════════════════════════════════════
# 5. GEMINI VISION ANALYSIS
# ═══════════════════════════════════════════════════════
def gemini_analysis(image: Image.Image) -> dict:
    try:
        prompt = """
        You are a forensic document analyst. Analyze this document image carefully.

        Check for these specific issues:
        1. FONT ANALYSIS: Are there font inconsistencies? Mixed fonts or uneven spacing?
        2. LOGO INTEGRITY: Is any logo blurry, pixelated, or lower quality than surrounding text?
        3. LAYOUT STRUCTURE: Are borders, margins, alignments consistent?
        4. COLOR PROFILE: Any color bleeding, uneven saturation, or suspicious patches?
        5. TEXT QUALITY: Is text resolution consistent throughout?
        6. DOCUMENT TYPE: What type of document is this?

        Respond ONLY in this exact JSON format:
        {
          "document_type": "string",
          "font_consistent": true/false,
          "font_issues": "description or null",
          "logo_intact": true/false,
          "logo_issues": "description or null",
          "layout_consistent": true/false,
          "layout_issues": "description or null",
          "color_normal": true/false,
          "color_issues": "description or null",
          "text_quality_ok": true/false,
          "text_issues": "description or null",
          "overall_suspicion_score": 0-100,
          "verdict": "AUTHENTIC or SUSPICIOUS",
          "reasoning": "brief explanation"
        }
        """

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=[prompt, image]
        )
        text = response.text.strip()

        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        result = json.loads(text)
        return result

    except json.JSONDecodeError:
        return {
            "document_type": "Unknown",
            "verdict": "UNKNOWN",
            "overall_suspicion_score": 50,
            "reasoning": "Could not parse Gemini response",
            "font_consistent": True,
            "logo_intact": True,
            "layout_consistent": True
        }
    except Exception as e:
        return {
            "document_type": "Academic Certificate",
            "verdict": "ERROR",
            "overall_suspicion_score": 0,
            "reasoning": str(e)
        }


# ═══════════════════════════════════════════════════════
# FINAL SCORE CALCULATOR
# ═══════════════════════════════════════════════════════
def calculate_final_verdict(ela, exif, clone, noise, gemini) -> dict:
    suspicious_points = 0
    total_points      = 0
    flags             = []

    total_points += 25
    if ela.get("suspicious_regions_found"):
        suspicious_points += 15
        flags.append(f"ELA: Tampered regions ({ela.get('tamper_ratio_percent', 0)}%)")

    total_points += 20
    if exif.get("is_edited_by_software"):
        suspicious_points += 20
        flags.append(f"EXIF: Edited with {exif.get('software_used', 'unknown software')}")
    elif exif.get("suspicious_flags"):
        suspicious_points += 10
        flags.extend(exif.get("suspicious_flags", []))

    total_points += 20
    if clone.get("clones_detected"):
        suspicious_points += 20
        flags.append(f"Clone: {clone.get('clone_pairs_count', 0)} duplicate regions")

    total_points += 15
    if noise.get("suspicious"):
        suspicious_points += 15
        flags.append(f"Noise: {noise.get('noise_variation', 0)}% variation detected")

    total_points += 20
    gemini_score = gemini.get("overall_suspicion_score", 0)
    if gemini_score > 60:
        suspicious_points += 20
        flags.append(f"AI Visual: {gemini.get('reasoning', '')}")
    elif gemini_score > 30:
        suspicious_points += 10
        flags.append(f"AI Visual: Minor issues — {gemini.get('reasoning', '')}")

    fraud_percentage = (suspicious_points / total_points) * 100
    confidence       = round(100 - fraud_percentage, 1)

    if fraud_percentage >= 50:
        verdict    = "FRAUDULENT"
        confidence = round(fraud_percentage, 1)
    elif fraud_percentage >= 25:
        verdict    = "SUSPICIOUS"
        confidence = round(fraud_percentage + 20, 1)
    else:
        verdict    = "AUTHENTIC"
        confidence = round(100 - fraud_percentage, 1)

    return {
        "verdict": verdict,
        "confidence": min(99, confidence),
        "fraud_score": round(fraud_percentage, 1),
        "flags": flags,
        "document_type": gemini.get("document_type", "Unknown"),
        "summary": (
            f"Document appears {verdict.lower()} with {confidence}% confidence. "
            + (f"Issues: {'; '.join(flags[:2])}" if flags else "No significant issues found.")
        )
    }


# ═══════════════════════════════════════════════════════
# MAIN API ENDPOINT
# ═══════════════════════════════════════════════════════
@app.post("/analyze")
async def analyze_document(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files allowed")

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        print(f"[{datetime.now()}] Analyzing: {file.filename} ({len(image_bytes)//1024}KB)")

        print("  ▶ Running ELA Analysis...")
        ela_result = ela_analysis(image)

        print("  ▶ Checking EXIF Metadata...")
        exif_result = exif_analysis(image_bytes)

        print("  ▶ Running Clone Detection...")
        clone_result = clone_detection(image)

        print("  ▶ Analyzing Noise Patterns...")
        noise_result = noise_analysis(image)

        print("  ▶ Running Gemini Vision Analysis...")
        gemini_result = gemini_analysis(image)

        print("  ▶ Calculating Final Verdict...")
        final = calculate_final_verdict(
            ela_result, exif_result, clone_result, noise_result, gemini_result
        )

        response = {
            "success": True,
            "filename": file.filename,
            "analyzed_at": datetime.now().isoformat(),
            "verdict": final["verdict"],
            "confidence": final["confidence"],
            "fraud_score": final["fraud_score"],
            "document_type": final["document_type"],
            "summary": final["summary"],
            "flags": final["flags"],
            "analyses": {
                "ela": {
                    "title": "Error Level Analysis",
                    "description": "Detects tampered/edited regions",
                    "result": ela_result.get("status", "clean"),
                    "suspicious": ela_result.get("suspicious_regions_found", False),
                    "details": ela_result.get("details", ""),
                    "tamper_ratio": ela_result.get("tamper_ratio_percent", 0),
                    "ela_image": ela_result.get("ela_image_base64", ""),
                },
                "exif": {
                    "title": "EXIF Metadata",
                    "description": "Checks software used, edit dates",
                    "result": "suspicious" if exif_result.get("is_edited_by_software") else "clean",
                    "suspicious": exif_result.get("is_edited_by_software", False),
                    "details": exif_result.get("details", ""),
                    "software_used": exif_result.get("software_used"),
                    "creation_date": exif_result.get("creation_date"),
                    "modification_date": exif_result.get("modification_date"),
                    "device": f"{exif_result.get('device_make','')}{exif_result.get('device_model','')}".strip() or None,
                    "flags": exif_result.get("suspicious_flags", []),
                },
                "clone": {
                    "title": "Clone Detection",
                    "description": "Finds copy-pasted regions",
                    "result": "suspicious" if clone_result.get("clones_detected") else "clean",
                    "suspicious": clone_result.get("clones_detected", False),
                    "details": clone_result.get("details", ""),
                    "clone_count": clone_result.get("clone_pairs_count", 0),
                    "regions": clone_result.get("clone_regions", []),
                },
                "noise": {
                    "title": "Noise Pattern Analysis",
                    "description": "Detects inconsistent noise from editing",
                    "result": "suspicious" if noise_result.get("suspicious") else "clean",
                    "suspicious": noise_result.get("suspicious", False),
                    "details": noise_result.get("details", ""),
                    "variation_percent": noise_result.get("noise_variation", 0),
                    "quadrant_levels": noise_result.get("quadrant_noise_levels", {}),
                },
                "gemini": {
                    "title": "AI Visual Analysis (Gemini)",
                    "description": "Font, logo, layout, color check",
                    "result": gemini_result.get("verdict", "UNKNOWN"),
                    "suspicious": gemini_result.get("overall_suspicion_score", 0) > 50,
                    "details": gemini_result.get("reasoning", ""),
                    "font_ok": gemini_result.get("font_consistent", True),
                    "font_issues": gemini_result.get("font_issues"),
                    "logo_ok": gemini_result.get("logo_intact", True),
                    "logo_issues": gemini_result.get("logo_issues"),
                    "layout_ok": gemini_result.get("layout_consistent", True),
                    "layout_issues": gemini_result.get("layout_issues"),
                    "suspicion_score": gemini_result.get("overall_suspicion_score", 0),
                }
            }
        }

        print(f"  ✅ Done! Verdict: {final['verdict']} ({final['confidence']}% confidence)")
        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.get("/health")
def health():
    return {"status": "running", "service": "DocVerifyAI ML Service", "version": "1.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)