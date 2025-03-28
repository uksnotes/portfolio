from typing import Dict, Any
from typing_extensions import TypedDict, Annotated


class GraphState(TypedDict):
    question: Annotated[str, "User question"]
    context: Annotated[Dict[str, Any], "Context information"]
    answer: Annotated[str, "Final generated answer"]
