from langgraph.graph import StateGraph, START, END

from backend.app.graph.state import WorkbenchState
from backend.app.graph.nodes.repo_load import repo_load_node
from backend.app.graph.nodes.file_scan import file_scan_node
from backend.app.graph.nodes.scenario_v1 import scenario_v1_node
from backend.app.graph.nodes.flow import flow_node
from backend.app.graph.nodes.diagram import diagram_node
from backend.app.graph.nodes.code_guide import code_guide_node


def finalize_output_node(state: dict) -> dict:
    return {
        "result": {
            "scenario_v1": state.get("scenario_v1", {}),
            "flow": state.get("flow", {}),
            "diagram": state.get("diagram", {}),
            "code_guide": state.get("code_guide", {}),
        }
    }


def build_graph():
    graph = StateGraph(WorkbenchState)

    graph.add_node("repo_load", repo_load_node)
    graph.add_node("file_scan", file_scan_node)
    graph.add_node("scenario_v1", scenario_v1_node)
    graph.add_node("flow", flow_node)
    graph.add_node("diagram", diagram_node)
    graph.add_node("code_guide", code_guide_node)
    graph.add_node("finalize_output", finalize_output_node)

    graph.add_edge(START, "repo_load")
    graph.add_edge("repo_load", "file_scan")
    graph.add_edge("file_scan", "scenario_v1")
    graph.add_edge("scenario_v1", "flow")
    graph.add_edge("flow", "diagram")
    graph.add_edge("diagram", "code_guide")
    graph.add_edge("code_guide", "finalize_output")
    graph.add_edge("finalize_output", END)

    return graph.compile()