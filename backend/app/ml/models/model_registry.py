import os
from pathlib import Path
from typing import Dict, List, Optional
import joblib
import logging
from app.ml.config import MLConfig
from app.ml.models.isolation_forest import IsolationForestModel

logger = logging.getLogger("sentinelops.ml.models.registry")


class ModelRegistry:
    """
    Manages model artifact persistence, Joblib serialization, version resolution,
    safe sandboxed filesystem access, and hot-swappable active model state.
    """

    def __init__(self, storage_dir: Optional[Path] = None):
        self.storage_dir = (storage_dir or MLConfig.MODEL_DIR).resolve()
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self._active_model: Optional[IsolationForestModel] = None
        self._model_cache: Dict[str, IsolationForestModel] = {}

    def _resolve_safe_path(self, relative_or_filename: str) -> Path:
        """
        Enforces strict path traversal sandboxing.
        Disallows absolute paths outside storage_dir or directory traversal tokens.
        """
        if ".." in relative_or_filename or "/" in relative_or_filename or "\\" in relative_or_filename:
            raise ValueError(f"Path traversal detected: {relative_or_filename}")

        safe_target = (self.storage_dir / relative_or_filename).resolve()

        if not str(safe_target).startswith(str(self.storage_dir)):
            raise ValueError(f"Path traversal detected: {relative_or_filename} is outside {self.storage_dir}")

        return safe_target

    def save_model(self, model: IsolationForestModel) -> str:
        """
        Persists a trained IsolationForestModel to disk via compressed Joblib.
        Returns the relative filename.
        """
        if not model.is_fitted:
            raise RuntimeError("Cannot save an unfitted model.")

        filename = f"{model.version}.joblib"
        target_path = self._resolve_safe_path(filename)

        joblib.dump(model, target_path, compress=3)
        self._model_cache[model.version] = model
        logger.info(f"Model {model.version} saved to {target_path}")

        return filename

    def load_model(self, relative_or_filename: str) -> IsolationForestModel:
        """Loads a model artifact from disk with caching and path verification."""
        version_key = os.path.splitext(os.path.basename(relative_or_filename))[0]
        if version_key in self._model_cache:
            return self._model_cache[version_key]

        target_path = self._resolve_safe_path(relative_or_filename)
        if not target_path.exists():
            raise FileNotFoundError(f"Model artifact not found at {target_path}")

        model: IsolationForestModel = joblib.load(target_path)
        self._model_cache[model.version] = model
        logger.info(f"Model {model.version} successfully loaded from {target_path}")
        return model

    def set_active_model(self, model: Optional[IsolationForestModel]) -> None:
        """Hot-swaps the current active model in memory."""
        self._active_model = model
        if model is not None:
            self._model_cache[model.version] = model
            logger.info(f"Active model updated to version: {model.version}")
        else:
            logger.info("Active model cleared/unloaded from memory")

    def get_active_model(self) -> Optional[IsolationForestModel]:
        """Returns the in-memory active model for inference."""
        return self._active_model

    def list_saved_artifacts(self) -> List[str]:
        """Lists all .joblib files in the safe model directory."""
        return [f.name for f in self.storage_dir.glob("*.joblib")]


# Global model registry instance
model_registry = ModelRegistry()
