import os
import io
import json
import logging
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Request, Depends, HTTPException, UploadFile, File, BackgroundTasks, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client, ClientOptions

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend")

# Read config
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://covhcpsyliesrgkjxhai.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_V69YOpwZKjrT1BT8k609nQ_MBzXV80b")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# Initialize FastAPI
app = FastAPI(title="Kozker Recruiter AI Backend", version="1.0.0")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Anthropic Client setup
anthropic_client = None
if ANTHROPIC_API_KEY and ANTHROPIC_API_KEY != "your_anthropic_api_key_here":
    try:
        from anthropic import Anthropic
        anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY)
        logger.info("Anthropic Claude API client successfully initialized.")
    except Exception as e:
        logger.error(f"Failed to initialize Anthropic client: {e}")
else:
    logger.warning("ANTHROPIC_API_KEY not found or is placeholder. Using mock AI fallbacks for Claude.")

# Helper: Safe client creator to bypass validation for new publishable keys
def get_safe_supabase_client(url: str, key: str, jwt_token: str = None) -> Client:
    dummy_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.key"
    headers = {}
    if jwt_token:
        headers["Authorization"] = f"Bearer {jwt_token}"
    
    client = create_client(
        url, 
        dummy_jwt, 
        options=ClientOptions(headers=headers)
    )
    
    # Patch client properties with the real key
    client.supabase_key = key
    client.options.headers["apiKey"] = key
    if not jwt_token:
        client.options.headers["Authorization"] = f"Bearer {key}"
        
    # Patch GoTrue/Auth client headers if auth is used
    if hasattr(client, "auth") and client.auth:
        client.auth._headers["apiKey"] = key
        if not jwt_token:
            client.auth._headers["Authorization"] = f"Bearer {key}"
            
    return client

# Helper: Get Supabase client authenticated as the user
def get_supabase(authorization: Optional[str] = Header(None)) -> Client:
    jwt_token = None
    if authorization and authorization.startswith("Bearer "):
        jwt_token = authorization.split(" ")[1]
    return get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY, jwt_token)

# Text extraction helper
def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    ext = filename.split(".")[-1].lower()
    if ext == "pdf":
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                text = "\n".join(page.extract_text() or "" for page in pdf.pages)
            return text
        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {e}")
    elif ext in ["docx", "doc"]:
        try:
            import docx
            doc = docx.Document(io.BytesIO(file_bytes))
            text = "\n".join(p.text for p in doc.paragraphs)
            return text
        except Exception as e:
            logger.error(f"DOCX extraction error: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to parse DOCX: {e}")
    else:
        try:
            return file_bytes.decode("utf-8", errors="ignore")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read file as text: {e}")

# Helper: Call Claude with JSON extraction prompt
def call_claude_json(system_prompt: str, user_prompt: str) -> Dict[str, Any]:
    if not anthropic_client:
        logger.warning("Claude requested but Anthropic client is not initialized. Using simulated response.")
        return {}
    
    try:
        message = anthropic_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4000,
            temperature=0.0,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )
        # Extract text content
        res_text = message.content[0].text.strip()
        # Find JSON boundaries
        start_idx = res_text.find("{")
        end_idx = res_text.rfind("}")
        if start_idx != -1 and end_idx != -1:
            json_str = res_text[start_idx:end_idx + 1]
            return json.loads(json_str)
        else:
            return json.loads(res_text)
    except Exception as e:
        logger.error(f"Claude API call failed: {e}")
        raise HTTPException(status_code=502, detail=f"Claude API Error: {e}")

# Models
class ClientModel(BaseModel):
    name: str

class RequirementModel(BaseModel):
    client_id: str
    title: str
    description: str
    skills: List[str]
    experience_min: int
    experience_max: int
    budget_min: float
    budget_max: float
    seniority: str
    notes: Optional[str] = ""
    num_posts_requested: int = 1

class JobOpeningModel(BaseModel):
    requirement_id: str
    title: str
    description: str
    responsibilities: List[str]
    qualifications: List[str]
    keywords: List[str]
    salary_range: str

class SkillsApprovalModel(BaseModel):
    skills: List[Dict[str, Any]]

