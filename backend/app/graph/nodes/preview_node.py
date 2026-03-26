from __future__ import annotations

from typing import Any


def _flatten_leaf_nodes(nodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    leaves: list[dict[str, Any]] = []

    for root in nodes or []:
        for section in root.get("children", []) or []:
            for leaf in section.get("children", []) or []:
                leaves.append(leaf)

    return leaves


def _render_leaf_block(title: str, node_id: str) -> str:
    safe_title = (title or "이름 없는 모듈").replace("<", "&lt;").replace(">", "&gt;")
    return f"""
    <section data-node-id="{node_id}" style="
      margin:0;
      padding:16px;
      border-bottom:1px solid #e5e7eb;
      background:#ffffff;
      line-height:1.4;
    ">
      <div style="font-size:14px;font-weight:700;color:#0f172a;">{safe_title}</div>
      <div style="margin-top:8px;height:56px;border-radius:12px;background:#f8fafc;"></div>
    </section>
    """


def preview_node(state: dict) -> dict:
    scenario_v1 = state.get("scenario_v1", {}) or {}
    nodes = scenario_v1.get("nodes", []) or []
    selected_node_id = state.get("selected_node_id")

    leaves = _flatten_leaf_nodes(nodes)
    html_blocks: list[str] = []

    for leaf in leaves:
        title = leaf.get("title", "")
        node_id = leaf.get("id", "")
        html_blocks.append(_render_leaf_block(title, node_id))

    html = f"""
    <div style="
      margin:0;
      padding:0;
      background:#f1f5f9;
      min-height:100%;
      isolation:isolate;
    ">
      <style>
        [data-node-id].is-selected {{
          outline:2px solid #fb923c;
          background:#fff7ed !important;
        }}
      </style>
      <script>
        window.addEventListener("message", function(event) {{
          var payload = event.data || {{}};
          var id = payload.selectedNodeId;
          if (!id) return;
          var nodes = document.querySelectorAll("[data-node-id]");
          nodes.forEach(function(node) {{
            node.classList.remove("is-selected");
          }});
          var target = document.querySelector('[data-node-id="' + id + '"]');
          if (target) {{
            target.classList.add("is-selected");
            target.scrollIntoView({{ block: "center", behavior: "smooth" }});
          }}
        }});
      </script>
      {''.join(html_blocks)}
    </div>
    """

    return {
        "preview": {
            "project_name": scenario_v1.get("project_name", "auto-generated-project"),
            "version": scenario_v1.get("version", "v1.0"),
            "view_type": "PREVIEW",
            "selected_node_id": selected_node_id,
            "html": html,
        }
    }