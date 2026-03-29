from langgraph.graph import StateGraph, START, END

from backend.app.graph.modify_graph.state import ModifyState
from backend.app.graph.modify_graph.nodes.decode_nl import decode_nl_node
from backend.app.graph.modify_graph.nodes.diff_generate import diff_generate_node


def build_modify_graph():
    graph = StateGraph(ModifyState)

    graph.add_node("decode_nl", decode_nl_node)
    graph.add_node("diff_generate", diff_generate_node)

    graph.add_edge(START, "decode_nl")
    graph.add_edge("decode_nl", "diff_generate")
    graph.add_edge("diff_generate", END)

    return graph.compile()