class CandidateModel(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = ""
    skills: List[str] = []
    experience_years: int = 0
    resume_url: Optional[str] = ""
    raw_text: Optional[str] = ""
    source: str = "manual"

class ChatMessageModel(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

# ============================================================
# API ENDPOINTS
# ============================================================

# 1. Parsing endpoint for Requirement document
@app.post("/api/v1/requirements/parse-file")
async def parse_requirement_file(file: UploadFile = File(...)):
    contents = await file.read()
    text = extract_text_from_file(contents, file.filename)
    return {"text": text}

# 2. Clients CRUD proxies
@app.get("/api/v1/clients")
async def get_clients(db: Client = Depends(get_supabase)):
    res = db.table("clients").select("*").eq("is_deleted", False).execute()
    return res.data

@app.post("/api/v1/clients")
async def create_client_endpoint(client: ClientModel, db: Client = Depends(get_supabase)):
    res = db.table("clients").insert({"name": client.name}).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to create client")
    
    # Log activity
    db.table("activity_log").insert({
        "action": "client_created",
        "entity_type": "clients",
        "entity_id": res.data[0]["id"],
        "actor_name": "Recruiter",
        "metadata": {"client_name": client.name}
    }).execute()
    
    return res.data[0]

@app.delete("/api/v1/clients/{client_id}")
async def delete_client(client_id: str, db: Client = Depends(get_supabase)):
    res = db.table("clients").update({"is_deleted": True}).eq("id", client_id).execute()
    return {"success": True}

# 3. Requirements & Background AI Job generation
def generate_job_openings_background(req_id: str, client_id: str, req_title: str, req_desc: str, req_skills: List[str], req_exp_min: int, req_exp_max: int, req_seniority: str, req_budget_min: float, req_budget_max: float, num_posts: int, jwt_token: str):
    logger.info(f"Starting background job generation for requirement {req_id}")
    # Initialize a system Supabase client with the user's JWT to write on their behalf
    db = get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY, jwt_token)
    
    db.table("requirements").update({"status": "generating"}).eq("id", req_id).execute()
    
    for i in range(1, num_posts + 1):
        try:
            job_title = f"{req_title} (Option {i})"
            job_desc = ""
            responsibilities = []
            qualifications = []
            salary_range = f"₹{int(req_budget_min)} - ₹{int(req_budget_max)} LPA"
            keywords = req_skills
            
            if anthropic_client:
                system_prompt = "You are a professional recruitment assistant helping write job descriptions. Return ONLY a valid JSON object."
                user_prompt = f"""
                Given the following job requirement, generate a complete and compelling job opening.
                This is job post {i} of {num_posts} for this requirement — make each post distinct in tone/angle.
                
                Requirement details:
                - Title: {req_title}
                - Description / brief: {req_desc}
                - Required skills: {', '.join(req_skills)}
                - Experience: {req_exp_min}–{req_exp_max} years
                - Seniority: {req_seniority}
                - Budget: ₹{req_budget_min}–{req_budget_max} LPA
                
                Return ONLY a valid JSON object with these exact fields:
                {{
                  "title": "string (specific job title)",
                  "description": "string (2-3 paragraph overview of the role)",
                  "responsibilities": ["string", ...] (6-8 bullet points),
                  "qualifications": ["string", ...] (5-7 bullet points),
                  "salary_range": "string (e.g. ₹12–18 LPA)",
                  "keywords": ["string", ...] (8-10 keywords)
                }}
                Do not include any text outside the JSON object.
                """
                ai_data = call_claude_json(system_prompt, user_prompt)
                if ai_data:
                    job_title = ai_data.get("title", job_title)
                    job_desc = ai_data.get("description", "")
                    responsibilities = ai_data.get("responsibilities", [])
                    qualifications = ai_data.get("qualifications", [])
                    salary_range = ai_data.get("salary_range", salary_range)
                    keywords = ai_data.get("keywords", keywords)
            else:
                # Simulated Fallback
                job_title = f"Senior {req_title} - Strategy & Execution (Option {i})" if i == 1 else f"Lead {req_title} - Innovation & Delivery (Option {i})"
                job_desc = f"We are seeking a talented {job_title} for our client. The ideal candidate will leverage modern patterns, lead key initiatives, and deliver high-impact features. This is a fast-paced environment requiring strong problem-solving skills."
                responsibilities = [
                    "Lead development of core features and platform widgets.",
                    "Collaborate with product and UX designers to craft high-fidelity interfaces.",
                    "Ensure responsive designs and optimize rendering code for target metrics.",
                    "Implement thorough unit testing across critical flows."
                ]
                qualifications = [
                    f"At least {req_exp_min} years of professional engineering experience.",
                    f"Strong competency in: {', '.join(req_skills[:4])}.",
                    "Excellent analytical thinking and clear articulation of design decisions."
                ]
            
            # Insert job opening draft
            db.table("job_openings").insert({
                "requirement_id": req_id,
                "post_index": i,
                "title": job_title,
                "description": job_desc,
                "responsibilities": responsibilities,
                "qualifications": qualifications,
                "keywords": keywords,
                "salary_range": salary_range,
                "status": "draft",
                "processing_status": "ready"
            }).execute()
            
        except Exception as e:
            logger.error(f"Error generating job opening option {i}: {e}")
            db.table("requirements").update({"status": "ready"}).eq("id", req_id).execute()
            return
            
    # Mark requirement as ready
    db.table("requirements").update({"status": "ready"}).eq("id", req_id).execute()
    logger.info(f"Background job generation completed for requirement {req_id}")

@app.get("/api/v1/requirements")
async def get_requirements(db: Client = Depends(get_supabase)):
    res = db.table("requirements").select("*").eq("is_deleted", False).execute()
    return res.data

@app.post("/api/v1/requirements")
async def create_requirement(req: RequirementModel, background_tasks: BackgroundTasks, request: Request, db: Client = Depends(get_supabase)):
    res = db.table("requirements").insert({
        "client_id": req.client_id,
        "title": req.title,
        "description": req.description,
        "skills": req.skills,
        "experience_min": req.experience_min,
        "experience_max": req.experience_max,
        "budget_min": req.budget_min,
        "budget_max": req.budget_max,
        "seniority": req.seniority,
        "notes": req.notes,
        "num_posts_requested": req.num_posts_requested,
        "status": "generating"
    }).execute()
    
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to create requirement")
    
    new_req = res.data[0]
    
    # Forward the user's JWT token
    auth_header = request.headers.get("Authorization", "")
    jwt_token = auth_header.split(" ")[1] if auth_header.startswith("Bearer ") else ""
    
    # Trigger background job openings generation task
    background_tasks.add_task(
        generate_job_openings_background,
        new_req["id"],
        req.client_id,
        req.title,
        req.description,
        req.skills,
        req.experience_min,
        req.experience_max,
        req.seniority,
        req.budget_min,
        req.budget_max,
        req.num_posts_requested,
        jwt_token
    )
    
    # Log activity
    db.table("activity_log").insert({
        "action": "requirement_created",
        "entity_type": "requirements",
        "entity_id": new_req["id"],
        "actor_name": "Recruiter",
        "metadata": {"req_title": req.title}
    }).execute()
    
    return new_req

# 4. Job Openings endpoints
@app.get("/api/v1/jobs")
async def get_jobs(db: Client = Depends(get_supabase)):
    res = db.table("job_openings").select("*").eq("is_deleted", False).execute()
    return res.data

@app.post("/api/v1/jobs/{job_id}/confirm")
async def confirm_job(job_id: str, db: Client = Depends(get_supabase)):
    res = db.table("job_openings").update({"status": "confirmed"}).eq("id", job_id).execute()
    return res.data[0] if res.data else {}

@app.post("/api/v1/jobs/{job_id}/scan-and-publish")
async def scan_and_publish_job(job_id: str, db: Client = Depends(get_supabase)):
    # Fetch job details
    job_res = db.table("job_openings").select("*").eq("id", job_id).execute()
    if not job_res.data:
        raise HTTPException(status_code=404, detail="Job opening not found")
    
    job = job_res.data[0]
    db.table("job_openings").update({"processing_status": "skill_approval"}).eq("id", job_id).execute()
    
    # Generate 5 default skills from keywords/responsibilities
    keywords = job.get("keywords") or []
    default_skills = keywords[:5]
    while len(default_skills) < 5:
        default_skills.append(f"Required Skill {len(default_skills) + 1}")
        
    weights = [30.0, 25.0, 15.0, 15.0, 15.0]
    
    # Clear previous skills
    db.table("job_opening_skills").delete().eq("job_opening_id", job_id).execute()
    
    # Insert new skills
    for idx, skill_name in enumerate(default_skills):
        db.table("job_opening_skills").insert({
            "job_opening_id": job_id,
            "skill_name": skill_name,
            "weight": weights[idx],
            "skill_order": idx + 1,
            "approved": False
        }).execute()
        
    return {"status": "skill_approval"}

@app.get("/api/v1/jobs/{job_id}/skills")
async def get_job_skills(job_id: str, db: Client = Depends(get_supabase)):
    res = db.table("job_opening_skills").select("*").eq("job_opening_id", job_id).execute()
    return res.data

@app.put("/api/v1/jobs/{job_id}/skills")
async def save_skills(job_id: str, skills_data: SkillsApprovalModel, background_tasks: BackgroundTasks, request: Request, db: Client = Depends(get_supabase)):
    # Save approved skills
    db.table("job_opening_skills").delete().eq("job_opening_id", job_id).execute()
    
    for idx, skill in enumerate(skills_data.skills):
        db.table("job_opening_skills").insert({
            "job_opening_id": job_id,
            "skill_name": skill["skill_name"],
            "weight": skill["weight"],
            "skill_order": idx + 1,
            "approved": True
        }).execute()
        
    # Mark job status as published
    db.table("job_openings").update({
        "status": "published",
        "processing_status": "matching"
    }).eq("id", job_id).execute()
    
    auth_header = request.headers.get("Authorization", "")
    jwt_token = auth_header.split(" ")[1] if auth_header.startswith("Bearer ") else ""
    
    # Trigger matching task in the background
    background_tasks.add_task(match_candidates_background, job_id, jwt_token)
    
    return {"status": "published"}

# Candidate matching background task
def match_candidates_background(job_id: str, jwt_token: str):
    logger.info(f"Starting background candidate matching for job {job_id}")
    db = get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY, jwt_token)
    
    try:
        # Fetch job and approved skills
        job_res = db.table("job_openings").select("*").eq("id", job_id).execute()
        skills_res = db.table("job_opening_skills").select("*").eq("job_opening_id", job_id).execute()
        candidates_res = db.table("candidates").select("*").eq("is_deleted", False).execute()
        
        if not job_res.data or not skills_res.data or not candidates_res.data:
            db.table("job_openings").update({"processing_status": "ready"}).eq("id", job_id).execute()
            return
            
        job = job_res.data[0]
        approved_skills = skills_res.data
        candidates = candidates_res.data
        
        # Clear existing job_candidates for this job
        db.table("job_candidates").delete().eq("job_opening_id", job_id).execute()
        
        scored_candidates = []
        for idx, cand in enumerate(candidates):
            cand_skills = [s.lower() for s in (cand.get("skills") or [])]
            cand_raw_text = cand.get("raw_text") or ""
            
            # Simple matching heuristic
            matched_score = 45.0  # baseline
            strengths = []
            skill_gaps = []
            
            for sk in approved_skills:
                sk_name = sk["skill_name"].lower()
                sk_weight = float(sk["weight"])
                
                # Check direct skill match or mention in raw resume text
                if sk_name in cand_skills or sk_name in cand_raw_text.lower():
                    matched_score += (sk_weight * 0.5)
                    strengths.append(sk["skill_name"])
                else:
                    skill_gaps.append(sk["skill_name"])
            
            # Bound score
            matched_score = min(matched_score, 100.0)
            
            # Create application and link candidates
            app_res = db.table("applications").upsert({
                "candidate_id": cand["id"],
                "job_opening_id": job_id,
                "fuzzy_score": matched_score,
                "match_score": int(matched_score),
                "match_reason": f"System scan matched skills: {', '.join(strengths)}. Missing: {', '.join(skill_gaps)}.",
                "strengths": strengths[:3],
                "skill_gaps": skill_gaps[:3],
                "screening_status": "pending"
            }, on_conflict="candidate_id,job_opening_id").execute()
            
            if app_res.data:
                scored_candidates.append({
                    "job_opening_id": job_id,
                    "candidate_id": cand["id"],
                    "application_id": app_res.data[0]["id"],
                    "fuzzy_score": matched_score,
                    "rank_order": 1,  # updated later
                    "strengths": strengths[:3],
                    "skill_gaps": skill_gaps[:3]
                })
        
        # Sort and rank
        scored_candidates.sort(key=lambda x: x["fuzzy_score"], reverse=True)
        for rank, item in enumerate(scored_candidates, 1):
            item["rank_order"] = rank
            db.table("job_candidates").insert(item).execute()
            
        # Update job opening status
        db.table("job_openings").update({"processing_status": "ready"}).eq("id", job_id).execute()
        
    except Exception as e:
        logger.error(f"Error matching candidates: {e}")
        db.table("job_openings").update({"processing_status": "error", "error_message": str(e)}).eq("id", job_id).execute()

