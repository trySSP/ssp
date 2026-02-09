import asyncio
import os
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from typing import Any, Dict

from company_search import CompanySearchService
# from social_signals import SocialSignalsService
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from langgraph.graph import StateGraph, END

from pdf_ingest import extract_pdf_text
from text_chunking import chunk_text

# -------------------------------------------------------------------
# Setup
# -------------------------------------------------------------------
load_dotenv()
app = FastAPI(title="Startup Success Predictor - Multi Agent")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY not set")

ANALYSIS_MODEL = os.getenv("OPENAI_ANALYSIS_MODEL", "gpt-4o")

analysis_llm = ChatOpenAI(
    model=ANALYSIS_MODEL,
    api_key=OPENAI_API_KEY,
    temperature=0.3
)

embeddings = OpenAIEmbeddings(api_key=OPENAI_API_KEY)
company_search_service = CompanySearchService.from_env(OPENAI_API_KEY)
# social_signals_service = SocialSignalsService.from_env()

# -------------------------------------------------------------------
# Shared RAG Utilities
# -------------------------------------------------------------------
def build_retriever(content: str):
    chunks = chunk_text(content)
    if not chunks:
        raise ValueError("No content available to index")

    vector_store = Chroma.from_documents(chunks, embeddings)
    return vector_store.as_retriever()


def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)


# -------------------------------------------------------------------
# Agent Prompt Templates
# -------------------------------------------------------------------
def agent_prompt(role: str, focus: str):
    return ChatPromptTemplate.from_messages([
        ("system", f"""
You are a {role}.

Rules:
- Be concise and factual
- DO NOT use conversational phrases
- DO NOT say: "Certainly", "Here is", "Here's", "In conclusion"
- DO NOT add introductions or summaries
- Use short bullet points only
- Max 5 bullets per section
- No filler text

Analyze ONLY the following aspects:
{focus}

Context:
{{context}}
"""),
        ("human", "Provide your analysis.")
    ])




FINANCIAL_PROMPT = agent_prompt(
    "Financial Analyst",
    "- Revenue model\n- Cost structure\n- Financial viability\n- Forecasts\n- ROI potential"
)

VC_PROMPT = agent_prompt(
    "Venture Capitalist",
    "- Investment readiness\n- Scalability\n- Market traction\n- Risk factors\n- Exit potential"
)

CTO_PROMPT = agent_prompt(
    "Chief Technology Officer",
    "- Technical feasibility\n- Architecture\n- Innovation\n- Scalability\n- Technical risks"
)

MARKETING_PROMPT = agent_prompt(
    "Marketing Specialist",
    "- Target market\n- Go-to-market strategy\n- Brand positioning\n- Customer acquisition\n- Competitive landscape"
)

PRODUCT_PROMPT = agent_prompt(
    "Product Analyst",
    "- Product-market fit\n- User needs\n- Feature set\n- Differentiation\n- Adoption barriers"
)


# -------------------------------------------------------------------
# Agent Nodes
# -------------------------------------------------------------------
async def financial_agent(state):
    retriever = state["retriever"]
    chain = (
        {"context": retriever | format_docs}
        | FINANCIAL_PROMPT
        | analysis_llm
        | StrOutputParser()
    )
    return {"financial": await chain.ainvoke("")}


async def vc_agent(state):
    retriever = state["retriever"]
    chain = (
        {"context": retriever | format_docs}
        | VC_PROMPT
        | analysis_llm
        | StrOutputParser()
    )
    return {"vc": await chain.ainvoke("")}


async def cto_agent(state):
    retriever = state["retriever"]
    chain = (
        {"context": retriever | format_docs}
        | CTO_PROMPT
        | analysis_llm
        | StrOutputParser()
    )
    return {"cto": await chain.ainvoke("")}


async def marketing_agent(state):
    retriever = state["retriever"]
    chain = (
        {"context": retriever | format_docs}
        | MARKETING_PROMPT
        | analysis_llm
        | StrOutputParser()
    )
    return {"marketing": await chain.ainvoke("")}


async def product_agent(state):
    retriever = state["retriever"]
    chain = (
        {"context": retriever | format_docs}
        | PRODUCT_PROMPT
        | analysis_llm
        | StrOutputParser()
    )
    return {"product": await chain.ainvoke("")}


# -------------------------------------------------------------------
# LangGraph Definition (Parallel Agents)
# -------------------------------------------------------------------
class GraphState(dict):
    retriever: any
    financial: str
    vc: str
    cto: str
    marketing: str
    product: str


graph = StateGraph(GraphState)

graph.add_node("financial_agent", financial_agent)
graph.add_node("vc_agent", vc_agent)
graph.add_node("cto_agent", cto_agent)
graph.add_node("marketing_agent", marketing_agent)
graph.add_node("product_agent", product_agent)

# Parallel execution
graph.set_entry_point("financial_agent")

graph.add_edge("financial_agent", "vc_agent")
graph.add_edge("financial_agent", "cto_agent")
graph.add_edge("financial_agent", "marketing_agent")
graph.add_edge("financial_agent", "product_agent")

graph.add_edge("financial_agent", END)
graph.add_edge("vc_agent", END)
graph.add_edge("cto_agent", END)
graph.add_edge("marketing_agent", END)
graph.add_edge("product_agent", END)

app_graph = graph.compile()


# -------------------------------------------------------------------
# API Endpoint
# -------------------------------------------------------------------
@app.post("/view")
async def view_analysis(
    prompt: str = Form(...),
    files: list[UploadFile] | None = File(None)
):
    if not prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    extracted_texts: list[str] = []
    if files:
        for upload in files:
            try:
                file_bytes = await upload.read()
                extracted_texts.append(extract_pdf_text(file_bytes))
            except Exception as exc:
                raise HTTPException(
                    status_code=400,
                    detail=f"PDF extraction failed for {upload.filename}: {exc}"
                )

    combined_text = "\n\n".join([text for text in [prompt, *extracted_texts] if text])

    analysis_task = app_graph.ainvoke({
        "retriever": build_retriever(combined_text)
    })
    competitors_task = company_search_service.find_top_competitors_for_idea(prompt)
    # social_signals_task = social_signals_service.summarize_customer_voice_signals(request.prompt)

    (
        analysis_result, 
        competitors_result, 
        # social_signals_result
    ) = await asyncio.gather(
        analysis_task,
        competitors_task,
        # social_signals_task,
        return_exceptions=True
    )

    if isinstance(analysis_result, Exception):
        raise HTTPException(status_code=500, detail=f"Analysis failed: {analysis_result}")

    response: Dict[str, Any] = {
        "financial_analysis": analysis_result.get("financial"),
        "vc_analysis": analysis_result.get("vc"),
        "cto_analysis": analysis_result.get("cto"),
        "marketing_analysis": analysis_result.get("marketing"),
        "product_analysis": analysis_result.get("product")
    }

    if isinstance(competitors_result, Exception):
        response.update({
            "competitor_search_status": "error",
            "idea_search_sentence": None,
            "competitors": [],
            "competitor_search_error": str(competitors_result)
        })
    else:
        response.update({
            "competitor_search_status": competitors_result.get("status"),
            "idea_search_sentence": competitors_result.get("search_sentence"),
            "competitors": competitors_result.get("competitors", []),
            "competitor_search_error": competitors_result.get("error")
        })

    # if isinstance(social_signals_result, Exception):
    #     response["customer_voice_pmf_signal"] = "Customer-voice PMF signal is unavailable due to social-source collection error."
    # else:
    #     response["customer_voice_pmf_signal"] = social_signals_result

    return response



# -------------------------------------------------------------------
# Run Server
# -------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
