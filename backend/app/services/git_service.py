import os
import shutil
import tempfile

from git import Repo


def clone_repo(repo_url: str, branch: str = "main") -> str:
    temp_dir = tempfile.mkdtemp(prefix="repo_")
    repo_dir = os.path.join(temp_dir, "repo")
    repo = Repo.clone_from(repo_url, repo_dir, branch=branch)
    _ = repo.head.commit.hexsha
    return repo_dir