@app.get("/api/v1/jobs/{job_id}/candidates")
async def get_ranked_candidates(job_id: str, db: Client = Depends(get_supabase)):
    res = db.table("job_candidates").select("*, candidates(*), applications(*)").eq("job_opening_id", job_id).order("fuzzy_score", desc=True).execute()
    # Format to match frontend expected JobCandidate layout
    formatted = []
    for row in res.data:
        cand = row.get("candidates") or {}
        app_rec = row.get("applications") or {}
        formatted.append({
            "id": row["id"],
            "job_opening_id": row["job_opening_id"],
            "application_id": row["application_id"],
            "fuzzy_score": row["fuzzy_score"],
            "rank_order": row["rank_order"],
            "candidate_id": row["candidate_id"],
            "candidate_name": cand.get("full_name", "Unknown"),
            "experience_years": cand.get("experience_years", 0),
            "skills": cand.get("skills") or [],
            "strengths": row.get("strengths") or [],
            "skill_gaps": row.get("skill_gaps") or [],
            "stage": app_rec.get("stage") or "screening",
            "stage_status": app_rec.get("stage_status") or "pending"
        })
    return formatted

@app.post("/api/v1/jobs/{job_id}/candidates/{cand_id}")
async def link_candidate_to_job(job_id: str, cand_id: str, db: Client = Depends(get_supabase)):
    exists = db.table("applications").select("*").eq("candidate_id", cand_id).eq("job_opening_id", job_id).execute()
    if exists.data:
        raise HTTPException(status_code=400, detail="Candidate is already linked to this job opening")
        
    cand_res = db.table("candidates").select("*").eq("id", cand_id).execute()
    skills_res = db.table("job_opening_skills").select("*").eq("job_opening_id", job_id).execute()
    
    if not cand_res.data:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    cand = cand_res.data[0]
    approved_skills = skills_res.data
    
    cand_skills = [s.lower() for s in (cand.get("skills") or [])]
    cand_raw_text = cand.get("raw_text") or ""
    
    matched_score = 45.0
    strengths = []
    skill_gaps = []
    
    for sk in approved_skills:
        sk_name = sk["skill_name"].lower()
        sk_weight = float(sk["weight"])
        if sk_name in cand_skills or sk_name in cand_raw_text.lower():
            matched_score += (sk_weight * 0.5)
            strengths.append(sk["skill_name"])
        else:
            skill_gaps.append(sk["skill_name"])
            
    matched_score = min(matched_score, 100.0)
    
    app_res = db.table("applications").insert({
        "candidate_id": cand_id,
        "job_opening_id": job_id,
        "fuzzy_score": matched_score,
        "match_score": int(matched_score),
        "match_reason": f"Manually linked candidate. Matched skills: {', '.join(strengths)}. Missing: {', '.join(skill_gaps)}.",
        "strengths": strengths[:3],
        "skill_gaps": skill_gaps[:3],
        "screening_status": "pending",
        "stage": "screening",
        "stage_status": "pending"
    }).execute()
    
    if not app_res.data:
        raise HTTPException(status_code=400, detail="Failed to link candidate")
        
    new_app = app_res.data[0]
    
    existing_jc = db.table("job_candidates").select("*").eq("job_opening_id", job_id).execute()
    rank = len(existing_jc.data) + 1
    
    db.table("job_candidates").insert({
        "job_opening_id": job_id,
        "candidate_id": cand_id,
        "application_id": new_app["id"],
        "fuzzy_score": matched_score,
        "rank_order": rank,
        "strengths": strengths[:3],
        "skill_gaps": skill_gaps[:3]
    }).execute()
    
    db.table("activity_log").insert({
        "action": "candidate_linked",
        "entity_type": "applications",
        "entity_id": new_app["id"],
        "actor_name": "Recruiter",
        "metadata": {"candidate_name": cand.get("full_name")}
    }).execute()
    
    return {"success": True, "application": new_app}

