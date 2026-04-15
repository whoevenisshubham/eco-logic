from __future__ import annotations

import ast
from dataclasses import dataclass
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


class ProfileRequest(BaseModel):
    source_code: str = Field(min_length=1)


class FingerprintNode(BaseModel):
    id: str
    nodeType: str
    line: int
    estimatedJoules: float
    complexity: str


class ProfileResponse(BaseModel):
    astTree: list[FingerprintNode]
    totalEnergy: float
    overallComplexity: str


COMPLEXITY_ORDER: dict[str, int] = {
    "O(1)": 0,
    "O(log N)": 1,
    "O(N)": 2,
    "O(N log N)": 3,
    "O(N^2)": 4,
    "O(2^N)": 5,
}


NODE_ENERGY_WEIGHTS: dict[type[ast.AST], float] = {
    ast.FunctionDef: 1.8,
    ast.AsyncFunctionDef: 2.0,
    ast.For: 3.2,
    ast.While: 3.5,
    ast.If: 1.1,
    ast.Call: 1.4,
    ast.ListComp: 2.6,
    ast.DictComp: 2.8,
    ast.SetComp: 2.8,
    ast.GeneratorExp: 2.4,
    ast.Assign: 0.7,
    ast.AugAssign: 0.9,
    ast.Return: 0.5,
    ast.Try: 1.6,
    ast.With: 1.2,
    ast.BinOp: 0.6,
}


NODE_TYPE_ALIASES: dict[type[ast.AST], str] = {
    ast.For: "ForLoop",
    ast.While: "WhileLoop",
    ast.If: "IfStatement",
    ast.FunctionDef: "FunctionDef",
    ast.AsyncFunctionDef: "FunctionDef",
    ast.Call: "Call",
    ast.ListComp: "ListComp",
    ast.DictComp: "DictComp",
    ast.SetComp: "SetComp",
    ast.GeneratorExp: "GeneratorExp",
    ast.Assign: "Assignment",
    ast.AugAssign: "Assignment",
    ast.Return: "Return",
    ast.Try: "TryStatement",
    ast.With: "WithStatement",
    ast.BinOp: "BinaryOp",
}


INTERESTING_NODES: tuple[type[ast.AST], ...] = tuple(NODE_ENERGY_WEIGHTS.keys())
LOOP_LIKE_NODES: tuple[type[ast.AST], ...] = (
    ast.For,
    ast.While,
    ast.ListComp,
    ast.DictComp,
    ast.SetComp,
    ast.GeneratorExp,
)


def is_loop_like(node: ast.AST) -> bool:
    return isinstance(node, LOOP_LIKE_NODES)


def get_node_type(node: ast.AST) -> str:
    for node_cls, name in NODE_TYPE_ALIASES.items():
        if isinstance(node, node_cls):
            return name
    return node.__class__.__name__


def get_complexity_for_node(node: ast.AST, loop_depth: int, recursive_call: bool) -> str:
    if recursive_call:
        return "O(2^N)"

    if isinstance(node, LOOP_LIKE_NODES):
        if loop_depth >= 1:
            return "O(N^2)"
        return "O(N)"

    return "O(1)"


def complexity_multiplier(complexity: str) -> float:
    if complexity == "O(2^N)":
        return 3.8
    if complexity == "O(N^2)":
        return 2.4
    if complexity == "O(N log N)":
        return 1.9
    if complexity == "O(N)":
        return 1.4
    if complexity == "O(log N)":
        return 1.1
    return 1.0


@dataclass
class TraversalContext:
    depth: int = 0
    loop_depth: int = 0
    current_function: str | None = None


class SemanticEnergyAnalyzer:
    def __init__(self) -> None:
        self.nodes: list[FingerprintNode] = []
        self.recursion_detected = False

    def analyze(self, syntax_tree: ast.AST) -> ProfileResponse:
        self.nodes = []
        self.recursion_detected = False
        self._walk(syntax_tree, TraversalContext())

        total_energy = round(sum(node.estimatedJoules for node in self.nodes), 6)

        if self.recursion_detected:
            overall_complexity = "O(2^N)"
        elif self.nodes:
            overall_complexity = max(
                (node.complexity for node in self.nodes),
                key=lambda c: COMPLEXITY_ORDER.get(c, -1),
            )
        else:
            overall_complexity = "O(1)"

        return ProfileResponse(
            astTree=self.nodes,
            totalEnergy=total_energy,
            overallComplexity=overall_complexity,
        )

    def _walk(self, node: ast.AST, ctx: TraversalContext) -> None:
        recursive_call = False
        if isinstance(node, ast.Call) and ctx.current_function:
            if isinstance(node.func, ast.Name) and node.func.id == ctx.current_function:
                recursive_call = True
                self.recursion_detected = True

        if isinstance(node, INTERESTING_NODES):
            base = NODE_ENERGY_WEIGHTS.get(type(node), 0.8)
            node_complexity = get_complexity_for_node(node, ctx.loop_depth, recursive_call)
            complexity_factor = complexity_multiplier(node_complexity)
            depth_factor = 1.0 + (ctx.depth * 0.12) + (ctx.loop_depth * 0.45)
            estimated = round(base * complexity_factor * depth_factor, 6)
            line = int(getattr(node, "lineno", 0) or 0)
            node_type = get_node_type(node)
            node_id = f"node_{len(self.nodes) + 1:04d}_L{line}_{node_type}"

            self.nodes.append(
                FingerprintNode(
                    id=node_id,
                    nodeType=node_type,
                    line=line,
                    estimatedJoules=estimated,
                    complexity=node_complexity,
                )
            )

        next_ctx = TraversalContext(
            depth=ctx.depth + 1,
            loop_depth=ctx.loop_depth + (1 if is_loop_like(node) else 0),
            current_function=ctx.current_function,
        )

        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            next_ctx.current_function = node.name

        for child in ast.iter_child_nodes(node):
            self._walk(child, next_ctx)


app = FastAPI(title="Eco-Logic SEF API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[Literal["status"], str]:
    return {"status": "ok"}


@app.post("/api/profile", response_model=ProfileResponse)
def profile_source_code(payload: ProfileRequest) -> ProfileResponse:
    try:
        syntax_tree = ast.parse(payload.source_code)
    except SyntaxError as exc:
        detail = f"Syntax error on line {exc.lineno}: {exc.msg}"
        raise HTTPException(status_code=422, detail=detail) from exc

    analyzer = SemanticEnergyAnalyzer()
    return analyzer.analyze(syntax_tree)
