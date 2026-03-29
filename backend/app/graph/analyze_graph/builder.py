from langgraph.graph import StateGraph, START, END

from backend.app.graph.analyze_graph.state import AnalyzeState
from backend.app.graph.nodes.repo_load import repo_load_node
from backend.app.graph.nodes.file_scan import file_scan_node
from backend.app.graph.analyze_graph.nodes.code_read import code_read_node
from backend.app.graph.analyze_graph.nodes.analyze_code import analyze_code_node
from backend.app.graph.analyze_graph.nodes.encode_nl import encode_nl_node


def build_analyze_graph():
    graph = StateGraph(AnalyzeState)

    graph.add_node("repo_load", repo_load_node)
    graph.add_node("file_scan", file_scan_node)
    graph.add_node("code_read", code_read_node)
    graph.add_node("analyze_code", analyze_code_node)
    graph.add_node("encode_nl", encode_nl_node)

    graph.add_edge(START, "repo_load")
    graph.add_edge("repo_load", "file_scan")
    graph.add_edge("file_scan", "code_read")
    graph.add_edge("code_read", "analyze_code")
    graph.add_edge("analyze_code", "encode_nl")
    graph.add_edge("encode_nl", END)

    return graph.compile()