# 5. Candidates & Applications
@app.get("/api/v1/candidates")
async def get_candidates(db: Client = Depends(get_supabase)):
    res = db.table("candidates").select("*").eq("is_deleted", False).execute()
    return res.data

@app.get("/api/v1/applications")
async def get_all_applications(db: Client = Depends(get_supabase)):
    res = db.table("applications").select("*, candidates(*), job_openings(*, clients(name))").execute()
    return res.data

@app.post("/api/v1/candidates")
async def create_candidate(cand: CandidateModel, db: Client = Depends(get_supabase)):
    res = db.table("candidates").insert({
        "full_name": cand.full_name,
        "email": cand.email,
        "phone": cand.phone,
        "skills": cand.skills,
        "experience_years": cand.experience_years,
        "resume_url": cand.resume_url,
        "raw_text": cand.raw_text,
        "source": cand.source
    }).execute()
    return res.data[0] if res.data else {}

# accept application -> triggers background personalized question generation
def generate_questions_background(app_id: str, candidate_name: str, skills: List[str], exp_years: int, raw_text: str, jwt_token: str):
    logger.info(f"Starting background question generation for application {app_id}")
    db = get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY, jwt_token)
    
    try:
        questions = []
        if anthropic_client:
            system_prompt = "You are a professional hiring screening manager. Return ONLY a valid JSON array of question objects."
            user_prompt = f"""
            Generate a personalized list of 5 technical screening questions for {candidate_name}.
            
            Candidate background:
            - Skills: {', '.join(skills)}
            - Experience: {exp_years} years
            - Resume snippet: {raw_text[:1000]}
            
            Return ONLY a valid JSON array where each item is:
            {{
              "question": "string (the screening question)",
              "difficulty": "easy" | "medium" | "hard"
            }}
            Do not include any wrapper text outside the JSON array.
            """
            ai_data = call_claude_json(system_prompt, user_prompt)
            if isinstance(ai_data, list):
                questions = ai_data
        
        # Fallback if no questions generated or no client
        if not questions:
            questions = [
                {"question": f"Can you detail your experience working with {skills[0] if skills else 'modern tech'} and how you applied it in your previous role?", "difficulty": "easy"},
                {"question": "How do you handle client-side rendering bottlenecks when managing large datagrid lists?", "difficulty": "medium"},
                {"question": "Describe a time you solved a challenging concurrency/state synchronization issue.", "difficulty": "hard"}
            ]
            
        # Clear existing
        db.table("screening_questions").delete().eq("application_id", app_id).execute()
        
        # Insert
        for idx, q in enumerate(questions):
            db.table("screening_questions").insert({
                "application_id": app_id,
                "question": q["question"],
                "difficulty": q["difficulty"],
                "question_order": idx + 1
            }).execute()
            
        # Update application processing status to completed
        db.table("job_openings").execute() # Trigger sync / state triggers if any
        
    except Exception as e:
        logger.error(f"Error generating screening questions: {e}")

@app.get("/api/v1/applications/{app_id}")
async def get_application(app_id: str, db: Client = Depends(get_supabase)):
    res = db.table("applications").select("*, candidates(*)").eq("id", app_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Application not found")
    
    app_record = res.data[0]
    cand = app_record.get("candidates") or {}
    
    return {
        "id": app_record["id"],
        "candidate_id": app_record["candidate_id"],
        "job_opening_id": app_record["job_opening_id"],
        "candidate_name": cand.get("full_name", "Unknown"),
        "candidate_email": cand.get("email", ""),
        "candidate_experience": cand.get("experience_years", 0),
        "candidate_skills": cand.get("skills") or [],
        "candidate_cv": cand.get("raw_text") or "",
        "fuzzy_score": app_record.get("fuzzy_score") or 0,
        "match_score": app_record.get("match_score") or 0,
        "match_reason": app_record.get("match_reason") or "",
        "strengths": app_record.get("strengths") or [],
        "skill_gaps": app_record.get("skill_gaps") or [],
        "screening_status": app_record.get("screening_status") or "pending",
        "stage": app_record.get("stage") or "screening",
        "stage_status": app_record.get("stage_status") or "pending",
        "stage_notes": app_record.get("stage_notes") or "",
        "priority": app_record.get("priority") or 0,
        "created_at": app_record.get("created_at")
    }

@app.patch("/api/v1/applications/{app_id}/accept")
async def accept_application(app_id: str, background_tasks: BackgroundTasks, request: Request, db: Client = Depends(get_supabase)):
    res = db.table("applications").update({"screening_status": "accepted"}).eq("id", app_id).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to accept application")
        
    app_record = res.data[0]
    
    # Fetch candidate details
    cand_res = db.table("candidates").select("*").eq("id", app_record["candidate_id"]).execute()
    if cand_res.data:
        cand = cand_res.data[0]
        auth_header = request.headers.get("Authorization", "")
        jwt_token = auth_header.split(" ")[1] if auth_header.startswith("Bearer ") else ""
        
        background_tasks.add_task(
            generate_questions_background,
            app_id,
            cand["full_name"],
            cand.get("skills") or [],
            cand.get("experience_years") or 0,
            cand.get("raw_text") or "",
            jwt_token
        )
        
    return app_record

@app.patch("/api/v1/applications/{app_id}/reject")
async def reject_application(app_id: str, db: Client = Depends(get_supabase)):
    res = db.table("applications").update({"screening_status": "rejected"}).eq("id", app_id).execute()
    return res.data[0] if res.data else {}

@app.get("/api/v1/applications/{app_id}/stages")
async def get_application_stages(app_id: str, db: Client = Depends(get_supabase)):
    res = db.table("interview_stages").select("*").eq("application_id", app_id).order("created_at", desc=False).execute()
    return res.data or []

@app.patch("/api/v1/applications/{app_id}/stage")
async def update_application_stage(app_id: str, request: Request, db: Client = Depends(get_supabase)):
    data = await request.json()
    stage = data.get("stage")
    stage_status = data.get("stage_status")
    notes = data.get("notes") or ""
    
    # 1. Update applications table
    res = db.table("applications").update({
        "stage": stage,
        "stage_status": stage_status,
        "stage_notes": notes
    }).eq("id", app_id).execute()
    
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to update application stage")
        
    app_record = res.data[0]
    
    # 2. Insert into interview_stages table if it's one of the valid stage_names
    valid_stages = ['screening', 'technical', 'hr', 'final']
    if stage in valid_stages:
        existing = db.table("interview_stages").select("id").eq("application_id", app_id).execute()
        order = len(existing.data) + 1
        
        outcome = "pending"
        if stage_status == "passed":
            outcome = "passed"
        elif stage_status == "failed":
            outcome = "failed"
        elif stage_status == "on_hold":
            outcome = "on_hold"
            
        # If outcome is failed, note check constraint requires notes
        if outcome == "failed" and not notes.strip():
            notes = "Stage failed."
            
        db.table("interview_stages").insert({
            "application_id": app_id,
            "stage_name": stage,
            "stage_order": order,
            "status": "completed",
            "outcome": outcome,
            "notes": notes
        }).execute()
        
    # 3. Log activity
    db.table("activity_log").insert({
        "action": "stage_updated",
        "entity_type": "applications",
        "entity_id": app_id,
        "actor_name": "Recruiter",
        "metadata": {"stage": stage, "status": stage_status}
    }).execute()
    
    return app_record

# 6. Screening Questions Endpoints
@app.get("/api/v1/applications/{app_id}/questions")
async def get_questions(app_id: str, db: Client = Depends(get_supabase)):
    res = db.table("screening_questions").select("*").eq("application_id", app_id).order("question_order", desc=False).execute()
    return res.data

@app.patch("/api/v1/questions/{q_id}")
async def edit_question(q_id: str, data: Dict[str, Any], db: Client = Depends(get_supabase)):
    res = db.table("screening_questions").update({
        "question": data.get("question"),
        "modified": True
    }).eq("id", q_id).execute()
    return res.data[0] if res.data else {}

@app.post("/api/v1/questions/{q_id}/ai-edit")
async def ai_edit_question(q_id: str, data: Dict[str, str], db: Client = Depends(get_supabase)):
    instruction = data.get("instruction", "")
    
    # Fetch question details
    q_res = db.table("screening_questions").select("*").eq("id", q_id).execute()
    if not q_res.data:
        raise HTTPException(status_code=404, detail="Question not found")
        
    old_question = q_res.data[0]["question"]
    new_question = old_question
    
    if anthropic_client:
        system_prompt = "You are a professional recruitment coach. Return ONLY a revised question string."
        user_prompt = f"""
        Refine the following screening question according to this instruction:
        Instruction: "{instruction}"
        Original Question: "{old_question}"
        
        Provide the final single-sentence or multi-sentence question. Do not include any wrappers, quotes, or preambles.
        """
        try:
            message = anthropic_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=500,
                temperature=0.3,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )
            new_question = message.content[0].text.strip()
        except Exception as e:
            logger.error(f"Claude AI question edit failed: {e}")
    else:
        new_question = f"{old_question} (AI instructions applied: {instruction})"
        
    # Update question
    res = db.table("screening_questions").update({
        "question": new_question,
        "modified": True
    }).eq("id", q_id).execute()
    
    return res.data[0] if res.data else {}

# 7. Chatbot Endpoint
@app.post("/api/v1/chatbot/message")
async def handle_chat_message(chat: ChatMessageModel, db: Client = Depends(get_supabase)):
    user_msg = chat.message
    ctx = chat.context or {}
    
    # Compile database stats to inject in context
    try:
        clients_count = len(db.table("clients").select("id").eq("is_deleted", False).execute().data or [])
        reqs_count = len(db.table("requirements").select("id").eq("is_deleted", False).execute().data or [])
        candidates_count = len(db.table("candidates").select("id").eq("is_deleted", False).execute().data or [])
        jobs_count = len(db.table("job_openings").select("id").eq("is_deleted", False).execute().data or [])
    except Exception:
        clients_count = reqs_count = candidates_count = jobs_count = 0
        
    db_summary = f"""
    The current database stats are:
    - Clients: {clients_count}
    - Mandate Requirements: {reqs_count} 
    - Active Job Openings: {jobs_count}
    - Candidate Pool Size: {candidates_count}
    """
    
    reply = ""
    if anthropic_client:
        system_prompt = "You are 'Kozker Recruiter AI Companion', a conversational assistant helping recruiters coordinate and manage candidate matching pipelines."
        user_prompt = f"""
        Recruiter current page context: {json.dumps(ctx)}
        Database summary: {db_summary}
        
        Recruiter query: {user_msg}
        """
        try:
            message = anthropic_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1000,
                temperature=0.7,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )
            reply = message.content[0].text.strip()
        except Exception as e:
            reply = f"Sorry, I experienced an error calling Claude AI: {e}"
    else:
        # Mock chatbot replies
        if "candidate" in user_msg.lower():
            reply = f"Currently, there are {candidates_count} candidates in the common pool. Rohan Sharma (fuzzy match score: 94.5%) is accepted and in the Technical Interview stage."
        elif "job" in user_msg.lower() or "opening" in user_msg.lower():
            reply = f"We have {jobs_count} job openings. The most recent one created is mapped to Google client requirements."
        else:
            reply = f"Hello! I'm your Kozker Recruiter AI Companion. I see we have {clients_count} clients and {reqs_count} active mandate requirements. How can I help you manage your pipeline today?"
            
    return {"reply": reply}

# Simple index status check
@app.get("/")
def index():
    return {"status": "ok", "message": "Kozker Recruiter AI FastAPI middleware is running."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
